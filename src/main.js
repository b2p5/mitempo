console.log("MiTempo iniciado");

// --- State ---
const DEFAULT_CYCLE = {
    id: 'default',
    name: "Tabata Básico",
    intervals: [
        { name: "Trabajo", duration: 20, type: "work" },
        { name: "Descanso", duration: 10, type: "rest" },
        { name: "Trabajo", duration: 20, type: "work" },
        { name: "Descanso", duration: 10, type: "rest" },
        { name: "Trabajo", duration: 20, type: "work" },
        { name: "Descanso", duration: 10, type: "rest" },
        { name: "Trabajo", duration: 20, type: "work" },
        { name: "Descanso", duration: 10, type: "rest" }
    ]
};

let cycles = loadCycles();
let currentCycleId = cycles[0].id;
let currentCycle = cycles.find(c => c.id === currentCycleId);

let isRunning = false;
let currentIntervalIndex = 0;
let timeLeft = currentCycle.intervals[0].duration;
let timerInterval = null;
let editingCycleId = null; // For the editor

// --- DOM Elements ---
const timeDisplay = document.getElementById('time-display');
const intervalLabel = document.getElementById('interval-label');
const cycleNameDisplay = document.getElementById('cycle-name');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const progressCircle = document.querySelector('.progress-ring__circle');
const intervalsList = document.getElementById('intervals-list');

// Views
const timerView = document.getElementById('timer-view');
const cyclesView = document.getElementById('cycles-view');
const cyclesListContainer = document.getElementById('cycles-list-container');
const addCycleBtn = document.getElementById('add-cycle-btn');

// Modal
const editorModal = document.getElementById('editor-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveCycleBtn = document.getElementById('save-cycle-btn');
const addIntervalBtn = document.getElementById('add-interval-btn');
const cycleNameInput = document.getElementById('cycle-name-input');
const intervalsEditorList = document.getElementById('intervals-editor-list');

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const CIRCUMFERENCE = 2 * Math.PI * 140;

// --- Initialization ---
function init() {
    renderTimerView();
    setupEventListeners();
}

function setupEventListeners() {
    startBtn.addEventListener('click', toggleTimer);

    // Navigation
    settingsBtn.addEventListener('click', () => {
        renderCyclesList();
        cyclesView.classList.remove('hidden-view');
    });
    closeSettingsBtn.addEventListener('click', () => {
        cyclesView.classList.add('hidden-view');
    });

    // Cycle Management
    addCycleBtn.addEventListener('click', () => openEditor(null));
    closeModalBtn.addEventListener('click', () => editorModal.classList.add('hidden-view'));
    addIntervalBtn.addEventListener('click', addIntervalInput);
    saveCycleBtn.addEventListener('click', saveCycle);
}

// --- Persistence ---
function loadCycles() {
    const stored = localStorage.getItem('mitempo_cycles');
    if (stored) return JSON.parse(stored);
    return [DEFAULT_CYCLE];
}

function saveCycles() {
    localStorage.setItem('mitempo_cycles', JSON.stringify(cycles));
}

// --- Timer Logic ---
function renderTimerView() {
    cycleNameDisplay.textContent = currentCycle.name;
    renderIntervalsPreview();
    updateDisplay();
}

function renderIntervalsPreview() {
    intervalsList.innerHTML = '';
    currentCycle.intervals.forEach((interval, index) => {
        const dot = document.createElement('div');
        dot.className = `interval-dot ${index === currentIntervalIndex ? 'active' : ''}`;
        intervalsList.appendChild(dot);
    });
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const currentInterval = currentCycle.intervals[currentIntervalIndex];
    intervalLabel.textContent = currentInterval.name;

    // Progress Ring
    const totalTime = currentInterval.duration;
    const progress = timeLeft / totalTime;
    const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    progressCircle.style.strokeDashoffset = offset;

    // Update dots
    const dots = document.querySelectorAll('.interval-dot');
    dots.forEach((dot, index) => {
        if (index === currentIntervalIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.error("Error resuming audio context:", err));
    }
    console.log("Starting timer...");

    isRunning = true;
    startBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            nextInterval();
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    startBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    clearInterval(timerInterval);
}

function nextInterval() {
    playTone(880, 0.5); // End tone

    if (currentIntervalIndex < currentCycle.intervals.length - 1) {
        currentIntervalIndex++;
        timeLeft = currentCycle.intervals[currentIntervalIndex].duration;
        updateDisplay();
        playTone(440, 0.5); // Start tone
    } else {
        // Cycle finished
        pauseTimer();
        currentIntervalIndex = 0;
        timeLeft = currentCycle.intervals[0].duration;
        updateDisplay();
        playTone(600, 1, 'triangle'); // Finish cycle tone
    }
}

function playTone(freq, duration, type = 'sine') {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

// --- Cycle Management Logic ---
function renderCyclesList() {
    cyclesListContainer.innerHTML = '';
    cycles.forEach(cycle => {
        const card = document.createElement('div');
        card.className = 'cycle-card';
        card.innerHTML = `
            <div onclick="selectCycle('${cycle.id}')" style="flex:1; cursor:pointer;">
                <h4>${cycle.name}</h4>
                <p>${cycle.intervals.length} intervalos</p>
            </div>
            <div class="actions">
                <button onclick="openEditor('${cycle.id}')" class="icon-btn" style="color: var(--primary-color)">✎</button>
                <button onclick="deleteCycle('${cycle.id}')" class="icon-btn delete-btn">🗑</button>
            </div>
        `;
        cyclesListContainer.appendChild(card);
    });
}

window.selectCycle = function (id) {
    currentCycleId = id;
    currentCycle = cycles.find(c => c.id === id);
    resetTimer();
    cyclesView.classList.add('hidden-view');
};

window.deleteCycle = function (id) {
    if (cycles.length <= 1) {
        alert("Debes tener al menos una rutina.");
        return;
    }
    if (confirm("¿Borrar esta rutina?")) {
        cycles = cycles.filter(c => c.id !== id);
        saveCycles();
        if (currentCycleId === id) {
            selectCycle(cycles[0].id);
        }
        renderCyclesList();
    }
};

function resetTimer() {
    pauseTimer();
    currentIntervalIndex = 0;
    timeLeft = currentCycle.intervals[0].duration;
    renderTimerView();
}

// --- Editor Logic ---
window.openEditor = function (id) {
    editingCycleId = id;
    editorModal.classList.remove('hidden-view');
    intervalsEditorList.innerHTML = '';

    if (id) {
        const cycle = cycles.find(c => c.id === id);
        cycleNameInput.value = cycle.name;
        cycle.intervals.forEach(interval => addIntervalInput(null, interval));
    } else {
        cycleNameInput.value = '';
        addIntervalInput(); // Add one empty by default
    }
};

function addIntervalInput(e, data = { name: 'Intervalo', duration: 30 }) {
    const div = document.createElement('div');
    div.className = 'interval-item';
    div.innerHTML = `
        <input type="text" class="name" value="${data.name}" placeholder="Nombre">
        <input type="number" class="duration" value="${data.duration}" min="1"> s
        <button class="icon-btn delete-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    intervalsEditorList.appendChild(div);
}

function saveCycle() {
    const name = cycleNameInput.value || "Sin nombre";
    const intervalItems = intervalsEditorList.querySelectorAll('.interval-item');
    const newIntervals = [];

    intervalItems.forEach(item => {
        newIntervals.push({
            name: item.querySelector('.name').value,
            duration: parseInt(item.querySelector('.duration').value) || 10,
            type: 'work' // Default for now
        });
    });

    if (newIntervals.length === 0) {
        alert("Añade al menos un intervalo");
        return;
    }

    if (editingCycleId) {
        const index = cycles.findIndex(c => c.id === editingCycleId);
        cycles[index] = { ...cycles[index], name, intervals: newIntervals };
    } else {
        cycles.push({
            id: Date.now().toString(),
            name,
            intervals: newIntervals
        });
    }

    saveCycles();
    editorModal.classList.add('hidden-view');
    renderCyclesList();

    // If we just edited the current cycle, reload it
    if (editingCycleId === currentCycleId) {
        selectCycle(currentCycleId);
    }
}

init();
