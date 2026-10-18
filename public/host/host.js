const socket = io();
let gameState = null;
let currentRound = 'starting';
let currentSubRound = 'ts0'; // ts0, ts1, ts2, ts3, common

// Auth on connect
socket.on('connect', () => {
  socket.emit('auth', { role: 'host', name: 'Ban Tổ Chức' });
});

socket.on('game:state', (state) => {
  gameState = state;
  currentRound = state.currentRound || 'starting';
  renderStudents();
  renderBuzzerStatus();
  renderActiveQuestion();
  renderRoundNavigation();
  renderQuestionsList();
  updateTimerDisplay(state.timer.timeLeft);
});

socket.on('timer:tick', ({ timeLeft, maxTime }) => {
  updateTimerDisplay(timeLeft);
});

socket.on('timer:ended', () => {
  document.getElementById('timerStatusLabel').textContent = 'Hết Giờ!';
});

socket.on('buzzer:opened', () => {
  updateBuzzerUI(true);
});

socket.on('buzzer:closed', () => {
  updateBuzzerUI(false);
});

socket.on('buzzer:first-press', (buzz) => {
  renderBuzzerStatus();
});

// UI Rendering Functions
function renderStudents() {
  if (!gameState || !gameState.students) return;
  const container = document.getElementById('studentsList');
  container.innerHTML = '';

  gameState.students.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border transition ${
      s.star ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800 bg-slate-950'
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 overflow-hidden">
          <span class="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="truncate">
            <p class="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>${s.name}</span>
              ${s.star ? '<i class="fa-solid fa-star text-amber-400 text-[11px]" title="Ngôi sao hy vọng"></i>' : ''}
              <span class="w-2 h-2 rounded-full ${s.connected ? 'bg-emerald-400' : 'bg-slate-600'}" title="${s.connected ? 'Online' : 'Offline'}"></span>
            </p>
            <p class="text-[10px] text-slate-400 truncate">${s.school}</p>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-lg font-black text-amber-400 font-mono">${s.score}</span>
          <span class="text-[10px] text-slate-500 block -mt-1">điểm</span>
        </div>
      </div>

      <!-- Score adjustments & Star -->
      <div class="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/80 text-[11px]">
        <div class="flex items-center gap-1 font-mono">
          <button onclick="updateScore(${idx}, 10)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+10</button>
          <button onclick="updateScore(${idx}, -5)" class="px-1.5 py-0.5 bg-red-950 hover:bg-red-800 text-red-300 rounded border border-red-600/30">-5</button>
          <button onclick="updateScore(${idx}, 20)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+20</button>
          <button onclick="updateScore(${idx}, 30)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+30</button>
        </div>

        <button onclick="toggleStar(${idx})" class="px-2 py-0.5 rounded text-[11px] font-semibold transition ${
          s.star ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
        }">
          <i class="fa-solid fa-star"></i> Sao
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderBuzzerStatus() {
  if (!gameState) return;
  const list = document.getElementById('buzzedList');
  const stateText = document.getElementById('buzzerStateText');
  const box = document.getElementById('buzzerStatusBox');

  if (gameState.buzzer.open) {
    stateText.textContent = 'ĐANG MỞ - SẴN SÀNG';
    stateText.className = 'font-bold text-emerald-400';
    box.className = 'p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/40 text-xs';
  } else {
    stateText.textContent = 'ĐANG KHÓA';
    stateText.className = 'font-bold text-red-400';
    box.className = 'p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs';
  }

  if (!gameState.buzzer.buzzedStudents || gameState.buzzer.buzzedStudents.length === 0) {
    list.innerHTML = '<p class="text-slate-500 text-[11px] italic">Chưa có thí sinh bấm chuông</p>';
  } else {
    list.innerHTML = '';
    gameState.buzzer.buzzedStudents.forEach((b, idx) => {
      const item = document.createElement('div');
      item.className = `p-2 rounded flex items-center justify-between text-xs ${
        idx === 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'bg-slate-900 text-slate-300'
      }`;
      item.innerHTML = `
        <span class="flex items-center gap-1.5">
          ${idx === 0 ? '<i class="fa-solid fa-trophy text-amber-400"></i>' : `#${idx + 1}`}
          <span>${b.studentName}</span>
        </span>
        <span class="font-mono text-[11px] text-slate-400">${b.elapsedMs ? (b.elapsedMs / 1000).toFixed(2) + 's' : '0.00s'}</span>
      `;
      list.appendChild(item);
    });
  }
}

function updateBuzzerUI(isOpen) {
  renderBuzzerStatus();
}

function renderActiveQuestion() {
  const card = document.getElementById('activeQuestionCard');
  if (!gameState || !gameState.currentQuestion) {
    card.innerHTML = `<p class="text-slate-500 text-sm italic text-center">Chưa có câu hỏi nào được chọn. Hãy chọn câu hỏi từ danh sách bên dưới để bắt đầu.</p>`;
    return;
  }

  const q = gameState.currentQuestion;
  card.innerHTML = `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs font-semibold text-blue-400">
        <span>${q.title || 'Câu hỏi'}</span>
        ${q.points ? `<span class="bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">${q.points} Điểm</span>` : ''}
      </div>
      <p class="text-sm font-bold text-white">${q.question}</p>
      <div class="p-2 bg-emerald-950/40 border border-emerald-600/30 rounded-lg text-xs">
        <span class="text-emerald-400 font-bold">Đáp án:</span>
        <span class="text-emerald-200 ml-1 font-semibold">${q.answer || '(Chưa có đáp án)'}</span>
      </div>
    </div>
  `;
}

function renderRoundNavigation() {
  const rounds = ['lobby', 'starting', 'obstacle', 'acceleration', 'finish'];
  rounds.forEach(r => {
    const btn = document.getElementById(`btn-round-${r}`);
    if (btn) {
      if (r === currentRound) {
        btn.className = 'px-3 py-1.5 rounded-lg transition bg-blue-600 text-white shadow font-bold';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg transition hover:bg-slate-800 text-slate-400';
      }
    }
  });

  // Render Sub-Round Navigation Bar
  const subBar = document.getElementById('subRoundBar');
  subBar.innerHTML = '';

  if (currentRound === 'starting') {
    const tabs = [
      { id: 'ts0', label: 'Thí sinh 1' },
      { id: 'ts1', label: 'Thí sinh 2' },
      { id: 'ts2', label: 'Thí sinh 3' },
      { id: 'ts3', label: 'Thí sinh 4' },
      { id: 'common', label: 'Lượt Chung' }
    ];
    tabs.forEach(t => {
      const b = document.createElement('button');
      b.className = `px-3 py-1.5 rounded-lg transition ${
        currentSubRound === t.id ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
      }`;
      b.textContent = t.label;
      b.onclick = () => {
        currentSubRound = t.id;
        renderRoundNavigation();
        renderQuestionsList();
      };
      subBar.appendChild(b);
    });
  } else if (currentRound === 'finish') {
    const tabs = [
      { id: 'ts0', label: 'Gói TS 1' },
      { id: 'ts1', label: 'Gói TS 2' },
      { id: 'ts2', label: 'Gói TS 3' },
      { id: 'ts3', label: 'Gói TS 4' }
    ];
    tabs.forEach(t => {
      const b = document.createElement('button');
      b.className = `px-3 py-1.5 rounded-lg transition ${
        currentSubRound === t.id ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
      }`;
      b.textContent = t.label;
      b.onclick = () => {
        currentSubRound = t.id;
        renderRoundNavigation();
        renderQuestionsList();
      };
      subBar.appendChild(b);
    });
  } else if (currentRound === 'acceleration') {
    const showAnswersBtn = document.createElement('button');
    showAnswersBtn.className = 'px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow';
    showAnswersBtn.innerHTML = '<i class="fa-solid fa-list-check"></i> Hiển Thị Đáp Án Thí Sinh Lên Viewer';
    showAnswersBtn.onclick = () => socket.emit('host:show-answers');
    subBar.appendChild(showAnswersBtn);
  }
}

function renderQuestionsList() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  if (!gameState || !gameState.examData) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic">Đang tải dữ liệu đề thi...</p>';
    return;
  }

  let questions = [];

  if (currentRound === 'starting') {
    if (currentSubRound === 'common') {
      questions = gameState.examData.starting.common || [];
    } else {
      const sIdx = parseInt(currentSubRound.replace('ts', '')) || 0;
      questions = (gameState.examData.starting.individual && gameState.examData.starting.individual[sIdx]) || [];
    }
  } else if (currentRound === 'obstacle') {
    const ob = (gameState.examData.obstacle && gameState.examData.obstacle.rounds && gameState.examData.obstacle.rounds[0]) || null;
    if (ob) {
      // Header item for obstacle image & answer
      const obHeader = document.createElement('div');
      obHeader.className = 'p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl mb-3 flex items-center justify-between text-xs';
      obHeader.innerHTML = `
        <div>
          <p class="font-bold text-purple-300">CHƯỚNG NGẠI VẬT: ${ob.answer || 'Chưa có'}</p>
          <p class="text-slate-400 text-[11px]">${ob.hint || 'Gợi ý'}</p>
        </div>
        <button onclick="revealObstacleImage()" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold">
          Mở Toàn Bộ CNV
        </button>
      `;
      container.appendChild(obHeader);
      questions = ob.rows || [];
    }
  } else if (currentRound === 'acceleration') {
    questions = gameState.examData.acceleration || [];
  } else if (currentRound === 'finish') {
    const sIdx = parseInt(currentSubRound.replace('ts', '')) || 0;
    questions = (gameState.examData.finish && gameState.examData.finish.rounds && gameState.examData.finish.rounds[sIdx]) || [];
  }

  if (questions.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-6">Không có câu hỏi nào trong mục này.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex items-center justify-between gap-3 text-xs';
    item.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-blue-400">#${q.id || idx + 1}</span>
          ${q.points ? `<span class="bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded text-[10px] border border-blue-600/30">${q.points}đ</span>` : ''}
          ${q.time ? `<span class="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px]"><i class="fa-regular fa-clock"></i> ${q.time}s</span>` : ''}
          ${q.name ? `<span class="font-bold text-amber-300">${q.name}</span>` : ''}
        </div>
        <p class="text-slate-200 font-medium mb-1">${q.question}</p>
        <p class="text-emerald-400 font-semibold text-[11px]">ĐA: ${q.answer}</p>
      </div>

      <div class="shrink-0 flex items-center gap-1.5">
        ${currentRound === 'obstacle' ? `
          <button onclick="revealObstacleRow(${q.id})" class="px-2.5 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded font-semibold text-xs border border-purple-500/30">
            Lật Ô
          </button>
        ` : ''}
        <button onclick='selectQuestion(${JSON.stringify(q)})' class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center gap-1 transition">
          <i class="fa-solid fa-paper-plane text-[10px]"></i> Đẩy Lên Màn Hình
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function updateTimerDisplay(seconds) {
  const el = document.getElementById('hostTimerText');
  if (el) {
    el.textContent = seconds < 10 ? `0${seconds}` : seconds;
  }
}

// Controller Actions
function setRound(round) {
  currentRound = round;
  socket.emit('host:set-round', { round });
  renderRoundNavigation();
  renderQuestionsList();
}

function selectQuestion(q) {
  socket.emit('host:set-question', q);
  if (q.time) {
    setTimerPreset(q.time);
  }
}

function clearActiveQuestion() {
  socket.emit('host:set-question', null);
}

function timerAction(action) {
  if (action === 'start') {
    const current = gameState?.timer?.timeLeft || 30;
    socket.emit('host:start-timer', { seconds: current });
    document.getElementById('timerStatusLabel').textContent = 'Đang chạy...';
  } else if (action === 'stop') {
    socket.emit('host:stop-timer');
    document.getElementById('timerStatusLabel').textContent = 'Đang tạm dừng';
  } else if (action === 'reset') {
    socket.emit('host:reset-timer', { seconds: gameState?.timer?.maxTime || 30 });
    document.getElementById('timerStatusLabel').textContent = 'Đã reset';
  }
}

function setTimerPreset(sec) {
  socket.emit('host:reset-timer', { seconds: sec });
  updateTimerDisplay(sec);
}

function openBuzzer() {
  socket.emit('host:open-buzzer');
}

function closeBuzzer() {
  socket.emit('host:close-buzzer');
}

function resetBuzzer() {
  socket.emit('host:reset-buzzer');
}

function updateScore(studentIndex, delta) {
  socket.emit('host:update-score', { studentIndex, delta });
}

function toggleStar(studentIndex) {
  socket.emit('host:toggle-star', { studentIndex });
}

function revealObstacleRow(rowIndex) {
  socket.emit('host:reveal-obstacle-row', { rowIndex });
}

function revealObstacleImage() {
  socket.emit('host:reveal-obstacle-image');
}

function triggerSound(sound) {
  socket.emit('host:play-sound', { sound });
  playSound(sound);
}

function triggerTrailer(trailer) {
  socket.emit('host:play-trailer', { trailer });
}

// Upload Exam File
async function uploadExamFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('examFile', file);

  try {
    const res = await fetch('/api/upload-exam', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      alert('Nạp đề thi thành công!');
      gameState.examData = data.examData;
      renderQuestionsList();
    } else {
      alert('Lỗi nạp đề thi: ' + data.message);
    }
  } catch (err) {
    alert('Không thể tải file lên server!');
  }
}

// Edit Students Modal
function openEditStudentsModal() {
  const container = document.getElementById('modalStudentsInputs');
  container.innerHTML = '';
  gameState.students.forEach((s, idx) => {
    container.innerHTML += `
      <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
        <p class="text-xs font-bold text-blue-400">Thí sinh ${idx + 1}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <input type="text" id="modalName_${idx}" value="${s.name}" placeholder="Họ và tên" class="p-2 bg-slate-900 border border-slate-700 rounded text-white">
          <input type="text" id="modalSchool_${idx}" value="${s.school}" placeholder="Trường THPT" class="p-2 bg-slate-900 border border-slate-700 rounded text-white">
        </div>
      </div>
    `;
  });
  document.getElementById('studentsModal').classList.remove('hidden');
}

function closeEditStudentsModal() {
  document.getElementById('studentsModal').classList.add('hidden');
}

async function saveStudentsData() {
  const updated = [];
  for (let i = 0; i < 4; i++) {
    const name = document.getElementById(`modalName_${i}`).value.trim();
    const school = document.getElementById(`modalSchool_${i}`).value.trim();
    updated.push({ name, school });
  }

  await fetch('/api/update-students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: updated })
  });

  closeEditStudentsModal();
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
