let root = document.body.parentElement
let canvas = document.querySelector('canvas')
let controls = document.querySelector('.controls')
let widthInput = document.querySelector('#width')
let heightInput = document.querySelector('#height')
let colorInput = document.querySelector('#color')
let penButton = document.querySelector('#pen')
let eraserButton = document.querySelector('#eraser')

// default size should be safe for mobile phone
let defaultW = 260
let defaultH = 400
let W = widthInput.valueAsNumber || ((widthInput.value = defaultW), defaultW)
let H = heightInput.valueAsNumber || ((heightInput.value = defaultH), defaultH)
let ratio = 2

let penSize = 1
let eraserSize = 20

let color = colorInput.value
let drawSize = penSize

let offsetX = 0
let offsetY = 0
let context = canvas.getContext('2d')
let allData = []

let isReplay = false
setTimeout(resizeCanvas)

function resizeCanvas() {
    canvas.width = W / ratio
    canvas.height = H / ratio
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    controls.style.width = W + 'px'
    if (checkScrolling()) {
        setTimeout(resizeCanvas)
        return
    }
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

function sendWsData(message) {
    let data = JSON.stringify(message)
    allData.push(data)
    ws.send(data)
    if (message.type === 'clear') {
        allData = []
    }
}

function onData(data) {
    let message = JSON.parse(String(data))
    switch (message.type) {
        case 'point':
            drawPoint(message)
            break
        case 'line':
            drawLine(message)
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
            console.log('unknown message:', message)
    }
}

canvas.addEventListener('mousedown', event => {
    isMouseDown = true
    lastPoint = null
    localDraw(event)
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

colorInput.addEventListener('change', () => {
    color = colorInput.value
})

penButton.addEventListener('click', () => {
    penButton.style.display = 'none'
    eraserButton.style.display = 'initial'
    colorInput.style.display = 'initial'
    color = colorInput.value
    drawSize = penSize
})
eraserButton.addEventListener('click', () => {
    eraserButton.style.display = 'none'
    colorInput.style.display = 'none'
    penButton.style.display = 'initial'
    color = 'lightskyblue'
    drawSize = eraserSize
})
penButton.style.display = 'none'


function localDraw(event) {
    let x = (event.clientX - offsetX) / ratio
    let y = (event.clientY - offsetY) / ratio
    if (lastPoint) {
        let newPoint = {x, y}
        drawLine({from: lastPoint, to: newPoint, color, drawSize})
        sendWsData({type: 'line', from: lastPoint, to: newPoint, color, drawSize})
        lastPoint = newPoint
    } else {
        drawPoint({x, y, color, drawSize})
        sendWsData({type: 'point', x, y, color, drawSize})
        lastPoint = {x, y}
    }
}

function drawPoint({x, y, color, drawSize}) {
    context.fillStyle = color
    let r = drawSize / 2
    context.fillRect(x - r, y - r, r * 2, r * 2)
}

function drawLine({from, to, color, drawSize}) {
    context.strokeStyle = color
    context.lineWidth = drawSize
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
}

function localClearCanvas() {
    clearCanvas()
    sendWsData({type: 'clear'})
}

function maxHeight() {
    H = root.clientHeight - canvas.offsetTop - 10
    heightInput.value = H
    setTimeout(() => sendWsData({type: 'height', height: H}))
}

function maxWidth() {
    W = root.clientWidth - 20
    widthInput.value = W
    setTimeout(() => sendWsData({type: 'width', width: W}))
}

function maxCanvasSize() {
    canvas.style.width = screen.width + 'px'
    canvas.style.height = screen.height + 'px'
    maxHeight()
    maxWidth()
    resizeCanvas()
}

function clearCanvas() {
    context.clearRect(0, 0, W, H)
}

function checkScrolling() {
    let changed = false
    if (root.scrollHeight > root.clientHeight) {
        changed = true
        maxHeight(root)
    }
    if (root.scrollWidth > root.clientWidth) {
        changed = true
        maxWidth(root)
    }
    return changed
}
