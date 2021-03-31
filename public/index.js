let canvas = document.querySelector('canvas')
let controls = document.querySelector('.controls')
let widthInput = document.querySelector('#width')
let heightInput = document.querySelector('#height')

// default size should be safe for mobile phone
let defaultW = 260
let defaultH = 400
let W = widthInput.valueAsNumber || ((widthInput.value = defaultW), defaultW)
let H = heightInput.valueAsNumber || ((heightInput.value = defaultH), defaultH)
let ratio = 2

let offsetX = 0
let offsetY = 0
let context = canvas.getContext('2d')
let allData = []

let isReplay = false
resizeCanvas()

function resizeCanvas() {
    canvas.width = W / ratio
    canvas.height = H / ratio
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    controls.style.width = W + 'px'
    let rect = canvas.getBoundingClientRect()
    offsetX = rect.x
    offsetY = rect.y
    context = canvas.getContext('2d')
    isReplay = true
    allData.forEach(data => onData(data))
    isReplay = false
}

let isMouseDown = false
let lastPoint = {x: 0, y: 0}

let defaultReconnectInterval = 250
let reconnectInterval = defaultReconnectInterval
let wsUrl = location.origin.replace('http', 'ws')
let ws = connect()

function connect() {
    let ws = new WebSocket(wsUrl)
    ws.addEventListener('open', () => {
        reconnectInterval = defaultReconnectInterval
    })
    ws.addEventListener('message', event => {
        onData(event.data)
        allData.push(event.data)
    })
    ws.addEventListener('close', () => {
        setTimeout(() => {
            ws = connect()
        }, reconnectInterval)
        reconnectInterval *= 1.5
    })
    return ws
}

function sendWsData(data) {
    data = JSON.stringify(data)
    allData.push(data)
    ws.send(data)
}

function onData(data) {
    console.log('data:', data)
    let message = JSON.parse(String(data))
    switch (message.type) {
        case 'point':
            drawPoint(message.x, message.y)
            break
        case 'line':
            drawLine(message.from, message.to)
            break
        case 'clear':
            clearCanvas()
            break
        case 'width':
            if (isReplay) break
            W = message.width
            widthInput.value = W
            resizeCanvas()
            break
        case 'height':
            if (isReplay) break
            H = message.height
            heightInput.value = H
            resizeCanvas()
            break
        default:
            console.log('message:', message)
    }
}

canvas.addEventListener('mousedown', event => {
    isMouseDown = true
    lastPoint = null
})
canvas.addEventListener('mouseup', event => {
    isMouseDown = false
    lastPoint = null
})
canvas.addEventListener('mousemove', event => {
    if (!isMouseDown) return
    localDraw(event)
})
canvas.addEventListener('click', event => {
    lastPoint = null
    localDraw(event)
})
canvas.addEventListener('touchstart', event => {
    let touch = event.touches[0]
    let mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
}, false)
canvas.addEventListener('touchend', event => {
    let mouseEvent = new MouseEvent('mouseup', {})
    canvas.dispatchEvent(mouseEvent)
}, false)
canvas.addEventListener('touchmove', event => {
    let touch = event.touches[0]
    let mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
}, false)

widthInput.addEventListener('change', event => {
    W = widthInput.valueAsNumber
    resizeCanvas()
    sendWsData({type: 'width', width: W})
})
heightInput.addEventListener('change', event => {
    H = heightInput.valueAsNumber
    resizeCanvas()
    sendWsData({type: 'height', height: H})
})

function localDraw(event) {
    let x = (event.clientX - offsetX) / ratio
    let y = (event.clientY - offsetY) / ratio
    if (lastPoint) {
        let newPoint = {x, y}
        drawLine(lastPoint, newPoint)
        sendWsData({type: 'line', from: lastPoint, to: newPoint})
        lastPoint = newPoint
    } else {
        drawPoint(x, y)
        sendWsData({type: 'point', x, y})
        lastPoint = {x, y}
    }
}

function drawPoint(x, y) {
    context.fillStyle = 'black'
    context.fillRect(x, y, 1, 1)
}

function drawLine(from, to) {
    context.strokeStyle = 'black'
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
}

function localClearCanvas() {
    clearCanvas()
    sendWsData({type: 'clear'})
}

function clearCanvas() {
    context.clearRect(0, 0, W, H)
}
