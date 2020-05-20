const dav = require("dav");
const dotenv = require("dotenv");
const vcardparser = require("vcardparser");
const fs = require("fs").promises;
const os = require("os");
dotenv.config();

const cardDavUrl = process.env.CARDDAV_URL;
const cardDavUser = process.env.CARDDAV_USER;
const cardDavPass = process.env.CARDDAV_PASS;
const phonebookLocation = process.env.PHONER_DIR;
(async function main() {
  // dav.debug.enabled = true;
  var xhr = new dav.transport.Basic(
    new dav.Credentials({
      username: cardDavUser,
      password: cardDavPass
    })
  );

  var account = await dav.createAccount({
    server: cardDavUrl,
    xhr: xhr,
    accountType: "carddav",
    loadCollections: true,
    loadObjects: true
  });
  const addressBook = account.addressBooks[0];
  var addresses = addressBook.objects.map(addr => addr.addressData);
  var parsedAddresses = await Promise.all(addresses.map(parseVCard));
  var filtered = parsedAddresses.filter(
    add => !add["x-addressbookserver-kind"]
  );
  var mapped = filtered.map(mapAddress);
  var flattened = flatten(mapped);

  await writeToFile(flattened);
})();

function san(string) {
  if (string) {
    string = string.replace(/;/g, "þ");
    string = string.replace(/<HTCData>.*$/g, "");
  }
  return string;
}

function mapAddress(vcard) {
  if (!vcard.tel || !vcard.tel.length)
    return [{ name: vcard.fn, num: "", note: vcard.note }];
  if (vcard.tel.length == 1)
    return [{ name: vcard.fn, num: vcard.tel[0].value, note: vcard.note }];
  return vcard.tel.map(tel => ({
    name: `${vcard.fn} (${tel.type.join(",")})`,
    num: tel.value,
    note: vcard.note
  }));
}

function parseVCard(vcard) {
  return new Promise((res, rej) => {
    vcardparser.parseString(vcard, (err, json) => (err ? rej(err) : res(json)));
  });
}

function flatten(arr) {
  return arr.reduce(function(flat, toFlatten) {
    return flat.concat(
      Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
    );
  }, []);
}

async function writeToFile(addresses) {
  const addressesString = addresses.reduce(
    (agg, curr) =>
      `${agg}${os.EOL}${san(curr.num)};${san(curr.name)};;${san(
        curr.note || ""
      )}`,
    ""
  );
  return fs.writeFile(
    phonebookLocation,
    "\ufeff" + addressesString.trim(),
    "utf8"
  );
}
