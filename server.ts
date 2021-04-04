import express from 'express'
import {Server as HttpServer} from 'http'
import {Data, Server as WsServer} from 'ws'
import os from 'os'

let app = express()
let server = new HttpServer(app)
let wss = new WsServer({server})

let allData: Data[] = []
let width: number | undefined
let height: number | undefined

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
        let message = JSON.parse(String(data))
        switch (message.type) {
            case 'width':
                width = message.width
                break
            case 'height':
                height = message.height
                break
            case 'clear':
                allData = []
                allData.push(JSON.stringify({type: 'clear'}))
                if (width) allData.push(JSON.stringify({type: 'width', width}))
                if (height) allData.push(JSON.stringify({type: 'height', height}))
                break
        }
    })
})

app.use(express.static('public'))

let PORT = +process.env.PORT! || 8100
server.listen(PORT, () => {
    Object.entries(os.networkInterfaces()).forEach(([iface, addresses]) =>
        addresses?.forEach(({address, family}) => {
            if (family === 'IPv6') return
            console.log(`listening on http://${address}:${PORT} (${iface})`)
        }))
})
