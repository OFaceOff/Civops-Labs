lucide.createIcons();

const appState = {
    srcImage: null,
    zoomLevel: 1,
    offset: { x: 0, y: 0 },
    dragging: false,
    mousePos: { x: 0, y: 0 },
    params: {
        exposure: 1,
        contrast: 1,
        brightness: 0,
        gamma: 1,
        threshold: -1,
        sharpen: 0,
        channel: 'all',
        invert: false,
        edge: false
    }
};

const dom = {
    input: document.getElementById('fileInput'),
    canvas: document.getElementById('mainCanvas'),
    empty: document.getElementById('emptyState'),
    wrapper: document.getElementById('canvasWrapper'),
    resInfo: document.getElementById('resolution-display'),
    download: document.getElementById('downloadBtn'),
    sliders: document.querySelectorAll('.range-slider'),
    channels: document.querySelectorAll('.channel-btn'),
    sidebar: document.getElementById('sidebar'),
    sidebarBtn: document.getElementById('toggleSidebar'),
    container: document.querySelector('.canvas-container')
};

const ctx = dom.canvas.getContext('2d', { willReadFrequently: true });

dom.input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width;
            let h = img.height;
            const max = 4000;

            if (w > max || h > max) {
                const ratio = Math.min(max / w, max / h);
                w *= ratio;
                h *= ratio;
            }

            dom.canvas.width = w;
            dom.canvas.height = h;
            
            ctx.drawImage(img, 0, 0, w, h);
            appState.srcImage = ctx.getImageData(0, 0, w, h);
            
            dom.empty.classList.add('hidden');
            dom.wrapper.classList.remove('hidden');
            dom.resInfo.innerText = `${Math.floor(w)} x ${Math.floor(h)} PX`;
            
            applyPreset('reset');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

dom.sliders.forEach(sl => {
    sl.addEventListener('input', (e) => {
        const key = e.target.dataset.filter;
        const val = parseFloat(e.target.value);
        appState.params[key] = val;
        
        const label = document.getElementById(`val-${key}`);
        if (label) {
            label.innerText = key === 'threshold' && val === -1 ? 'OFF' : val;
        }

        requestAnimationFrame(processImage);
    });
});

dom.channels.forEach(btn => {
    btn.addEventListener('click', (e) => {
        dom.channels.forEach(b => {
            b.classList.remove('active', 'bg-slate-800', 'text-slate-400', 'border-slate-600');
            b.classList.add('bg-slate-900');
        });
        
        e.target.classList.remove('bg-slate-900');
        e.target.classList.add('active', 'bg-slate-800', 'text-slate-400', 'border-slate-600');
        
        appState.params.channel = e.target.dataset.channel;
        processImage();
    });
});

dom.sidebarBtn.addEventListener('click', () => {
    dom.sidebar.classList.toggle('-translate-x-full');
});

dom.download.addEventListener('click', () => {
    if (!appState.srcImage) return;
    const link = document.createElement('a');
    link.download = 'evidencia-analisada.png';
    link.href = dom.canvas.toDataURL();
    link.click();
});

function processImage() {
    if (!appState.srcImage) return;

    const w = appState.srcImage.width;
    const h = appState.srcImage.height;
    
    const output = new ImageData(
        new Uint8ClampedArray(appState.srcImage.data),
        w,
        h
    );
    
    const d = output.data;
    const len = d.length;
    const p = appState.params;
    
    for (let i = 0; i < len; i += 4) {
        let r = d[i];
        let g = d[i+1];
        let b = d[i+2];

        if (p.channel !== 'all') {
            if (p.channel === 'r') { g = r; b = r; }
            else if (p.channel === 'g') { r = g; b = g; }
            else if (p.channel === 'b') { r = b; g = b; }
        }

        if (p.invert) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
        }

        r *= p.exposure;
        g *= p.exposure;
        b *= p.exposure;

        r += p.brightness;
        g += p.brightness;
        b += p.brightness;

        if (p.contrast !== 1) {
            r = (r - 128) * p.contrast + 128;
            g = (g - 128) * p.contrast + 128;
            b = (b - 128) * p.contrast + 128;
        }

        if (p.gamma !== 1) {
            r = 255 * Math.pow(r / 255, 1 / p.gamma);
            g = 255 * Math.pow(g / 255, 1 / p.gamma);
            b = 255 * Math.pow(b / 255, 1 / p.gamma);
        }

        if (p.threshold > -1) {
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const val = lum >= p.threshold ? 255 : 0;
            r = val;
            g = val;
            b = val;
        }

        d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        d[i+1] = g < 0 ? 0 : g > 255 ? 255 : g;
        d[i+2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    if (p.edge) {
        applyKernel(output, w, h, [
            -1, -1, -1,
            -1,  8, -1,
            -1, -1, -1
        ]);
    } else if (p.sharpen > 0) {
        const s = p.sharpen;
        applyKernel(output, w, h, [
            0, -1 * (s/10), 0,
            -1 * (s/10), 1 + 4*(s/10), -1 * (s/10),
            0, -1 * (s/10), 0
        ]);
    }

    ctx.putImageData(output, 0, 0);
}

function applyKernel(imgData, w, h, kernel) {
    const side = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(side / 2);
    const src = imgData.data;
    const buf = new Uint8ClampedArray(src); 

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0;
            
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = y + cy - half;
                    const scx = x + cx - half;
                    
                    if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                        const off = (scy * w + scx) * 4;
                        const wt = kernel[cy * side + cx];
                        r += src[off] * wt;
                        g += src[off + 1] * wt;
                        b += src[off + 2] * wt;
                    }
                }
            }
            
            const dst = (y * w + x) * 4;
            buf[dst] = r;
            buf[dst + 1] = g;
            buf[dst + 2] = b;
        }
    }
    
    for (let i = 0; i < src.length; i++) {
        imgData.data[i] = buf[i];
    }
}

function applyPreset(name) {
    appState.params = {
        exposure: 1, contrast: 1, brightness: 0, gamma: 1,
        threshold: -1, sharpen: 0, channel: 'all', invert: false, edge: false
    };

    switch (name) {
        case 'text_reveal':
            appState.params.exposure = 0.8;
            appState.params.contrast = 2.0;
            appState.params.threshold = 140; 
            break;
        case 'high_contrast':
            appState.params.contrast = 1.8;
            appState.params.exposure = 1.1;
            appState.params.sharpen = 4;
            break;
        case 'edge_detect':
            appState.params.edge = true;
            break;
        case 'inverted':
            appState.params.invert = true;
            appState.params.contrast = 1.2;
            break;
        case 'shadows':
            appState.params.gamma = 2.2;
            appState.params.exposure = 1.2;
            appState.params.contrast = 0.9;
            break;
    }

    updateControls();
    processImage();
}

function updateControls() {
    const p = appState.params;
    const setVal = (sel, v) => document.querySelector(`[data-filter="${sel}"]`).value = v;
    const setText = (id, v) => document.getElementById(id).innerText = v;

    setVal('exposure', p.exposure);
    setVal('contrast', p.contrast);
    setVal('brightness', p.brightness);
    setVal('gamma', p.gamma);
    setVal('threshold', p.threshold);
    setVal('sharpen', p.sharpen);
    
    setText('val-exposure', p.exposure);
    setText('val-contrast', p.contrast);
    setText('val-brightness', p.brightness);
    setText('val-gamma', p.gamma);
    setText('val-threshold', p.threshold === -1 ? 'OFF' : p.threshold);
    setText('val-sharpen', p.sharpen);
    
    dom.channels.forEach(b => {
        b.classList.remove('active', 'bg-slate-800', 'text-slate-400', 'border-slate-600');
        if(b.dataset.channel === p.channel || (p.channel === 'all' && b.dataset.channel === 'all')) {
           if(b.dataset.channel === 'all') b.classList.add('bg-slate-900'); 
        }
    });
}

function updateTransform() {
    dom.wrapper.style.transform = `scale(${appState.zoomLevel}) translate(${appState.offset.x}px, ${appState.offset.y}px)`;
}

function adjustZoom(delta) {
    appState.zoomLevel += delta;
    if (appState.zoomLevel < 0.1) appState.zoomLevel = 0.1;
    updateTransform();
}

function resetZoom() {
    appState.zoomLevel = 1;
    appState.offset = { x: 0, y: 0 };
    updateTransform();
}

dom.container.addEventListener('mousedown', (e) => {
    if(appState.srcImage) {
        appState.dragging = true;
        appState.mousePos = { x: e.clientX, y: e.clientY };
        dom.wrapper.style.cursor = 'grabbing';
    }
});

window.addEventListener('mouseup', () => {
    appState.dragging = false;
    if(dom.wrapper) dom.wrapper.style.cursor = 'move';
});

window.addEventListener('mousemove', (e) => {
    if (!appState.dragging) return;
    const dx = e.clientX - appState.mousePos.x;
    const dy = e.clientY - appState.mousePos.y;
    
    appState.offset.x += dx / appState.zoomLevel;
    appState.offset.y += dy / appState.zoomLevel;
    
    appState.mousePos = { x: e.clientX, y: e.clientY };
    updateTransform();
});

dom.container.addEventListener('wheel', (e) => {
    if(!appState.srcImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    adjustZoom(delta);
});