# ContactSync

ContactSync is a small nodeJS application which downloads the contacts from a CardDAV-Server and writes them to a file.

## Use Case

I'm using this tool to sync my online Contacts to my [Phoner(Lite)](https://lite.phoner.de/index_de.htm) installation.

## How to run

1. Close Phoner(Lite)! This is important, because the `phonebook.csv` is written on close and would override your freshly synced contacts.
2. Add the environment variables
3. Run `node ./index.js`
4. Start Phoner(Lite) again.

### Environment variables

|      Name     | Description                                                     |
|:-------------:|-----------------------------------------------------------------|
|  CARDDAV_URL  |  The URL to your cardDAV server                                 |
| CARDDAV_USER  |  The username to login to cardDAV server                        |
| CARDDAV_PASS  |  The password to login to cardDav server                        |
| PHONEBOOK_LOC | The path to the destination file: e.g. `<phoner>/phonebook.csv` |

You may set those values in a `.env` file.
