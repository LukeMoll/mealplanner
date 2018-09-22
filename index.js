const {google} = require('googleapis');

const {authorize} = require('./auth');
const {pad} = require('./util');
const {makeSheet} = require('./plansheet');

const SPREADSHEET_ID = `1MSn8VuJlk5brcDqLgmFbxfMXXungtsV2PXjCJf-fLhc`;
const CALENDAR_ID = `tap5kg3bc8tq9nsmi3rvee93hc@group.calendar.google.com`;

authorize("credentials.json", "token.json", [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar.events"
])
.then(auth => {
    const sheets = google.sheets({version: 'v4', auth});
    const calendar = google.calendar({version: 'v3', auth});
    return Promise.all([sheets,calendar]);
})
.then(([sheets, calendar]) => makeSheet(sheets, SPREADSHEET_ID, 2018,11))
.then(console.log)
/*.then(([sheets,calendar]) => {
    return Promise.all([
        deleteEventsInMonth(calendar, CALENDAR_ID, 2018, 9), 
        getMeals(sheets, SPREADSHEET_ID, 2018, 9), 
        calendar])
})
.then(([deltd, meals, calendar]) => {
    console.log("Events deleted.")
    meals.forEach(m => addEvent(calendar, CALENDAR_ID, mealToEvent(m)).then(e => {
        console.log(`Event created: ${e.data.htmlLink}`)
    }).catch(err => console.log(`Error creating event: ${err}`)));
})*/
.catch(console.log);

const mealKeys = [
    "date",
    "chef",
    "meal",
    "time",
    "ingredients",
    "notes"
]

function getMeals(sheets, spreadsheetID, year, month) {
    const colMon = 'B', colSun = 'H';
    const rowStart = 2;
    const fields = mealKeys.length;
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetID,
            range: `${year}-${pad(month,2)}!${colMon}${rowStart}:${colSun}${rowStart + fields*5}`
        }, (err,res) => {
            if(err) return reject(err);
            resolve(res);
        })
    }).then(res => {
        let meals = [];
        const rows = res.data.values;
        for(let week=0;week<5;week++) {
            for(let day=0;day<7;day++) {
                if(week*6 < rows.length) {
                    let meal = {}
                    for(let i=0; i<fields; i++) {
                        meal[mealKeys[i]] = rows[week*fields+i][day];
                    }
                    meal.dateTime = new Date(`${meal.time} ${year}-${month}-${meal.date}`);
                    meals.push(meal);
                }
            }
        }
        return meals;
    })
}

function mealToEvent(meal) {
    const endDate = new Date(meal.dateTime);
    endDate.setHours(endDate.getHours()+1);
    try {
        return {
            summary: `${meal.chef} - ${meal.meal}`,
            description: `${meal.notes}`,
            start: {
                dateTime: `${meal.dateTime.toISOString()}`,
                timeZone: `Europe/London`
            },
            end: {
                dateTime: `${endDate.toISOString()}`,
                timeZone: `Europe/London`
            }
        };
    }
    catch(err) {
        console.log(`Error with meal ${meal.meal} (${meal.dateTime}): ${err}`)
        return null;
    }
}

function addEvent(calendar, calendarID, event) {
    return new Promise((resolve,reject) => {
        if (event === null) reject("Null event");
        calendar.events.insert({
            calendarId: calendarID,
            resource: event
        }, (err, e) => {
            if (err) return reject(err);
            resolve(e);
        })
    })
}

function deleteEventsInMonth(calendar, calendarID, year, month) {
    const minDate = new Date(`${year}-${month}-01`);
    const maxDate = new Date(new Date(minDate).setMonth(minDate.getMonth() + 1));
    return new Promise((resolve, reject) => {
        calendar.events.list({
            calendarId: calendarID,
            timeMin: minDate.toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        }, (err, res) => {
            if (err) return reject(`Error listing events: ${err}`)
            let events = res.data.items.filter(e => {
                let start = new Date(e.start.dateTime || e.start.date);
                return (minDate <= start) && (start <= maxDate)
            })
            resolve(events);
        })
    }).then(events => {
        return Promise.all(events.map(e => new Promise((resolve, reject)=> {
            calendar.events.delete({
                calendarId: calendarID,
                eventId: e.id
            }, (err) => {
                if (err) return reject(err);
                resolve()
            })
        })))
    })
}