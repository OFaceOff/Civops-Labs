lucide.createIcons();

window.onload = () => {
    const bootScreen = document.getElementById('boot-screen');
    const mainInterface = document.getElementById('main-interface');
    const progressBar = document.getElementById('progress-bar-el');

    const hasVisited = localStorage.getItem('civops_visited');
    const speedFactor = hasVisited ? 0.3 : 1;
    
    progressBar.style.transitionDuration = `${2 * speedFactor}s`;
    setTimeout(() => { progressBar.style.width = "100%"; }, 100);

    setTimeout(() => { document.getElementById('term-line-1').classList.remove('opacity-0'); }, 500 * speedFactor);
    setTimeout(() => { document.getElementById('term-line-2').classList.remove('opacity-0'); }, 1200 * speedFactor);
    setTimeout(() => { document.getElementById('term-line-3').classList.remove('opacity-0'); }, 1800 * speedFactor);
    setTimeout(() => { document.getElementById('term-line-4').classList.remove('opacity-0'); }, 2400 * speedFactor);

    setTimeout(() => {
        bootScreen.style.opacity = '0';
        mainInterface.classList.remove('hidden');
        setTimeout(() => {
            mainInterface.classList.remove('opacity-0');
            bootScreen.classList.add('hidden');
        }, 100);
        localStorage.setItem('civops_visited', 'true');
    }, 3000 * speedFactor); 
};

let idleInterval;
const terminalContainer = document.getElementById('terminal-container');

function toggleScreensaver(show) {
    const ss = document.getElementById('screensaver');
    if(show) {
        ss.classList.remove('hidden');
        startIdleAnimation();
    } else {
        ss.classList.add('hidden');
        stopIdleAnimation();
    }
}

function startIdleAnimation() {
    spawnTerminal();
    spawnTerminal();
    
    idleInterval = setInterval(() => {
        if(terminalContainer.children.length < 5) {
            spawnTerminal();
        }
    }, 2500);
}

function stopIdleAnimation() {
    clearInterval(idleInterval);
    terminalContainer.innerHTML = ''; 
}

function spawnTerminal() {
    const width = Math.floor(Math.random() * 200) + 400; 
    const height = Math.floor(Math.random() * 150) + 250; 
    
    const top = Math.floor(Math.random() * 60); 
    const left = Math.floor(Math.random() * 60); 
    const id = Math.floor(Math.random() * 9999);
    
    const div = document.createElement('div');
    div.className = "terminal-window absolute bg-slate-900 border border-slate-700 shadow-2xl rounded overflow-hidden flex flex-col font-mono text-xs z-20";
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.top = `${top}%`;
    div.style.left = `${left}%`;
    div.style.opacity = Math.random() * 0.4 + 0.6; 

    div.innerHTML = `
        <div class="bg-slate-800 p-2 flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-700">
            <span class="font-bold">CMD_PROCESS_${id}.EXE</span>
            <div class="flex gap-1.5">
                <div class="w-2 h-2 rounded-full bg-red-500/50"></div>
                <div class="w-2 h-2 rounded-full bg-amber-500/50"></div>
                <div class="w-2 h-2 rounded-full bg-emerald-500/50"></div>
            </div>
        </div>
        <div class="flex-1 p-3 bg-slate-950/90 text-emerald-500/80 overflow-hidden leading-snug whitespace-pre-wrap break-all font-mono" id="content-${id}">
            ${generateRandomLogLines(15)}
        </div>
    `;

    terminalContainer.appendChild(div);

    const lifeTime = Math.random() * 4000 + 4000;
    setTimeout(() => {
        div.classList.add('closing');
        div.addEventListener('animationend', () => div.remove());
    }, lifeTime);
}

function generateRandomLogLines(count) {
    const logs = [
        "SCANNING PORT 8080...", "PACKET_RECEIVED [256kb]", "DECRYPTING KEY...", "PING 192.168.0.1",
        "ACCESS_TOKEN_VALID", "UPLOADING PAYLOAD...", "BYPASS_FIREWALL_L2", "TRACE_COMPLETE",
        "ROOT_ACCESS_GRANTED", "KERNEL_UPDATE_PENDING", "SYNCING_DB_SHARD_01...", "HASH_MISMATCH_RETRY", 
        "RETRYING_CONNECTION...", "ALLOCATING_MEMORY_BLOCK", "GARBAGE_COLLECTION", "THREAD_SLEEP(200ms)"
    ];
    let txt = "";
    for(let i=0; i<count; i++) {
        const cmd = logs[Math.floor(Math.random() * logs.length)];
        const hex = Math.floor(Math.random()*255).toString(16).toUpperCase().padStart(2, '0');
        const time = new Date().toLocaleTimeString().split(' ')[0];
        txt += `[${time}] 0x${hex} :: ${cmd}\n`;
    }
    return txt;
}