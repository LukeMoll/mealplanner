const {pad,transpose,flatten,rgba} = require('./util');

const fields = 6; // how many fields each day has
const offset_R = 1; // how many rows are at the top before the days start
const weeks = 6; // maximum number of week rows in the sheet

function makeSheet(sheets, spreadsheetID, year, month) {
    return new Promise((resolve, reject) =>{
        let newSheetId = year*100+month;
        sheets.spreadsheets.batchUpdate({
            "spreadsheetId": spreadsheetID,
            "resource": {
                "requests": [
                    {
                        "addSheet": {
                            "properties": {
                                "title": `${year}-${pad(month,2)}`,
                                "sheetId": newSheetId,
                                "gridProperties": {
                                    "rowCount": (offset_R + fields*weeks),
                                    "columnCount": 7,
                                    "frozenRowCount": 1
                                }
                            }
                        }
                    },
                    {
                        "updateCells": {
                            "rows": buildRows(year, month),
                            "fields": "*",
                            "start": {
                                sheetId: newSheetId,
                                rowIndex: 0,
                                columnIndex: 0
                            }
                        }
                    }
                    // ,...conditonalRules(newSheetId)
                ]
            }
        }, (err,res) => {
            if (err) return reject(err);
            resolve(res);
        })
    })
}

function buildRows(year, month) {
    const header = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    
    const weeks = [];
    let d = new Date(`${year}-${pad(month,2)}-01`);
    const toFillPre = d.getDay()==0?6:d.getDay()-1;
    weeks[0] = Array(toFillPre).fill(0);
    let i=0
    while(d.getMonth() == month-1) {
        weeks[i].push(new Date(d));
        d.setDate(d.getDate() + 1);
        if(d.getDay() == 1) {
            i++;
            weeks[i] = Array(0);
        }
    }

    let headerRows = header // Day[]
        .map(d => ({
            "userEnteredValue":{"stringValue":d},
            "userEnteredFormat": {
                "textFormat": {"bold": true, "fontSize": 12},
                "borders": {"bottom":{"style":"SOLID_THICK"}}
            }
        })) // CellData[]
    let weekRows = flatten(weeks.map(weekToRows));
    let result = [headerRows].concat(weekRows).map(r=>({"values":r}))
    return result;
}

function weekToRows(week) {
    return transpose(week.map(d => d?d.getDate().toString():"")
            .map((s,j) => s===""?Array(6).fill({}):[
                s,
                "Chef",
                "Unplanned meal",
                "19:00",
                "Ingredients",
                "Notes"
            ].map((e,i,a) => ({
                "userEnteredValue": i==0?{"numberValue":e}:{"stringValue":e},
                "userEnteredFormat": Object.assign(
                    j%2==0?{"backgroundColor":rgba(0.95,0.95,0.95)}:{}, // if it's an even column, color the background
                    i==0
                    ?   { // if it's the first row (in a week), apply this format
                            "textFormat": {
                                "bold": true, 
                                "fontSize": 12,
                            },
                            "horizontalAlignment": "LEFT"
                        }
                    :   i==a.length-1 // else if it's the last row (in a week), give it a border
                        ?   {"borders":{"bottom":{"style":"DASHED"}}}
                        :   {}
                )
            }))
            )//map
        )//transpose
}

function conditonalRules(newSheetId) {
    const rules = [
        {
            condition: {
                type: "NUMBER_LESS",
                // values: [{"userEnteredValue": "=DAY(NOW())"}]
                values: [{"userEnteredValue": "21"}]
            },
            format: {
                textFormat: {
                    foregroundColor: rgba(0.5,0.5,0.5),
                    strikethrough: true
                }
            }
        },
        {
            condition: {
                type: "NUMBER_EQ",
                values: [{"userEnteredValue": "=DAY(NOW())"}]
            },
            format: {
                textFormat: {
                    foregroundColor: rgba(1,1,1),
                    italic: true
                },
                backgroundColor: rgba(0,0.6,1)
            }
        }
    ]
    const result = rules.map((rule,index) =>
        ({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": 
                        {sheetId:newSheetId, startRowIndex:0, startColumnIndex:0},/*
                        [0].map(i=>(i*fields)+offset_R).map(i=>({
                            sheetId: newSheetId,
                            startRowIndex: i,
                            endRowIndex: i+1,
                        })),//*/
                    "booleanRule": rule
                },
                "index":index
            }
        }));
    console.log(JSON.stringify(result,null,2));
    return result;
}

module.exports = {makeSheet};