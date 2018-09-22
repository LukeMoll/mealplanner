const {google} = require('googleapis');
const {makeSheet} = require('./sheet');
const {authorize,getSheetCalendarID} = require('./auth');


const args = process.argv.slice(2);
if(args.length < 2) {
    const now = new Date()
    console.log(`USAGE:
    $ node generate-sheet <year> <month>
    Example:
    $ node generate-sheet ${now.getFullYear()} ${now.getMonth()+1}`.replace(/\n\s+/g,"\n"));
    process.exit(1);
}
const year = parseInt(args[0]);
const month = parseInt(args[1]);
if(1970 > year || month < 1 || 12 < month) {
    console.log(`Invalid year/month.`);
    process.exit(1)
}


authorize("credentials.json", "token.json", ["https://www.googleapis.com/auth/spreadsheets"])
    .then(auth => {
        const sheets = google.sheets({version: 'v4', auth});
        const calendar = google.calendar({version: 'v3', auth});
        return Promise.all([sheets,calendar,getSheetCalendarID()]);
    })
    .then(([sheets, calendar, {spreadsheetID, calendarID}]) => {
        makeSheet(sheets, spreadsheetID, year, month)
            .then((res) => {
                console.log("Done.")
                if(args[2] && args[2].includes("verbose")) {
                    const inspect = require('util').inspect;
                    console.log(inspect(res,true,5));
                }
            })
            .catch(console.log)
    })