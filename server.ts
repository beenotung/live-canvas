import express from 'express'
import {Server as HttpServer} from 'http'
import {Data, Server as WsServer} from 'ws'

let app = express()
let server = new HttpServer(app)
let wss = new WsServer({server})

let allData: Data[] = []

wss.on('connection', ws => {
    allData.forEach(data => {
        ws.send(data)
    })
    ws.on('message', data => {
        allData.push(data)
        wss.clients.forEach(peer => {
            if (peer === ws) return
            peer.send(data)
        })
    })
})

app.use(express.static('public'))

let PORT = +process.env.PORT! || 8100
server.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`)
})
