const fs = require('fs-extra');
const readline = require('readline');
const {google} = require('googleapis')

function authorize(credentialsPath, tokenPath, scopes) {
    return new Promise((resolve, reject) => {
        fs.readFile(credentialsPath).then(content => {
            const credentials = JSON.parse(content);
            const {client_secret, client_id, redirect_uris} = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0]);

            // Check if we have previously stored a token.
            fs.readFile(tokenPath).then(tokenContent => {
                let token = JSON.parse(tokenContent);
                let tokenScopes = token.scope.split(" ");
                for(let scope of scopes) {
                    if(!tokenScopes.includes(scope)) {
                        console.log(`Scope ${scope} not found in tokenScopes`);
                        throw new Error("Saved token has insufficient scope");
                    }
                }
                oAuth2Client.setCredentials(token);
                resolve(oAuth2Client)
            }).catch(err => {
                console.log(err);
                getNewToken(oAuth2Client, tokenPath, scopes, resolve);
            });
            
        })
    })
}

function getNewToken(oAuth2Client, tokenPath, scopes, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error while trying to retrieve access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(tokenPath, JSON.stringify(token), (err) => {
          if (err) console.error(err);
          console.log('Token stored to', tokenPath);
        });
        callback(oAuth2Client);
      });
    });
}

const idFile = "sheet-calendar-id.json"
function getSheetCalendarID() {
    return new Promise((resolve,reject) => {
        fs.readFile(idFile).then(content => {
            let obj = JSON.parse(content);
            if(typeof obj === "object" && obj.spreadsheetID && obj.calendarID) {
                resolve(obj);
            }
            else {
                reject("Not all values found");
            }
        }).catch(err => {
            getNewIDs(idFile, resolve);
        })
    });
}


function getNewIDs(idPath, callback) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(`Enter the ID of your GOOGLE SHEET: `, (spreadsheetID) => {
        rl.question(`Enter the ID of your GOOGLE CALENDAR: `, calendarID => {
            rl.close();
            const obj = {spreadsheetID, calendarID};
            fs.writeFile(idPath, JSON.stringify(obj))
                .then(()=>callback(obj))
                .catch(()=>callback(obj))
        })
    })
}

module.exports = {authorize, getSheetCalendarID};
