//nodemailer npm
const nodeMailer = require('nodemailer');
const fs = require('fs');

//account
const account = require('./account.json');
const apikeys = require('./apikeys.json');
//schedule nmp
const schedule = require('node-schedule');

const express = require("express");
const https = require("https");
const app = express();

//openweather url
const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=Taipei&appid=" + apikeys.openweatherKey + "&units=metric&lang=zh_tw";
console.log(weatherUrl)
//quote url
const quoteUrl = "https://quotes.rest/qod";

//yahoo finance
const axios = require("axios").default;
let financeOptions = {
  method: 'GET',
  url: 'https://yfapi.net/v6/finance/quote',
  params: {
    symbols: '^DJI,^GSPC,BTC-USD'
  },
  headers: {
    'x-api-key': apikeys.financeKey
  }
};
let fName = null;
let fPrice = null;
let sName = null;
let sPrice = null;
let stockBrief = "";

//////////////////// Start Job Schedule ////////////////////
const job = schedule.scheduleJob('10 * * * * *', function() {

  //Get DYNAMIC Stock Info
  axios.request(financeOptions).then(function(response) {
    fName = response.data.quoteResponse.result[0].shortName;
    fPrice = response.data.quoteResponse.result[0].regularMarketChange;

    sName = response.data.quoteResponse.result[1].shortName;
    sPrice = response.data.quoteResponse.result[1].regularMarketChange;
    stockBrief = `Latest price for ${fName}: $${fPrice}; <br>Latest price for ${sName}: $${sPrice}.`;
    console.log(stockBrief);
  }).catch(function(error) {
    console.error(error);
  });

  //Get DYNAMIC Date
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const timeStr = `${year}/${month}/${day}`;
  const time = `${date.getHours()}時${date.getMinutes()}分${date.getUTCSeconds()}秒`;

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
          // const quoteText = quoteData.contents.quotes[0].quote;
          // const quoteAuther = quoteData.contents.quotes[0].author;
          const quoteText = "placeholder";
          const quoteAuther = "placeholder";
          console.log(quoteText);

          const tempStatement = "The current temperature in Taipei is <strong>" + temp + "°C</strong>. <br>The lowest can be <strong>" + tempMin + "°C</strong> and the highest <strong>" + tempMax + "°C</strong>. Weather description: " + desc;
          const quoteOfTheDay = "Quote of the day: <br>" + quoteText + "<br> --" + quoteAuther;

          const content = `
        Good morning, <br>
        This is sakana's automatic email briefing. It is scheduled at 8am every morning.<br>
        If you're seeing this, it means I've successfully created my first automatic mail bot. <br><br>
        <strong>Here's your morning briefing: </strong><br>
        <ul>
        <li>${tempStatement}</li><br>
        <li>${quoteOfTheDay}</li><br>
        <li>${stockBrief}</li>
        </ul>
        Morning briefing over.<br>
        寄出時間：${time}`

          const receivers = fs.readFileSync('./receivers.txt', 'utf8')
            .split('\r\n')
            .filter(e => !e.startsWith('//'))
            .join(',');

          const transporter = nodeMailer.createTransport({
            service: 'hotmail',
            auth: {
              user: account.hotmail.user,
              pass: account.hotmail.pass
            }
          });

          const mailOptions = {
            from: account.hotmail.user,
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
console.log("app is running");
