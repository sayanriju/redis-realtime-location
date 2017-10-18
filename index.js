const http = require("http")
const Faye = require("faye")
const Redis = require("redis")
const express = require("express")

const gmap = require("@google/maps").createClient({
  key: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyBfXwliPdMdFFkPNRGQByETe4sn-x06X_4"
});

const drivers = require("./data")

const redis = Redis.createClient()
redis.on("error", err => console.log(`REDIS Error: ${err.message}`))

const app = express()
app.set("view engine", "ejs")

const server = http.createServer(app)
const bayeux = new Faye.NodeAdapter({ mount: "/" })
bayeux.attach(server)

const faye = new Faye.Client("http://localhost:3000/")

function setLiveLocation(arg) {
  redis.set(`lat:${arg.id}`, arg.lat, "EX", 300) // becomes idle in 5 mins
  redis.set(`lng:${arg.id}`, arg.lng, "EX", 300) // becomes idle in 5 mins
}

faye.subscribe("/locupdate", setLiveLocation)
app.post("/locupdate", (req, res) => {
  setLiveLocation(req.body)
  res.send("OK")  // no waiting
})

app.get("/", (req, res) => {
  console.log("welcome........");
  res.render("whereami")
})
app.get("/within/:range/:lng/:lat", (req, res) => {
  const rQuery = []
  drivers.forEach((driver) => {
    rQuery.push(`lat:${driver.id}`)
    rQuery.push(`lng:${driver.id}`)
  })
  redis.mget(rQuery, (rError, rResponse) => {
    if (!rError) {
      const gQuery = {
        origins: [{ lat: req.params.lat, lng: req.params.lng }],
        destinations: []
      }
      for (let i = 0; i < rResponse.length; i += 2) {
        gQuery.destinations.push({ lat: rResponse[i], lng: rResponse[i + 1] })
      }
      gmap.distanceMatrix(gQuery, (gError, gResponse) => {
        if (!gError) {
          res.send(gResponse.json.results)
        } else {
          console.log("!!!!gError: ", gError);
          res.send({ error: true, reason: gError.message })
        }
      })
    } else {
      console.log("!!!!rError: ", rError);
      res.send({ error: true, reason: rError.message })      
    }
  });
})

app.listen(process.env.PORT || 3000)
