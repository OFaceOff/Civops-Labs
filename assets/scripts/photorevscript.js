lucide.createIcons();

const ForensicEngine = {
    createPreview: (sourceImageData, maxDimension = 800) => {
        const w = sourceImageData.width;
        const h = sourceImageData.height;
        let ratio = 1;
        
        if (w > maxDimension || h > maxDimension) {
            ratio = Math.min(maxDimension / w, maxDimension / h);
        }

        const newW = Math.floor(w * ratio);
        const newH = Math.floor(h * ratio);

        const cvs = document.createElement('canvas');
        cvs.width = newW;
        cvs.height = newH;
        const ctx = cvs.getContext('2d');
        
        const tempCvs = document.createElement('canvas');
        tempCvs.width = w;
        tempCvs.height = h;
        tempCvs.getContext('2d').putImageData(sourceImageData, 0, 0);

        ctx.drawImage(tempCvs, 0, 0, newW, newH);
        return {
            imageData: ctx.getImageData(0, 0, newW, newH),
            scale: ratio
        };
    },

    filters: {
        channel: (data, p) => {
            if (p.channel === 'all') return;
            for (let i = 0; i < data.length; i += 4) {
                let val = 0;
                if (p.channel === 'r') val = data[i];
                else if (p.channel === 'g') val = data[i+1];
                else if (p.channel === 'b') val = data[i+2];
                data[i] = data[i+1] = data[i+2] = val;
            }
        },
        grayscale: (data, p) => {
            if (!p.grayscale) return;
            const lumR = 0.2126, lumG = 0.7152, lumB = 0.0722;
            for (let i = 0; i < data.length; i += 4) {
                const v = data[i]*lumR + data[i+1]*lumG + data[i+2]*lumB;
                data[i] = data[i+1] = data[i+2] = v;
            }
        },
        invert: (data, p) => {
            if (!p.invert) return;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i+1] = 255 - data[i+1];
                data[i+2] = 255 - data[i+2];
            }
        },
        exposure: (data, p) => {
            if (p.exposure === 1) return;
            for (let i = 0; i < data.length; i += 4) {
                data[i] *= p.exposure;
                data[i+1] *= p.exposure;
                data[i+2] *= p.exposure;
            }
        },
        gamma: (data, p) => {
            if (p.gamma === 1) return;
            const inv = 1 / p.gamma;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 * Math.pow(Math.max(0, data[i] / 255), inv);
                data[i+1] = 255 * Math.pow(Math.max(0, data[i+1] / 255), inv);
                data[i+2] = 255 * Math.pow(Math.max(0, data[i+2] / 255), inv);
            }
        },
        contrast: (data, p) => {
            if (p.contrast === 1) return;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = (((data[i] / 255) - 0.5) * p.contrast + 0.5) * 255;
                data[i+1] = (((data[i+1] / 255) - 0.5) * p.contrast + 0.5) * 255;
                data[i+2] = (((data[i+2] / 255) - 0.5) * p.contrast + 0.5) * 255;
            }
        },
        threshold: (data, p, w, h) => {
            if (p.threshold === -1) return;
            
            const lumR = 0.2126, lumG = 0.7152, lumB = 0.0722;

            if (p.thresholdMode === 'manual') {
                const t = p.threshold;
                for (let i = 0; i < data.length; i += 4) {
                    const l = data[i]*lumR + data[i+1]*lumG + data[i+2]*lumB;
                    const v = l >= t ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = v;
                }
            } else if (p.thresholdMode === 'adaptive') {
                let sum = 0;
                for (let i=0; i<data.length; i+=4) sum += (data[i]*lumR + data[i+1]*lumG + data[i+2]*lumB);
                const avg = sum / (data.length / 4);
                
                const factor = 0.5 + (p.threshold / 255); 
                const cut = avg * factor;

                for (let i = 0; i < data.length; i += 4) {
                    const l = data[i]*lumR + data[i+1]*lumG + data[i+2]*lumB;
                    const v = l >= cut ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = v;
                }
            }
        },
        spatial: (data, p, w, h) => {
            if (p.edgeAlgo === 'none' && p.sharpen === 0) return;
            
            const src = new Uint8ClampedArray(data);
            let kernel = null;
            let isSobel = false;

            if (p.edgeAlgo === 'sobel') {
                isSobel = true;
            } else if (p.edgeAlgo === 'laplacian') {
                kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
            } else if (p.sharpen > 0) {
                const s = p.sharpen * 0.2;
                kernel = [0, -s, 0, -s, 1 + 4*s, -s, 0, -s, 0];
            }

            if (isSobel) {
                const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        let rx = 0, gx_val = 0, bx = 0;
                        let ry = 0, gy_val = 0, by = 0;

                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * w + (x + kx)) * 4;
                                const kIdx = (ky + 1) * 3 + (kx + 1);
                                rx += src[idx] * gx[kIdx];
                                ry += src[idx] * gy[kIdx];
                            }
                        }
                        
                        const mag = Math.sqrt(rx*rx + ry*ry);
                        const i = (y * w + x) * 4;
                        data[i] = data[i+1] = data[i+2] = Math.min(255, mag);
                    }
                }

            } else if (kernel) {
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        let r = 0, g = 0, b = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * w + (x + kx)) * 4;
                                const wgt = kernel[(ky + 1) * 3 + (kx + 1)];
                                r += src[idx] * wgt;
                                g += src[idx+1] * wgt;
                                b += src[idx+2] * wgt;
                            }
                        }
                        const i = (y * w + x) * 4;
                        data[i] = Math.min(255, Math.max(0, r));
                        data[i+1] = Math.min(255, Math.max(0, g));
                        data[i+2] = Math.min(255, Math.max(0, b));
                    }
                }
            }
        }
    },

    process: function(imageData, params, pipeline) {
        const result = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        const data = result.data;
        const w = result.width;
        const h = result.height;

        pipeline.forEach(step => {
            if (step === 'spatial') this.filters.spatial(data, params, w, h);
            else if (step === 'threshold') this.filters.threshold(data, params, w, h);
            else if (this.filters[step]) this.filters[step](data, params);
        });

        return result;
    }
};

const state = {
    originalFull: null,
    originalPreview: null,
    currentOutput: null,
    scaleFactor: 1,
    width: 0,
    height: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    isProcessing: false,
    snapshots: [],
    params: {
        channel: 'all',
        grayscale: false,
        exposure: 1.0,
        gamma: 1.0,
        contrast: 1.0,
        sharpen: 0,
        thresholdMode: 'manual',
        threshold: -1,
        invert: false,
        edgeAlgo: 'none'
    },
    pipeline: ['channel', 'grayscale', 'invert', 'exposure', 'gamma', 'contrast', 'spatial', 'threshold']
};

const els = {
    fileInput: document.getElementById('fileInput'),
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d', { willReadFrequently: true }),
    wrapper: document.getElementById('canvasWrapper'),
    empty: document.getElementById('emptyState'),
    statusArea: document.getElementById('statusArea'),
    loadingIcon: document.getElementById('loadingIcon'),
    statusText: document.getElementById('statusText'),
    downloadBtn: document.getElementById('downloadBtn'),
    compareBtn: document.getElementById('compareBtn'),
    inputs: document.querySelectorAll('.range-slider'),
    resInfo: document.getElementById('res-info'),
    zoomInfo: document.getElementById('zoom-info'),
    modeInfo: document.getElementById('mode-info'),
    snapshotsGrid: document.getElementById('snapshotsGrid')
};

els.fileInput.addEventListener('change', handleUpload);

function updateStatus(msg, isLoading = false) {
    els.statusArea.classList.remove('hidden');
    els.statusText.innerText = msg;
    if (isLoading) els.loadingIcon.classList.remove('hidden');
    else els.loadingIcon.classList.add('hidden');
}

function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    updateStatus("CARREGANDO...", true);

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            try {
                const MAX_DIM = 4000;
                let w = img.width;
                let h = img.height;
                
                if (w > MAX_DIM || h > MAX_DIM) {
                    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
                    w = Math.floor(w * ratio);
                    h = Math.floor(h * ratio);
                }

                els.canvas.width = w;
                els.canvas.height = h;
                state.width = w;
                state.height = h;

                els.ctx.drawImage(img, 0, 0, w, h);
                state.originalFull = els.ctx.getImageData(0, 0, w, h);

                const previewObj = ForensicEngine.createPreview(state.originalFull, 800);
                state.originalPreview = previewObj.imageData;
                state.scaleFactor = previewObj.scale;

                els.empty.classList.add('hidden');
                els.wrapper.classList.remove('hidden');
                els.resInfo.innerText = `RES: ${w}x${h}px`;
                els.compareBtn.disabled = false;
                els.downloadBtn.disabled = false;

                applyPreset('reset');
                updateStatus("PRONTO");
            } catch (err) {
                alert("Erro ao processar imagem: " + err.message);
                updateStatus("ERRO");
            }
        };
        img.onerror = () => {
            alert("Arquivo de imagem inválido ou corrompido.");
            updateStatus("ERRO");
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

let renderTimeout;
let fullRenderTimeout;

function triggerRender(fullQuality = false) {
    if (!state.originalFull) return;

    if (renderTimeout) cancelAnimationFrame(renderTimeout);
    if (fullRenderTimeout) clearTimeout(fullRenderTimeout);

    updateStatus(fullQuality ? "RENDERIZANDO FULL..." : "PROCESSANDO...", true);
    els.modeInfo.innerText = fullQuality ? "MODE: FULL QUALITY" : "MODE: PREVIEW (FAST)";
    els.modeInfo.className = fullQuality ? "text-emerald-400 mt-1 font-bold" : "text-sky-500 mt-1";

    renderTimeout = requestAnimationFrame(() => {
        const source = fullQuality ? state.originalFull : state.originalPreview;
        const result = ForensicEngine.process(source, state.params, state.pipeline);
        
        if (!fullQuality) {
            createImageBitmap(result).then(bmp => {
                els.ctx.clearRect(0,0, state.width, state.height);
                els.ctx.imageSmoothingEnabled = false;
                els.ctx.drawImage(bmp, 0, 0, state.width, state.height);
                updateStatus("PRONTO");
            });
        } else {
            els.ctx.putImageData(result, 0, 0);
            state.currentOutput = result;
            updateStatus("PRONTO");
        }
    });

    if (!fullQuality) {
        fullRenderTimeout = setTimeout(() => {
            triggerRender(true);
        }, 600);
    }
}

els.inputs.forEach(input => {
    input.addEventListener('input', (e) => {
        const key = e.target.dataset.filter;
        state.params[key] = parseFloat(e.target.value);
        
        const label = document.getElementById(`val-${key}`);
        if(label) {
            if(key === 'threshold') label.innerText = state.params[key] === -1 ? 'OFF' : state.params[key];
            else label.innerText = state.params[key];
        }
        
        triggerRender(false);
    });
});

const bindInput = (id, key, isBool = false) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', e => {
        state.params[key] = isBool ? e.target.checked : e.target.value;
        triggerRender(false);
    });
};

bindInput('check-grayscale', 'grayscale', true);
bindInput('check-invert', 'invert', true);
bindInput('threshold-mode', 'thresholdMode');

document.querySelectorAll('.channel-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('.channel-btn').forEach(b => {
            b.classList.remove('border-sky-500', 'bg-slate-800');
            b.classList.add('border-slate-700');
        });
        e.target.classList.add('border-sky-500', 'bg-slate-800');
        state.params.channel = e.target.dataset.channel;
        triggerRender(false);
    });
});

document.querySelectorAll('.edge-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('.edge-btn').forEach(b => {
            b.classList.remove('active', 'btn-active');
            b.classList.add('text-slate-500');
        });
        e.target.classList.add('active', 'btn-active');
        e.target.classList.remove('text-slate-500');
        state.params.edgeAlgo = e.target.dataset.edge;
        triggerRender(false);
    });
});

const showOriginal = () => {
    if(!state.originalFull) return;
    els.ctx.putImageData(state.originalFull, 0, 0);
    els.modeInfo.innerText = "MODE: ORIGINAL";
    els.modeInfo.className = "text-amber-500 mt-1 font-bold animate-pulse";
};

const showProcessed = () => {
    if(!state.originalFull) return;
    triggerRender(false);
};

els.compareBtn.addEventListener('mousedown', showOriginal);
els.compareBtn.addEventListener('mouseup', showProcessed);
els.compareBtn.addEventListener('mouseleave', showProcessed);
els.compareBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showOriginal(); });
els.compareBtn.addEventListener('touchend', (e) => { e.preventDefault(); showProcessed(); });

els.downloadBtn.addEventListener('click', () => {
    if(!state.originalFull) return;
    triggerRender(true);
    setTimeout(() => {
        const link = document.createElement('a');
        link.download = `CIVOPS_EVIDENCIA_${Date.now()}.png`;
        link.href = els.canvas.toDataURL();
        link.click();
    }, 100);
});

function applyPreset(name) {
    const defaults = {
        channel: 'all', grayscale: false, exposure: 1, gamma: 1, contrast: 1, 
        sharpen: 0, thresholdMode: 'manual', threshold: -1, invert: false, edgeAlgo: 'none'
    };
    
    const stdPipeline = ['channel', 'grayscale', 'invert', 'exposure', 'gamma', 'contrast', 'spatial', 'threshold'];

    let newParams = { ...defaults };
    let newPipeline = [...stdPipeline];

    switch(name) {
        case 'text_paper':
            Object.assign(newParams, {
                exposure: 0.9,
                gamma: 1.4,
                contrast: 1.8,
                grayscale: true,
                thresholdMode: 'adaptive',
                threshold: 120
            });
            break;
        case 'faint_writing':
            Object.assign(newParams, {
                channel: 'b',
                exposure: 0.8,
                gamma: 0.9,
                contrast: 2.0,
                edgeAlgo: 'none'
            });
            break;
        case 'erased_ink':
            Object.assign(newParams, {
                invert: true,
                gamma: 2.5,
                contrast: 3.0,
                grayscale: true
            });
            break;
        case 'invisible_mark':
            Object.assign(newParams, {
                exposure: 0.6,
                gamma: 0.4,
                contrast: 4.0,
                edgeAlgo: 'sobel'
            });
            break;
        case 'watermark':
            Object.assign(newParams, {
                channel: 'b',
                contrast: 1.5,
                gamma: 1.2,
                invert: true
            });
            break;
    }

    Object.assign(state.params, newParams);
    state.pipeline = newPipeline;

    syncUI();
    triggerRender(false);
}

function syncUI() {
    const p = state.params;
    document.querySelector('[data-filter="exposure"]').value = p.exposure;
    document.querySelector('[data-filter="gamma"]').value = p.gamma;
    document.querySelector('[data-filter="contrast"]').value = p.contrast;
    document.querySelector('[data-filter="sharpen"]').value = p.sharpen;
    document.querySelector('[data-filter="threshold"]').value = p.threshold;
    
    document.getElementById('check-grayscale').checked = p.grayscale;
    document.getElementById('check-invert').checked = p.invert;
    document.getElementById('threshold-mode').value = p.thresholdMode;

    document.getElementById('val-exposure').innerText = p.exposure;
    document.getElementById('val-gamma').innerText = p.gamma;
    document.getElementById('val-contrast').innerText = p.contrast;
    document.getElementById('val-sharpen').innerText = p.sharpen;
    document.getElementById('val-threshold').innerText = p.threshold === -1 ? 'OFF' : p.threshold;

    updateButtonState('.channel-btn', 'data-channel', p.channel, 'border-sky-500', 'bg-slate-800', 'border-slate-700');
    updateButtonState('.edge-btn', 'data-edge', p.edgeAlgo, 'active', 'btn-active', 'text-slate-500');
}

function updateButtonState(selector, dataAttr, value, activeClass1, activeClass2, inactiveClass) {
    document.querySelectorAll(selector).forEach(b => {
        b.classList.remove(activeClass1, activeClass2);
        if (inactiveClass) b.classList.add(inactiveClass);
        
        if(b.getAttribute(dataAttr) === value) {
            b.classList.add(activeClass1, activeClass2);
            if (inactiveClass) b.classList.remove(inactiveClass);
        }
    });
}

function toggleSnapshotPanel(show) {
    const panel = document.getElementById('snapshotsPanel');
    const controls = document.getElementById('controlsPanel');
    if(show) {
        panel.classList.remove('hidden');
        controls.classList.add('hidden');
    } else {
        panel.classList.add('hidden');
        controls.classList.remove('hidden');
    }
}

function takeSnapshot() {
    if(!state.originalFull) return;
    
    const thumbUrl = els.canvas.toDataURL('image/jpeg', 0.3);
    const timestamp = new Date().toLocaleTimeString();
    const id = Date.now();
    const savedParams = JSON.parse(JSON.stringify(state.params));

    const div = document.createElement('div');
    div.className = "bg-slate-800 p-2 rounded border border-slate-700 snapshot-thumb relative group animate-fade-in";
    div.innerHTML = `
        <div class="h-24 bg-black mb-2 overflow-hidden rounded border border-slate-600">
            <img src="${thumbUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition">
        </div>
        <div class="flex justify-between items-center">
            <span class="text-[10px] text-sky-500 font-mono">${timestamp}</span>
            <button class="text-xs bg-sky-900/50 hover:bg-sky-600 text-sky-200 px-2 py-1 rounded" onclick="loadSnapshot(${id})">LOAD</button>
        </div>
    `;
    
    state.snapshots.push({ id, params: savedParams, pipeline: [...state.pipeline] });
    
    if(els.snapshotsGrid.children[0]?.tagName === 'P') els.snapshotsGrid.innerHTML = '';
    els.snapshotsGrid.prepend(div);
    toggleSnapshotPanel(true);
}

window.loadSnapshot = function(id) {
    const snap = state.snapshots.find(s => s.id === id);
    if(snap) {
        Object.assign(state.params, snap.params);
        state.pipeline = [...snap.pipeline];
        syncUI();
        triggerRender(false);
        toggleSnapshotPanel(false);
    }
};

const container = document.querySelector('.canvas-bg');

container.addEventListener('mousedown', e => {
    if(state.originalFull) {
        state.isDragging = true;
        state.lastMouse = { x: e.clientX, y: e.clientY };
        els.wrapper.style.cursor = 'grabbing';
    }
});
window.addEventListener('mouseup', () => {
    state.isDragging = false;
    if(els.wrapper) els.wrapper.style.cursor = 'move';
});
window.addEventListener('mousemove', e => {
    if(!state.isDragging) return;
    const dx = e.clientX - state.lastMouse.x;
    const dy = e.clientY - state.lastMouse.y;
    state.pan.x += dx / state.zoom;
    state.pan.y += dy / state.zoom;
    state.lastMouse = { x: e.clientX, y: e.clientY };
    updateTransform();
});
container.addEventListener('wheel', e => {
    if(!state.originalFull) return;
    e.preventDefault();
    adjustZoom(e.deltaY > 0 ? -0.1 : 0.1);
});

function updateTransform() {
    els.wrapper.style.transform = `scale(${state.zoom}) translate(${state.pan.x}px, ${state.pan.y}px)`;
}
function adjustZoom(delta) {
    state.zoom = Math.max(0.1, state.zoom + delta);
    els.zoomInfo.innerText = `ZOOM: ${Math.round(state.zoom * 100)}%`;
    updateTransform();
}
function resetZoom() {
    state.zoom = 1;
    state.pan = {x:0, y:0};
    els.zoomInfo.innerText = `ZOOM: 100%`;
    updateTransform();
}