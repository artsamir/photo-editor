// Initialize Fabric.js canvas
const canvas = new fabric.Canvas('editingCanvas', {
    width: 800,
    height: 600,
    backgroundColor: '#fff'
});
let cropper;
let history = [];
let historyIndex = -1;

function saveState() {
    history = history.slice(0, historyIndex + 1);
    history.push(canvas.toJSON());
    historyIndex++;
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// Helper: Load image to preview box
function loadImageToPreview(file) {
    const previewBox = document.getElementById('previewBox');
    const previewImage = document.getElementById('previewImage');
    const fitSelect = document.getElementById('fitSelect');

    previewImage.src = URL.createObjectURL(file);
    previewImage.onload = () => {
        const isPortrait = previewImage.height > previewImage.width;
        previewBox.style.width = isPortrait ? '400px' : '600px';
        previewBox.style.height = isPortrait ? '600px' : '400px';
        previewBox.style.display = 'flex';
        document.getElementById('dropArea').style.display = 'none';
        previewImage.style.objectFit = fitSelect.value;
    };
}

// Helper: Add image to canvas from preview
function addToCanvas() {
    const previewImage = document.getElementById('previewImage');
    const fitSelect = document.getElementById('fitSelect').value;
    const img = new Image();
    img.src = previewImage.src;
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Scale image to fit canvas fully
        if (fitSelect === 'contain') {
            const aspectRatio = width / height;
            if (width > canvasWidth || height > canvasHeight) {
                if (aspectRatio > canvasWidth / canvasHeight) {
                    width = canvasWidth;
                    height = width / aspectRatio;
                } else {
                    height = canvasHeight;
                    width = height * aspectRatio;
                }
            }
        } else { // fill
            width = canvasWidth;
            height = canvasHeight;
        }

        const fabricImg = new fabric.Image(img, {
            left: 0,
            top: 0,
            width: width,
            height: height,
            scaleX: canvasWidth / width,
            scaleY: canvasHeight / height,
            selectable: true,
            hasControls: true
        });

        // Ensure the full image fits within the canvas
        fabricImg.scaleToWidth(canvasWidth, true);
        fabricImg.scaleToHeight(canvasHeight, true);
        if (fitSelect === 'contain') {
            fabricImg.scale(Math.min(canvasWidth / img.width, canvasHeight / img.height));
        }

        canvas.clear();
        canvas.add(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.centerObject(fabricImg);
        canvas.renderAll();
        document.getElementById('previewBox').style.display = 'none';
        saveState();
        updateLayers();
    };
}

// Update Layers List
function updateLayers() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    canvas.getObjects().forEach((obj, index) => {
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.innerHTML = `
            <i class="fas fa-lock ${obj.lockMovementX ? 'locked' : ''}" onclick="toggleLock(${index})"></i>
            <span>Layer ${index + 1}</span>
            <input type="range" min="0" max="1" step="0.1" value="${obj.opacity || 1}" onchange="setOpacity(${index}, this.value)">
            <i class="fas fa-copy" onclick="copyLayer(${index})"></i>
            <i class="fas fa-trash" onclick="deleteLayer(${index})"></i>
            <i class="fas fa-arrow-up" onclick="moveLayerUp(${index})"></i>
            <i class="fas fa-arrow-down" onclick="moveLayerDown(${index})"></i>
        `;
        layersList.appendChild(div);
    });
}

function toggleLock(index) {
    const obj = canvas.getObjects()[index];
    obj.lockMovementX = !obj.lockMovementX;
    obj.lockMovementY = !obj.lockMovementY;
    canvas.renderAll();
    updateLayers();
}

function setOpacity(index, value) {
    const obj = canvas.getObjects()[index];
    obj.opacity = parseFloat(value);
    canvas.renderAll();
    saveState();
}

function copyLayer(index) {
    const obj = canvas.getObjects()[index];
    obj.clone((cloned) => {
        cloned.set({ left: cloned.left + 20, top: cloned.top + 20 });
        canvas.add(cloned);
        canvas.renderAll();
        saveState();
        updateLayers();
    });
}

function deleteLayer(index) {
    const obj = canvas.getObjects()[index];
    canvas.remove(obj);
    canvas.renderAll();
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    saveState();
    updateLayers();
}

function moveLayerUp(index) {
    if (index < canvas.getObjects().length - 1) {
        canvas.getObjects()[index].moveTo(index + 1);
        canvas.renderAll();
        saveState();
        updateLayers();
    }
}

function moveLayerDown(index) {
    if (index > 0) {
        canvas.getObjects()[index].moveTo(index - 1);
        canvas.renderAll();
        saveState();
        updateLayers();
    }
}

// Dynamic Sub-tool Positioning and Toolbox Expansion
document.querySelectorAll('.tool').forEach(tool => {
    const subTools = tool.querySelector('.sub-tools');
    if (subTools) {
        tool.addEventListener('mouseenter', () => {
            const toolbox = document.getElementById('toolbox');
            const rect = tool.getBoundingClientRect();
            const subRect = subTools.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (subRect.width > 200) {
                toolbox.classList.add('expanded');
            }

            if (rect.right + subRect.width > viewportWidth) {
                subTools.style.left = 'auto';
                subTools.style.right = '100%';
            } else {
                subTools.style.left = '100%';
                subTools.style.right = 'auto';
            }

            if (rect.bottom + subRect.height > viewportHeight) {
                subTools.style.top = 'auto';
                subTools.style.bottom = '0';
            } else {
                subTools.style.top = '0';
                subTools.style.bottom = 'auto';
            }
        });

        tool.addEventListener('mouseleave', () => {
            const toolbox = document.getElementById('toolbox');
            toolbox.classList.remove('expanded');
        });

        subTools.querySelectorAll('.sub-tool').forEach(subTool => {
            subTool.addEventListener('click', () => {
                const toolbox = document.getElementById('toolbox');
                toolbox.classList.remove('expanded');
            });
        });
    }
});

// Drag-and-Drop Upload
const dropArea = document.getElementById('dropArea');
const uploadInput = document.getElementById('upload');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageToPreview(file);
});

document.getElementById('uploadTool').addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImageToPreview(file);
});

// Add to Canvas Button
document.getElementById('addToCanvas').addEventListener('click', addToCanvas);

// Fit Select Change
document.getElementById('fitSelect').addEventListener('change', (e) => {
    document.getElementById('previewImage').style.objectFit = e.target.value;
});

// Crop Tool
document.getElementById('cropTool').addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || !activeObject.isType('image')) return;

    if (!cropper) {
        const imgElement = activeObject.getElement();
        cropper = new Cropper(imgElement, {
            aspectRatio: NaN,
            viewMode: 1,
            movable: true,
            zoomable: true,
            scalable: true,
            ready: () => {
                canvas.discardActiveObject();
                canvas.renderAll();
            }
        });
    } else {
        const croppedCanvas = cropper.getCroppedCanvas();
        fabric.Image.fromURL(croppedCanvas.toDataURL(), (img) => {
            img.set({
                left: activeObject.left,
                top: activeObject.top,
                width: croppedCanvas.width,
                height: croppedCanvas.height,
                selectable: true,
                hasControls: true
            });
            canvas.remove(activeObject);
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            cropper.destroy();
            cropper = null;
            saveState();
            updateLayers();
        });
    }
});

// Erase Tool
document.getElementById('eraseTool').addEventListener('click', () => {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = 'rgba(0,0,0,0)';
    canvas.freeDrawingBrush.width = 20;
    canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
});

// Draw Tool (Pen & Brush Sub-tools)
document.querySelectorAll('#drawSubTools .sub-tool').forEach(tool => {
    tool.addEventListener('click', () => {
        const type = tool.dataset.type;
        const size = parseInt(tool.dataset.size);
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = size;
        canvas.freeDrawingBrush.globalCompositeOperation = 'source-over';
    });
});

// Text Tool
document.getElementById('textTool').addEventListener('click', () => {
    const text = new fabric.IText('Edit Me', {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontSize: 20,
        fill: '#000000',
        selectable: true,
        hasControls: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.isDrawingMode = false;
    saveState();
    updateLayers();
});

// Shape Tool (Sub-tools)
document.querySelectorAll('#shapeSubTools .sub-tool').forEach(tool => {
    tool.addEventListener('click', () => {
        const shapeType = tool.dataset.shape;
        let shape;
        switch (shapeType) {
            case 'circle': shape = new fabric.Circle({ radius: 50, fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'square': shape = new fabric.Rect({ width: 100, height: 100, fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'rectangle': shape = new fabric.Rect({ width: 150, height: 100, fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'oval': shape = new fabric.Ellipse({ rx: 75, ry: 50, fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'star': shape = new fabric.Polygon([{x:0,y:-50},{x:20,y:-20},{x:50,y:0},{x:20,y:20},{x:0,y:50},{x:-20,y:20},{x:-50,y:0},{x:-20,y:-20}], { fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'triangle': shape = new fabric.Triangle({ width: 100, height: 100, fill: '#1abc9c', left: 100, top: 100 }); break;
            case 'arrow': shape = new fabric.Path('M0,0h100l-30,30h-70z', { fill: '#1abc9c', left: 100, top: 100 }); break;
            default: return;
        }
        shape.set({ selectable: true, hasControls: true });
        canvas.add(shape);
        canvas.renderAll();
        saveState();
        updateLayers();
    });
});

// Effect Tool (Sub-tools)
document.querySelectorAll('#effectSubTools .sub-tool').forEach(tool => {
    tool.addEventListener('click', () => {
        const effect = tool.dataset.effect;
        Caman('#editingCanvas', function () {
            switch (effect) {
                case 'fold': this.noise(10).render(); break;
                case 'dust': this.noise(20).render(); break;
                case 'shadow': this.brightness(-20).contrast(20).render(); break;
                case 'ripple': this.sinCity().render(); break;
                case 'artistic': this.posterize(10).render(); break;
                case 'color': this.vibrance(50).render(); break;
                case 'border': this.stackBlur(5).render(); break;
                default: return;
            }
            saveState();
        });
    });
});

// Zoom In/Out
document.getElementById('zoomInTool').addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        activeObject.scale(activeObject.scaleX * 1.1);
        canvas.renderAll();
        saveState();
    } else {
        canvas.setZoom(canvas.getZoom() * 1.1);
    }
});

document.getElementById('zoomOutTool').addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        activeObject.scale(activeObject.scaleX * 0.9);
        canvas.renderAll();
        saveState();
    } else {
        canvas.setZoom(canvas.getZoom() * 0.9);
    }
});

// Adjust Tool (Sub-tools)
document.getElementById('brightnessSlider').addEventListener('input', (e) => {
    Caman('#editingCanvas', function () {
        this.revert(false);
        this.brightness(parseInt(e.target.value)).render();
        saveState();
    });
});

document.getElementById('contrastSlider').addEventListener('input', (e) => {
    Caman('#editingCanvas', function () {
        this.revert(false);
        this.contrast(parseInt(e.target.value)).render();
        saveState();
    });
});

document.getElementById('shadowSlider').addEventListener('input', (e) => {
    Caman('#editingCanvas', function () {
        this.revert(false);
        this.brightness(-parseInt(e.target.value)).render();
        saveState();
    });
});

document.getElementById('hueSlider').addEventListener('input', (e) => {
    Caman('#editingCanvas', function () {
        this.revert(false);
        this.hue(parseInt(e.target.value)).render();
        saveState();
    });
});

document.getElementById('saturationSlider').addEventListener('input', (e) => {
    Caman('#editingCanvas', function () {
        this.revert(false);
        this.saturation(parseInt(e.target.value)).render();
        saveState();
    });
});

// Undo/Redo
document.getElementById('undoTool').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => {
            canvas.renderAll();
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            updateLayers();
        });
    }
});

document.getElementById('redoTool').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        canvas.loadFromJSON(history[historyIndex], () => {
            canvas.renderAll();
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            updateLayers();
        });
    }
});

// Resize Image
document.getElementById('resizeBtn').addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        const width = parseInt(document.getElementById('widthInput').value) || activeObject.width;
        const height = parseInt(document.getElementById('heightInput').value) || activeObject.height;
        const angle = parseInt(document.getElementById('angleInput').value) || 0;
        const skew = parseInt(document.getElementById('skewInput').value) || 0;
        activeObject.set({
            width: width,
            height: height,
            angle: angle,
            skewX: skew,
            scaleX: 1,
            scaleY: 1
        });
        canvas.renderAll();
        saveState();
        updateLayers();
    }
});

// Save Image
document.getElementById('saveTool').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Reset drawing mode
canvas.on('mouse:down', () => {
    if (canvas.isDrawingMode) canvas.isDrawingMode = false;
});

canvas.on('object:modified', saveState);