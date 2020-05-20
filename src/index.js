const dav = require("dav")
const dotenv = require("dotenv")
const vcardparser = require("vcardparser")
const fs = require("fs").promises
const os = require("os")
dotenv.config()

const cardDavUrl = process.env.CARDDAV_URL
const cardDavUser = process.env.CARDDAV_USER
const cardDavPass = process.env.CARDDAV_PASS
const phonebookLocation = process.env.PHONEBOOK_LOC
const errors = []
if (!cardDavUrl) errors.push("CARDDAV_URL")
if (!cardDavUser) errors.push("CARDDAV_USER")
if (!cardDavPass) errors.push("CARDDAV_PASS")
if (!phonebookLocation) errors.push("PHONEBOOK_LOC")

if (errors.length) {
  console.error(`Missing Environment value${errors.length > 1 ? "s" : ""}: '${errors.join("','")}'`)
  return 1
}

;(async function main() {
  const xhr = new dav.transport.Basic(
    new dav.Credentials({
      username: cardDavUser,
      password: cardDavPass,
    })
  )

  const account = await dav.createAccount({
    server: cardDavUrl,
    xhr: xhr,
    accountType: "carddav",
    loadCollections: true,
    loadObjects: true,
  })

  const adressObjects = flatten(account.addressBooks.map(ab => ab.objects))
  const vcardStrings = adressObjects.map(addr => addr.addressData)
  const vcards = await Promise.all(vcardStrings.map(parseVCard))
  const filtered = vcards.filter(filterVCard)
  const mapped = filtered.map(transformVCard)
  const flattened = mapped.reduce((agg, curr) => agg.concat(curr), [])

  await writeToFile(flattened)
})()

/**
 * Filter applied to collection of VCards
 * @param {*} vcard - The VCard to validate
 * @returns {boolean} true if the vCard should be kept, false if it shouldn't
 */
function filterVCard(vcard) {
  //Additional Filters
  return !vcard["x-addressbookserver-kind"]
}

/**
 * Used to sanitize string data.
 * @param {string} string - the string to sanitize
 * @returns {string} the sanitized string
 */
function sanitize(string) {
  if (string) {
    //configure your own sanitation
    string = string.replace(/;/g, "þ")
    string = string.replace(/<HTCData>.*$/g, "")
  }
  return string
}

/**
 * Transform a VCard to a different representation
 * @param {VCard} vcard - The VCard to transform
 * @returns {string[]} An array with the following layout: [Tel-Number, Name, Abo?, Notes]
 */
function transformVCard(vcard) {
  if (!vcard.tel || !vcard.tel.length) return [["", vcard.fn, "", vcard.note]]
  if (vcard.tel.length == 1) return [[vcard.tel[0].value, vcard.fn, "", vcard.note]]
  return vcard.tel.map(tel => [tel.value, `${vcard.fn} (${tel.type.join(",")})`, "", vcard.note])
}

/**
 * Parses a VCard string into an object
 * @param {string} vcard - the string to parse
 * @returns {Promise<VCard>} The parsed VCard
 */
function parseVCard(vcard) {
  return new Promise((res, rej) => {
    vcardparser.parseString(vcard, (err, json) => (err ? rej(err) : res(json)))
  })
}

/**
 * Flattens nested arrays to a single array containing all values.
 * @param {Array<*>} arr - the Array to Flatten
 * @returns {Array<*>} The flattened array
 */
function flatten(arr) {
  return arr.reduce((agg, curr) => {
    return agg.concat(Array.isArray(curr) ? flatten(curr) : curr)
  }, [])
}

/**
 * Writes the Adresses to the csv file
 * @param {Array<[string,string,string,string]>} addresses - The addresses to write to file
 */
async function writeToFile(addresses) {
  const addressesString = addresses.reduce(
    (agg, curr) => `${agg}${os.EOL}${curr.map(v => sanitize(v || "")).join(";")}`,
    ""
  )
  return fs.writeFile(phonebookLocation, "\ufeff" + addressesString.trim(), "utf8")
}

/**
 * @typedef VCard
 * @type {object}
 * @property {string} begin
 * @property {string} version
 * @property {string} prodid
 * @property {string} uid
 * @property {string} fn - The displayname
 * @property {object} n - The name parts
 * @property {string} n.last - The persons last name
 * @property {string} n.first - The persons first name
 * @property {string} n.middle - The persons middle name
 * @property {string} n.prefix - The persons name prefix
 * @property {string} n.suffix - The persons name suffix
 * @property {object[]} tel - The persons phonenumbers
 * @property {string[]} tel.type - The types of the phone number
 * @property {string} tel.value - The phone number
 * @property {string} [note] - Notes for this person
 * @property {string} [x-addressbookserver-kind] - This value is set if the vcard resambles a group or category
 * @property {string} end
 */
