const http = require("http")
const Faye = require("faye")
const Redis = require("redis")
const express = require("express")

const redis = Redis.createClient()
redis.on("error", err => console.log(`REDIS Error: ${err.message}`))

const app = express()
const server = http.createServer(app)

const bayeux = new Faye.NodeAdapter({ mount: "/" })
bayeux.attach(server)

const faye = new Faye.Client("http://localhost:8000")

function setLiveLocation(arg) {
  redis.set(`lng:${arg.clientId}`, arg.lng, "EX", 10)
  redis.set(`lat:${arg.clientId}`, arg.lat, "EX", 10)
}

faye.subscribe("/locupdate", setLiveLocation)
app.post("/locupdate", (req, res) => {
  setLiveLocation(req.body)
  res.send("OK")  // no waiting
})

app.get("/near/:range/:lng?/:lat?", (res, res) => {
  
})

server.listen(process.env.PORT || 3000)
