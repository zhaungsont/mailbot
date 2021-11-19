//Sakana's Mailbot V1.0
require('dotenv').config();

//nodemailer npm
const nodeMailer = require('nodemailer');
// const fs = require('fs');

//account
// const account = require('./account.json');
// const apikeys = require('./apikeys.json');
//schedule nmp
const schedule = require('node-schedule');

const express = require("express");
//use it to ping my website to prevent idling
const https = require("https");
const app = express();
app.use(express.static("public"));
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}));

//openweather url
// const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=Taipei&appid=" + apikeys.openweatherKey + "&units=metric&lang=zh_tw";
const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=Taipei&appid=" + process.env.WEATHER_API + "&units=metric&lang=zh_tw";

//quote url
const quoteUrl = "https://quotes.rest/qod";

//課表
// const syllabus = require('./syllabus.json');
const syllabus = {
  "Monday": "新聞英語採訪寫作編譯",
  "Tuesday": "英語教學法、浪漫起英國文學",
  "Wednesday": "無",
  "Thursday": "體育、中英同步口譯、英語音韻學、英文專題研究與寫作",
  "Friday": "語料庫輔助翻譯",
  "Saturday": "無",
  "Saturday": "無"
}

//yahoo finance
const axios = require("axios").default;
let financeOptions = {
  method: 'GET',
  url: 'https://yfapi.net/v6/finance/quote',
  params: {
    symbols: '^DJI,^GSPC,^TWII,'
  },
  headers: {
    'x-api-key': process.env.FINANCE_API
  }
};
let DJIName = null;
let DJIPrice = null;
let DJICurrency = null;
let DJIChangePercent = null;

let GSPCName = null;
let GSPCPrice = null;
let GSPCCurrency = null;
let GSPCChangePercent = null;

let TWIIName = null;
let TWIIPrice = null;
let TWIICurrency = null;
let TWIIChangePercent = null;

let usStockBrief = "";
let twStockBrief = "";

//////////////////// Start Job Schedule ////////////////////
const job = schedule.scheduleJob('1 0 0 * * *', function() {

  //Get DYNAMIC Stock Info
  axios.request(financeOptions).then(function(response) {
    DJIName = response.data.quoteResponse.result[0].shortName;
    DJIPrice = Math.round(response.data.quoteResponse.result[0].regularMarketChange * 100) / 100;
    DJICurrency = response.data.quoteResponse.result[0].currency;
    DJIChangePercent = Math.round(response.data.quoteResponse.result[0].regularMarketChangePercent * 100) / 100;

    GSPCName = response.data.quoteResponse.result[1].shortName;
    GSPCPrice = Math.round(response.data.quoteResponse.result[1].regularMarketChange * 100) / 100;
    GSPCCurrency = response.data.quoteResponse.result[1].currency;
    GSPCChangePercent = Math.round(response.data.quoteResponse.result[1].regularMarketChangePercent * 100) / 100;

    TWIIName = response.data.quoteResponse.result[2].shortName;
    TWIIPrice = Math.round(response.data.quoteResponse.result[2].regularMarketChange * 100) / 100;
    TWIICurrency = response.data.quoteResponse.result[2].currency;
    TWIIChangePercent = Math.round(response.data.quoteResponse.result[2].regularMarketChangePercent * 100) / 100;



    usStockBrief = `${DJIName} 即時價格：${DJIPrice} ${DJICurrency}，漲跌 ${DJIChangePercent}<br>${GSPCName} 即時價格：${GSPCPrice} ${GSPCCurrency}，漲跌 ${GSPCChangePercent}`;
    twStockBrief = `${TWIIName} 即時價格：${TWIIPrice} ${TWIICurrency}，漲跌 ${TWIIChangePercent}`;
    console.log(twStockBrief);
  }).catch(function(error) {
    console.error(error);
  });

  //Get DYNAMIC Date
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const timeStr = `${year}/${month}/${day}`;
  const time = `${date.getHours()+7}時${date.getMinutes()}分${date.getUTCSeconds()}秒`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekday = days[ date.getDay() ];
console.log(weekday);
console.log(time);

  https.get(weatherUrl, function(response) {
    console.log(response.statusCode);

    response.on("data", function(data) {
      const weatherData = JSON.parse(data);
      const temp = weatherData.main.temp;
      const tempMin = weatherData.main.temp_min;
      const tempMax = weatherData.main.temp_max;
      console.log(temp);
      const desc = weatherData.weather[0].description;
      console.log(desc);

      //Get DYNAMIC Quote
      https.get(quoteUrl, function(response) {
        console.log(response.statusCode);

        response.on("data", function(data) {
          const quoteData = JSON.parse(data);
          const quoteText = quoteData.contents.quotes[0].quote;
          const quoteAuther = quoteData.contents.quotes[0].author;
          // const quoteText = "placeholder";
          // const quoteAuther = "placeholder";
          console.log(quoteText);

          const tempStatement = "<strong>目前台北氣溫" + temp + "°C</strong>。<br>最低<strong>" + tempMin + "°C</strong>，最高<strong>" + tempMax + "°C</strong>。<br>天氣狀態：" + desc+"。";
          const quoteOfTheDay = "<strong>Quote of the day: </strong><br>" + quoteText + "<br> —" + quoteAuther;

          const content = `
        Good morning, <br>
        This is sakana's automatic email briefing. It is scheduled at 8am every morning.<br><br>
        <strong>Here's your morning briefing: </strong><br>
        <ul>
        <li>${tempStatement}</li><br>
        <li><strong>美股資訊：</strong><br>${usStockBrief}</li><br>
        <li><strong>台股資訊：</strong><br>${twStockBrief}</li><br>
        <li>${quoteOfTheDay}</li><br>
        </ul>
        <p>今日是 ${weekday} ，今日課程：${syllabus[weekday]}。
        </p>
        Morning briefing over.<br>
        寄出時間：${time}
        <p>Sakana's Mailbot V1.0</p>
        `

          const receivers = process.env.RECEIVERS
            .split('\r\n')
            .filter(e => !e.startsWith('//'))
            .join(',');

          const transporter = nodeMailer.createTransport({
            service: 'hotmail',
            auth: {
              user: process.env.SENDER_EMAIL,
              pass: process.env.SENDER_PASSWORD
            }
          });

          const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: receivers, // list of receipients
            subject: `Your Morning Briefing on ${timeStr}`,
            html: `<p>${content}<p>`
          }

          // send email
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
            if (info) console.log(`Done sending!, send date: ${timeStr}`, info)
          });
        });
      });
    });
  });
});

app.get("/", function(req,res){
  res.sendFile(__dirname + "/index.html")
})

app.post("/", function(req,res){
  const email = req.body.email;
  console.log(email);

  function newSub(){
    //Get DYNAMIC Date
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const timeStr = `${year}/${month}/${day}`;
    const time = `${date.getHours()+7}時${date.getMinutes()}分${date.getUTCSeconds()}秒`;
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const weekday = days[ date.getDay() ];

    const transporter = nodeMailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: "zhaungsont@gmail.com",
      subject: `Sakana, ${email} Has Subscribed to Mailbot Waitlist on ${timeStr}`,
      html: `<p>Sakana, a user has sent their Mailbot subscription request to you. <br>
      Their email is : <strong>${email}</strong>. Please reply to them as soon as possible. <br><br>
      Best, <br>
      Sakana's Mailbot.<p><br>
      送出時間：${timeStr} ${weekday} ${time}`
    }

    // send email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
      if (info) console.log(`Done sending!, send date: ${timeStr}`, info)
    });
  }
  newSub();
})

setInterval(function() {
    https.get("https://sakana-mailbot.herokuapp.com");
}, 300000); // every 5 minutes (300000)

app.listen(process.env.PORT || 3000, function(){
  console.log("Server started.");
});
