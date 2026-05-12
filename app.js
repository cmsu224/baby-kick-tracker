'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'baby_kicks';

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function addSession(session) {
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
}

function deleteSession(id) {
  saveSessions(loadSessions().filter(s => s.id !== id));
}

function deleteAllSessionsForDate(dateStr) {
  saveSessions(loadSessions().filter(s => s.date !== dateStr));
}

function getSessionsForDate(dateStr) {
  return loadSessions().filter(s => s.date === dateStr);
}

function getSessionsForMonth(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return loadSessions().filter(s => s.date.startsWith(prefix));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return localDateStr(new Date());
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${min} ${ampm}`;
}

// ── Counter state ─────────────────────────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 70; // matches r="70" in SVG

let sessionState = 'idle'; // idle | running | done
let kickCount = 0;
let timerSeconds = 0;
let timerInterval = null;
let sessionStartTime = null;

const elIdle    = document.getElementById('state-idle');
const elRunning = document.getElementById('state-running');
const elDone    = document.getElementById('state-done');
const elKickNum = document.getElementById('kick-count');
const elTimer   = document.getElementById('timer-display');
const elRingFill= document.getElementById('ring-fill');
const elDoneSummary = document.getElementById('done-summary');

function setRingProgress(n) {
  const offset = CIRCUMFERENCE - (n / 10) * CIRCUMFERENCE;
  elRingFill.style.strokeDashoffset = offset;
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  elTimer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showState(name) {
  elIdle.classList.toggle('hidden', name !== 'idle');
  elRunning.classList.toggle('hidden', name !== 'running');
  elDone.classList.toggle('hidden', name !== 'done');
  sessionState = name;
}

function startSession() {
  kickCount = 0;
  timerSeconds = 0;
  sessionStartTime = new Date();
  elKickNum.textContent = '0';
  setRingProgress(0);
  updateTimerDisplay();
  showState('running');
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function recordKick() {
  if (sessionState !== 'running') return;
  kickCount++;
  elKickNum.textContent = kickCount;
  setRingProgress(kickCount);

  if (kickCount >= 10) {
    completeSession();
  }
}

function completeSession() {
  clearInterval(timerInterval);
  const endTime = new Date();
  const session = {
    id: makeId(),
    date: localDateStr(sessionStartTime),
    startTime: sessionStartTime.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds: timerSeconds,
    kickCount: kickCount,
    completed: kickCount >= 10,
  };
  addSession(session);
  elDoneSummary.textContent = `10 kicks in ${formatDuration(timerSeconds)}`;
  showState('done');
  renderTodaySessions();
}

function cancelSession() {
  clearInterval(timerInterval);
  if (kickCount > 0) {
    // save partial session
    const endTime = new Date();
    addSession({
      id: makeId(),
      date: localDateStr(sessionStartTime),
      startTime: sessionStartTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: timerSeconds,
      kickCount: kickCount,
      completed: false,
    });
    renderTodaySessions();
  }
  showState('idle');
}

// ── Today's sessions list ─────────────────────────────────────────────────────
function renderTodaySessions() {
  const list = document.getElementById('sessions-list');
  const sessions = getSessionsForDate(todayStr());
  if (sessions.length === 0) {
    list.innerHTML = '<li class="empty-msg">No sessions yet today.</li>';
    return;
  }
  list.innerHTML = sessions.map(s => `
    <li>
      <span class="session-dot ${s.completed ? 'complete' : 'incomplete'}"></span>
      <div class="session-info">
        <div class="session-time">${formatTime(s.startTime)}</div>
        <div class="session-detail">${formatDuration(s.durationSeconds)}</div>
      </div>
      <span class="session-badge">${s.kickCount} kicks</span>
      <button class="btn-delete" data-id="${s.id}" aria-label="Delete session">&#10005;</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteSession(btn.dataset.id);
      renderTodaySessions();
    });
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────────
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function renderCalendar() {
  document.getElementById('cal-month-label').textContent =
    `${MONTH_NAMES[calMonth]} ${calYear}`;

  const sessions = getSessionsForMonth(calYear, calMonth);
  const byDate = {};
  sessions.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = { kicks: 0, sessions: 0, hasComplete: false };
    byDate[s.date].kicks += s.kickCount;
    byDate[s.date].sessions++;
    if (s.completed) byDate[s.date].hasComplete = true;
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayStr();

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // leading empty cells
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = byDate[dateStr];
    const cell = document.createElement('div');

    let cls = 'cal-cell';
    if (!data) {
      cls += ' no-data';
    } else if (data.hasComplete) {
      cls += ' has-complete';
    } else {
      cls += ' has-incomplete';
    }
    if (dateStr === today) cls += ' today';
    cell.className = cls;

    const dayNum = document.createElement('span');
    dayNum.className = 'cal-day-num';
    dayNum.textContent = d;
    cell.appendChild(dayNum);

    if (data) {
      const kicks = document.createElement('span');
      kicks.className = 'cal-kicks';
      kicks.textContent = `${data.kicks}`;
      cell.appendChild(kicks);

      const sess = document.createElement('span');
      sess.className = 'cal-sessions';
      sess.textContent = `${data.sessions} sess.`;
      cell.appendChild(sess);

      cell.addEventListener('click', () => openDaySheet(dateStr));
    }

    grid.appendChild(cell);
  }
}

// ── Day detail sheet ──────────────────────────────────────────────────────────
let currentSheetDate = null;

function openDaySheet(dateStr) {
  currentSheetDate = dateStr;
  const overlay = document.getElementById('day-sheet-overlay');
  const sheet   = document.getElementById('day-sheet');

  const [y, m, d] = dateStr.split('-').map(Number);
  document.getElementById('sheet-title').textContent = new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  renderSheetSessions(dateStr);
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
}

function renderSheetSessions(dateStr) {
  const sessions = getSessionsForDate(dateStr);
  const list = document.getElementById('sheet-sessions');
  const btnDeleteDay = document.getElementById('btn-delete-day');

  if (sessions.length === 0) {
    list.innerHTML = '<li>No sessions recorded.</li>';
    btnDeleteDay.style.display = 'none';
    return;
  }

  btnDeleteDay.style.display = '';
  list.innerHTML = sessions.map(s => `
    <li class="sheet-session-row">
      <div class="sheet-session-info">
        <strong>${formatTime(s.startTime)}</strong> &mdash;
        ${s.kickCount} kicks in ${formatDuration(s.durationSeconds)}
        ${s.completed ? '<span class="check-mark">&#10003;</span>' : '<span class="incomplete-tag">incomplete</span>'}
      </div>
      <button class="btn-delete" data-id="${s.id}" aria-label="Delete session">&#10005;</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteSession(btn.dataset.id);
      renderSheetSessions(dateStr);
      renderCalendar();
      if (dateStr === todayStr()) renderTodaySessions();
    });
  });
}

function closeDaySheet() {
  document.getElementById('day-sheet-overlay').classList.add('hidden');
  document.getElementById('day-sheet').classList.add('hidden');
  currentSheetDate = null;
}

// ── Tab navigation ────────────────────────────────────────────────────────────
function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === `screen-${name}`);
    s.classList.toggle('hidden', s.id !== `screen-${name}`);
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  if (name === 'calendar') renderCalendar();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // today's date
  document.getElementById('today-date').textContent = new Date().toLocaleDateString(
    'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  // render today's past sessions
  renderTodaySessions();

  // counter buttons
  document.getElementById('btn-start').addEventListener('click', startSession);
  document.getElementById('btn-kick').addEventListener('click', recordKick);
  document.getElementById('btn-cancel').addEventListener('click', cancelSession);
  document.getElementById('btn-again').addEventListener('click', startSession);

  // calendar nav
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  // bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });

  // day sheet close + delete-all
  document.getElementById('btn-close-sheet').addEventListener('click', closeDaySheet);
  document.getElementById('day-sheet-overlay').addEventListener('click', closeDaySheet);
  document.getElementById('btn-delete-day').addEventListener('click', () => {
    if (!currentSheetDate) return;
    if (!confirm('Delete all sessions for this day?')) return;
    deleteAllSessionsForDate(currentSheetDate);
    renderSheetSessions(currentSheetDate);
    renderCalendar();
    if (currentSheetDate === todayStr()) renderTodaySessions();
  });

  // prevent accidental double-kick on the ring button via touchstart
  document.getElementById('btn-kick').addEventListener('touchstart', e => {
    e.preventDefault();
    recordKick();
  }, { passive: false });
});
