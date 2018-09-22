
function pad(val, length, padChar="0") {
    val = `${val}`;
    if(val.length>=length) return val;
    return padChar.repeat(length-val.length) + val;
}

function transpose(m) {//https://stackoverflow.com/a/36164530
    return m.length > 0?m[0].map((x,i) => m.map(x => x[i])):[];
}

function flatten(a) {//https://lorenstewart.me/2016/11/21/flatten-a-multi-dimensional-array-using-es6/
    return [].concat(...a);  
}

function rgba(r,g,b,a=1) {
    return {
        "red": r,
        "green": g,
        "blue": b,
        "alpha": a
    }
}

module.exports = {pad,transpose,flatten, rgba}