
const toolbar = document.getElementById('toolbar');
const canvas = document.getElementById('screenshotCanvas');
const ctx = canvas.getContext('2d');

// Создаем off-screen холст для буферизации
const bufferCanvas = document.createElement('canvas');
const bufferCtx = bufferCanvas.getContext('2d');

let drawMode = null;
let actions = [];
let startX = null, startY = null;
let activeToolButton = null;
let previewShape = null;
let backgroundImage = null;  // Для хранения исходного изображения

let isDragging = false;
let offsetX = 0;
let offsetY = 0;


// Обработчик начала перетаскивания
toolbar.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - toolbar.getBoundingClientRect().left;
    offsetY = e.clientY - toolbar.getBoundingClientRect().top;
});

// Обработчик перемещения
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;

    toolbar.style.left = `${x}px`;
    toolbar.style.top = `${y}px`;
});

// Обработчик завершения перетаскивания
document.addEventListener('mouseup', () => {
    isDragging = false;
});


// Устанавливаем начальные размеры холста и буфера
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('screenshot', (data) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            bufferCanvas.width = img.width;
            bufferCanvas.height = img.height;
            
            backgroundImage = img;  // Сохраняем исходное изображение
            bufferCtx.drawImage(img, 0, 0);  // Рисуем изображение на буферном холсте
            redraw();  // Первичная отрисовка
        };
        img.src = data.screenshot;
    });
});

// Обработка событий для инструментов
canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getMouseCoords(e);
    startX = x;
    startY = y;
    previewShape = null;
});

canvas.addEventListener('mousemove', (e) => {
    if (startX === null || startY === null || !drawMode) return;

    const { x, y } = getMouseCoords(e);

    // Очищаем основной холст и копируем данные с буферного
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bufferCanvas, 0, 0);

    // Отрисовка предварительной фигуры
    if (drawMode === 'arrow') {
        drawArrow(ctx, startX, startY, x, y);  // Прорисовка временной фигуры на основном холсте
        previewShape = { type: 'arrow', startX, startY, x, y };
    } else if (drawMode === 'line') {
        drawLine(ctx, startX, startY, x, y);
        previewShape = { type: 'line', startX, startY, x, y };
    } else if (drawMode === 'rect') {
        drawRect(ctx, startX, startY, x, y);
        previewShape = { type: 'rect', startX, startY, x, y };
    } else if (drawMode === 'blur') {
        applyBlur(ctx, startX, startY, x, y);
        previewShape = { type: 'blur', startX, startY, x, y };
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!drawMode || startX === null || startY === null) return;

    const { x, y } = getMouseCoords(e);

    // Отрисовка окончательной фигуры на буферном холсте
    if (drawMode === 'arrow') {
        drawArrow(bufferCtx, startX, startY, x, y);
        actions.push({ type: 'arrow', startX, startY, x, y });
    } else if (drawMode === 'line') {
        drawLine(bufferCtx, startX, startY, x, y);
        actions.push({ type: 'line', startX, startY, x, y });
    } else if (drawMode === 'rect') {
        drawRect(bufferCtx, startX, startY, x, y);
        actions.push({ type: 'rect', startX, startY, x, y });
    } else if (drawMode === 'text') {
        const text = prompt('Enter text:');
        if (text) {
            drawText(bufferCtx, startX, startY, text);
            actions.push({ type: 'text', startX, startY, text });
        }
    } else if (drawMode === 'blur') {
        applyBlur(bufferCtx, startX, startY, x, y);
        actions.push({ type: 'blur', startX, startY, x, y });
    }

    // Сбрасываем стартовые координаты
    startX = null;
    startY = null;

    // Перерисовка для обновления холста
    redraw();
});

// Переключение инструментов
document.getElementById('drawArrow').addEventListener('click', () => toggleTool('arrow', 'drawArrow'));
document.getElementById('drawLine').addEventListener('click', () => toggleTool('line', 'drawLine'));
document.getElementById('drawRect').addEventListener('click', () => toggleTool('rect', 'drawRect'));
document.getElementById('drawText').addEventListener('click', () => toggleTool('text', 'drawText'));
document.getElementById('drawBlur').addEventListener('click', () => toggleTool('blur', 'drawBlur'));
document.getElementById('deleteAll').addEventListener('click', () => deleteAll());
document.getElementById('undo').addEventListener('click', () => undo());
document.getElementById('saveImage').addEventListener('click', () => saveImage());

function toggleTool(tool, buttonId) {
    if (drawMode === tool) {
        drawMode = null;
        setActiveButton(null);
    } else {
        drawMode = tool;
        setActiveButton(buttonId);
    }
}

function setActiveButton(buttonId) {
    if (activeToolButton) {
        document.getElementById(activeToolButton).classList.remove('active');
    }
    if (buttonId) {
        document.getElementById(buttonId).classList.add('active');
        activeToolButton = buttonId;
    } else {
        activeToolButton = null;
    }
}

function getMouseCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Функции отрисовки
function drawArrow(context, x1, y1, x2, y2) {
    const headLength = 20;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    context.strokeStyle = 'red';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    context.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    context.lineTo(x2, y2);
    context.closePath();
    context.fillStyle = 'red';
    context.fill();
}

function drawLine(context, x1, y1, x2, y2) {
    context.strokeStyle = 'red';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
}

function drawRect(context, x1, y1, x2, y2) {
    context.strokeStyle = 'red';
    context.lineWidth = 3;
    context.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawText(context, x, y, text) {
    context.font = '20px Arial';
    context.fillStyle = 'red';
    context.fillText(text, x, y);
}

function applyBlur(context, x1, y1, x2, y2) {
    const width = x2 - x1;
    const height = y2 - y1;

    context.filter = 'blur(5px)';
    context.drawImage(canvas, x1, y1, width, height, x1, y1, width, height);
    context.filter = 'none';
}

// Перерисовка холста с учетом исходного изображения и всех действий
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0);  // Сначала отрисовываем исходное изображение
    ctx.drawImage(bufferCanvas, 0, 0);  // Затем буфер с действиями
}

function undo() {
    actions.pop();  // Удаляем последнее действие
    bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);  // Очищаем буфер
    bufferCtx.drawImage(backgroundImage, 0, 0);  // Перерисовываем исходное изображение

    // Применяем все оставшиеся действия
    actions.forEach(action => {
        if (action.type === 'arrow') drawArrow(bufferCtx, action.startX, action.startY, action.x, action.y);
        if (action.type === 'line') drawLine(bufferCtx, action.startX, action.startY, action.x, action.y);
        if (action.type === 'rect') drawRect(bufferCtx, action.startX, action.startY, action.x, action.y);
        if (action.type === 'text') drawText(bufferCtx, action.startX, action.startY, action.text);
        if (action.type === 'blur') applyBlur(bufferCtx, action.startX, action.startY, action.x, action.y);
    });
    redraw();
}

function deleteAll() {
    actions = [];  // Очищаем список действий
    bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);  // Очищаем буферный холст
    bufferCtx.drawImage(backgroundImage, 0, 0);  // Перерисовываем исходное изображение
    redraw();  // Перерисовываем основной холст
}

function saveImage() {
    const urlParams = new URLSearchParams(window.location.search);
    const sourceUrl = urlParams.get('sourceUrl');
    
    if (sourceUrl) {
        const safeSourceUrl = sourceUrl.replace(/[\/\#$%*&^><.,]/g, '_');
        const filename = `${safeSourceUrl}.png`;
        const imageURI = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageURI;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        console.error('sourceUrl not found in the URL');
    }
}
