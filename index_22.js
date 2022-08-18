require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("node:dns");

// Basic Configuration
const port = process.env.PORT || 3000;
const dbURI = process.env["DB_URI"];
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

//Connection to Data Base.
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to Database"));

//Import URL Model.
const Url = require("./models/url");

// Post Endpoint
app.post(
  "/api/shorturl",
  //Middleware to validate Url
  (req, res, next) => {
    //Validate the url
    try {
      new URL(req.body.url);
    } catch (error) {
      return res.json({ error: "Invalid URL" });
    }
    //Validate Host
    const url = new URL(req.body.url);
    dns.lookup(url.hostname, (error, addres, family) => {
      if (error?.code == "ENOTFOUND") {
        return res.json({ error: "Invalid Hostname" });
      }
      // Validate if already exist de url on DB
      Url.findOne({ original_url: url.origin }).exec((error, result) => {
        if (result?.original_url != undefined) {
          return res.json({
            original_url: result.original_url,
            short_url: result.short_url,
          });
        }
        next();
      });
    });
  },
  (req, res) => {
    const url = new URL(req.body.url);
    let shortId;
    // Consult the DB to find the last url_short id
    Url.findOne({})
      .sort({ short_url: "desc" })
      .exec((error, result) => {
        if (error) {
          return res.json({ error_mesagge: error.message });
        }
        if (result == undefined) {
          shortId = 1;
        } else {
          shortId = result.short_url + 1;
        }
        // Create new document
        const newUrl = new Url({
          original_url: url.origin,
          short_url: shortId,
        });
        // Insert new document
        newUrl.save((error, data) => {
          if (error) {
            res.json({ error_mesagge: error.message });
          }
          return res.json({
            original_url: `${data.original_url}`,
            short_url: data.short_url,
          });
        });
      });
  }
);

app.get("/api/shorturl/:id", (req, res) => {
  const id = req.params.id;
  Url.findOne({ short_url: id }, (error, data) => {
    if (error) {
      res.json({ error_mesagge: error.message });
    }
    if (!data) {
      res.json({ error: "invalid url" });
    } else {
      res.redirect(data.original_url);
    }
  });
});
