const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const DeviceDetector = require('device-detector-js');
const deviceDetector = new DeviceDetector();
var MongoClient = require('mongodb').MongoClient;
const fetch = require('isomorphic-fetch');
const port = process.env.PORT || 3000;
process.env.rp = __dirname;
dburl = 'mongodb+srv://shub:shub@crondb.fr6ybt4.mongodb.net/?retryWrites=true&w=majority';
var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use('/public', express.static(path.join(__dirname, 'public'))); app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
app.use(cors()); app.use(urlencodedParser);
app.use(compression()); app.use(cookieParser(httpOnly = false));
app.all('*', (req, res) => { 
    a = req.params[0].split('/');
    if (a[1] == 'api' && a[2] == 'sys' && a[3] == 'cron' && a[4] == 'take') {
        cron(req, res);
    } else if (a[1] == 'api' && a[2] == 'sys' && a[3] == 'cron') {
        cronExec(req, res);
    } else if (a[1]=='last') {
        lastExec(req, res);
    } else {
        res.header("Content-Type", "text/html");
        res.send('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title></head><body>Cron Job Runner</body></html>');
    }
});
async function count(mongourl, dbname, colname) {
    var db = await MongoClient.connect(mongourl);
    var dbo = await db.db(dbname);
    var r = await dbo.collection(colname).countDocuments();
    db.close();
    return r;
}
async function query(mongourl, dbname, colname, data, start, end) {
    var db = await MongoClient.connect(mongourl);
    var dbo = await db.db(dbname);
    var r = await dbo.collection(colname).find(data).skip(start - 1).limit(end - start + 1).toArray();
    db.close();
    return r;
}
async function update(mongourl, dbname, colname, predata, data) {
    var db = await MongoClient.connect(mongourl);
    var dbo = await db.db(dbname);
    try {
        var r = await dbo.collection(colname).updateMany(predata, data);
        db.close();
        return { status: 'success', statcode: 1, message: r };
    } catch (e) {
        return { status: 'error', statcode: 0, message: e };
    }
}
function str(a) {
    return a.toString();
}
function inFixedStr(a, b) {
    if (typeof a !== 'string') {
        a = str(a);
    }
    if (typeof a === 'string') {
        while (a.length < b) {
            a = '0' + a;
        }
    }
    return a
}
function getDate(a = 0) {
    var cdate = new Date();
    cdate = new Date(cdate.getTime() + (a + cdate.getTimezoneOffset()) * 60000);
    cdate = { year: cdate.getFullYear(), month: cdate.getMonth() + 1, day: cdate.getDay(), date: cdate.getDate(), hour: cdate.getHours(), minute: cdate.getMinutes(), second: cdate.getSeconds(), millisecond: cdate.getMilliseconds() };
    cdate = { inNumber: { year: cdate.year, month: cdate.month, day: cdate.day, date: cdate.date, hour: cdate.hour, minute: cdate.minute, second: cdate.second, millisecond: cdate.millisecond }, inString: { year: str(cdate.year), month: str(cdate.month), day: str(cdate.day), date: str(cdate.date), hour: str(cdate.hour), minute: str(cdate.minute), second: str(cdate.second), millisecond: str(cdate.millisecond) }, inFixedString: { year: inFixedStr(cdate.year, 4), month: inFixedStr(cdate.month, 2), day: inFixedStr(cdate.day, 2), date: inFixedStr(cdate.date, 2), hour: inFixedStr(cdate.hour, 2), minute: inFixedStr(cdate.minute, 2), second: inFixedStr(cdate.second, 2), millisecond: inFixedStr(cdate.millisecond, 3) } };
    return cdate;
}
function splitNumberIntoRanges(number, interval) {
    const ranges = [];
    let start = 1;
    let end = interval;
    while (start <= number) {
        if (end > number) {
            end = number;
        }
        ranges.push([start, end]);
        start = end + 1;
        end += interval;
    }
    return ranges;
}
async function cronExec(req, res){
    stimef = getDate(0);
    stime = stimef.inFixedString;
    stimen = stimef.inNumber;
    stimeStr = stime.year + stime.month + stime.date + stime.hour + stime.minute + stime.second + stime.millisecond;
    cv = inFixedStr(stimef.inNumber.hour, 2) + ":" + inFixedStr((Math.floor(stimef.inNumber.minute / 5) * 5), 2);
    p = await count(dburl, 'CronDB', 'jobs');
    if (p != 0) {
        splitNumberIntoRanges(p, 50).forEach((e) => {
            console.log('http://localhost:3000/api/sys/cron/take?start=' + e[0] + '&end=' + e[1] + '&cv=' + cv);
            fetch('http://localhost:3000/api/sys/cron/take?start=' + e[0] + '&end=' + e[1] + '&cv=' + cv);
        });
    }
    etimef = getDate(0);
    etime = etimef.inFixedString;
    etimen = etimef.inNumber;
    etimeStr = stime.year + stime.month + stime.date + stime.hour + stime.minute + stime.second + stime.millisecond;
    await update(dburl, 'CronDB', 'last', { for: "lastCronJob" }, { $set: { data: { for: "lastCronJob", start_time: stimeStr, end_time: etimeStr, start_time_n: stimen, end_time_n: etimen } } })
    resp = { start_time_ic: stimeStr, end_time_ic: etimeStr, start_time: stimen, end_time: etimen };
    res.header("Content-Type", "application/json");
    res.send(resp);
}
async function cron(req, res) {
    console.log(dburl, 'CronDB', 'jobs', {}, parseInt(req.query.start), parseInt(req.query.end));
    p = await query(dburl, 'CronDB', 'jobs', {}, parseInt(req.query.start), parseInt(req.query.end));
    timearray = {
        every5min: ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45", "00:50", "00:55", "01:00", "01:05", "01:10", "01:15", "01:20", "01:25", "01:30", "01:35", "01:40", "01:45", "01:50", "01:55", "02:00", "02:05", "02:10", "02:15", "02:20", "02:25", "02:30", "02:35", "02:40", "02:45", "02:50", "02:55", "03:00", "03:05", "03:10", "03:15", "03:20", "03:25", "03:30", "03:35", "03:40", "03:45", "03:50", "03:55", "04:00", "04:05", "04:10", "04:15", "04:20", "04:25", "04:30", "04:35", "04:40", "04:45", "04:50", "04:55", "05:00", "05:05", "05:10", "05:15", "05:20", "05:25", "05:30", "05:35", "05:40", "05:45", "05:50", "05:55", "06:00", "06:05", "06:10", "06:15", "06:20", "06:25", "06:30", "06:35", "06:40", "06:45", "06:50", "06:55", "07:00", "07:05", "07:10", "07:15", "07:20", "07:25", "07:30", "07:35", "07:40", "07:45", "07:50", "07:55", "08:00", "08:05", "08:10", "08:15", "08:20", "08:25", "08:30", "08:35", "08:40", "08:45", "08:50", "08:55", "09:00", "09:05", "09:10", "09:15", "09:20", "09:25", "09:30", "09:35", "09:40", "09:45", "09:50", "09:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45", "10:50", "10:55", "11:00", "11:05", "11:10", "11:15", "11:20", "11:25", "11:30", "11:35", "11:40", "11:45", "11:50", "11:55", "12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30", "12:35", "12:40", "12:45", "12:50", "12:55", "13:00", "13:05", "13:10", "13:15", "13:20", "13:25", "13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30", "14:35", "14:40", "14:45", "14:50", "14:55", "15:00", "15:05", "15:10", "15:15", "15:20", "15:25", "15:30", "15:35", "15:40", "15:45", "15:50", "15:55", "16:00", "16:05", "16:10", "16:15", "16:20", "16:25", "16:30", "16:35", "16:40", "16:45", "16:50", "16:55", "17:00", "17:05", "17:10", "17:15", "17:20", "17:25", "17:30", "17:35", "17:40", "17:45", "17:50", "17:55", "18:00", "18:05", "18:10", "18:15", "18:20", "18:25", "18:30", "18:35", "18:40", "18:45", "18:50", "18:55", "19:00", "19:05", "19:10", "19:15", "19:20", "19:25", "19:30", "19:35", "19:40", "19:45", "19:50", "19:55", "20:00", "20:05", "20:10", "20:15", "20:20", "20:25", "20:30", "20:35", "20:40", "20:45", "20:50", "20:55", "21:00", "21:05", "21:10", "21:15", "21:20", "21:25", "21:30", "21:35", "21:40", "21:45", "21:50", "21:55", "22:00", "22:05", "22:10", "22:15", "22:20", "22:25", "22:30", "22:35", "22:40", "22:45", "22:50", "22:55", "23:00", "23:05", "23:10", "23:15", "23:20", "23:25", "23:30", "23:35", "23:40", "23:45", "23:50", "23:55", ],
        every10min: ["00:00", "00:10", "00:20", "00:30", "00:40", "00:50", "01:00", "01:10", "01:20", "01:30", "01:40", "01:50", "02:00", "02:10", "02:20", "02:30", "02:40", "02:50", "03:00", "03:10", "03:20", "03:30", "03:40", "03:50", "04:00", "04:10", "04:20", "04:30", "04:40", "04:50", "05:00", "05:10", "05:20", "05:30", "05:40", "05:50", "06:00", "06:10", "06:20", "06:30", "06:40", "06:50", "07:00", "07:10", "07:20", "07:30", "07:40", "07:50", "08:00", "08:10", "08:20", "08:30", "08:40", "08:50", "09:00", "09:10", "09:20", "09:30", "09:40", "09:50", "10:00", "10:10", "10:20", "10:30", "10:40", "10:50", "11:00", "11:10", "11:20", "11:30", "11:40", "11:50", "12:00", "12:10", "12:20", "12:30", "12:40", "12:50", "13:00", "13:10", "13:20", "13:30", "13:40", "13:50", "14:00", "14:10", "14:20", "14:30", "14:40", "14:50", "15:00", "15:10", "15:20", "15:30", "15:40", "15:50", "16:00", "16:10", "16:20", "16:30", "16:40", "16:50", "17:00", "17:10", "17:20", "17:30", "17:40", "17:50", "18:00", "18:10", "18:20", "18:30", "18:40", "18:50", "19:00", "19:10", "19:20", "19:30", "19:40", "19:50", "20:00", "20:10", "20:20", "20:30", "20:40", "20:50", "21:00", "21:10", "21:20", "21:30", "21:40", "21:50", "22:00", "22:10", "22:20", "22:30", "22:40", "22:50", "23:00", "23:10", "23:20", "23:30", "23:40", "23:50"],
        every20min: ["00:00", "00:20", "00:40", "01:00", "01:20", "01:40", "02:00", "02:20", "02:40", "03:00", "03:20", "03:40", "04:00", "04:20", "04:40", "05:00", "05:20", "05:40", "06:00", "06:20", "06:40", "07:00", "07:20", "07:40", "08:00", "08:20", "08:40", "09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40", "17:00", "17:20", "17:40", "18:00", "18:20", "18:40", "19:00", "19:20", "19:40", "20:00", "20:20", "20:40", "21:00", "21:20", "21:40", "22:00", "22:20", "22:40", "23:00", "23:20", "23:40"],
        every30min: ["00:00", "00:30", "01:00", "01,30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"],
        everyHour: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
        every2h: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        every3h: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
        every4h: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
        every6h: ["00:00", "06:00", "12:00", "18:00"], 
        thriceADay: ["00:00", "08:00", "16:00"],
        twiceADay: ["00:00", "12:00"],
        onceADay: ["00:00"]
    };
    if (p.length !== 0) { 
        p.forEach(async element => {
            if (element.time.format == 'fix') {
                tv =timearray[element.time.values];
            } else if(element.time.format == 'custom') {
                tv = element.time.values;
            }
            if (tv.includes(req.query.cv)) {
                pv = new URLSearchParams();
                for (const key in element.post) {
                    pv.append(key, element.post[key]);
                }
                fetch(element.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: pv
                });
            }
        });
    }
    setTimeout(() => { res.send('ok'); }, 5000);
}
async function lastExec(req, res) {
    p = await query(dburl, 'CronDB', 'last', { for: "lastCronJob" });
    if (p.length == 1) {
        p = p[0].data;
    } else {
        p = { status: 'error', statcode: 0, message: 'No last cron job found'};
    }
    r = {}
    r['ip'] = req.headers['cf-connecting-ip'] || req.ip;
    r['user_data'] = deviceDetector.parse(req.headers['user-agent']);
    if (req.body['ch-pf'] != undefined && req.body['ch-pfv'] != undefined && req.body['ch-pf'] != '' && req.body['ch-pfv'] != '') {
        pfv = req.body['ch-pfv'].split('.');
        if (req.body['ch-pf'].toLowerCase() == 'windows') {
            if (pfv[0] == '13' || pfv[0] == '14') {
                pfv = '11 Previews';
            } else if (pfv[0] == '15') {
                pfv = '11 Release';
            } else {
                pfv = pfv[0];
            }
        } else {
            pfv = pfv[0];
        }
        r['user_data']['os']['fullname'] = req.body['ch-pf'] + ' ' + pfv;
    }
    resp = { lastJob: p, reqby: r };
    res.header("Content-Type", "application/json");
    res.send(resp);
}
function run(http) {http.listen(port, () => { console.log(`App running at ${port}`); }); }
run(http);