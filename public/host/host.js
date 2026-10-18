const socket = io();
let gameState = null;
let currentTab = 'lobby';
let previewSection = 'starting';

// Connect & Auth
socket.on('connect', () => {
  socket.emit('auth', { role: 'host', name: 'Ban Tổ Chức' });
});

socket.on('game:state', (state) => {
  gameState = state;
  renderStudents();
  renderBuzzerStatus();
  renderScoreboardImageTab();
  updateTimerDisplay(state.timer.timeLeft);

  // Render questions for active tab
  if (currentTab === 'starting') renderStartingTab();
  else if (currentTab === 'obstacle') renderObstacleTab();
  else if (currentTab === 'acceleration') renderAccelerationTab();
  else if (currentTab === 'finish') renderFinishTab();
  else if (currentTab === 'sub_question') renderSubQuestionTab();
  else if (currentTab === 'preview') renderPreviewTab();

  updateLobbyClientStatuses();
});

socket.on('timer:tick', ({ timeLeft }) => {
  updateTimerDisplay(timeLeft);
});

socket.on('timer:ended', () => {
  document.getElementById('timerStatusLabel').textContent = 'HẾT GIỜ!';
});

socket.on('timer:paused', () => {
  document.getElementById('timerStatusLabel').textContent = 'TẠM DỪNG';
});

socket.on('buzzer:opened', () => renderBuzzerStatus());
socket.on('buzzer:closed', () => renderBuzzerStatus());
socket.on('buzzer:reset', () => renderBuzzerStatus());
socket.on('buzzer:first-press', () => renderBuzzerStatus());

// TAB SWITCHING
function switchTab(tabName) {
  currentTab = tabName;

  // Update navbar visual
  const tabs = ['lobby', 'preview', 'scoreboard_image', 'starting', 'obstacle', 'acceleration', 'finish', 'sub_question'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = 'px-2.5 py-1.5 rounded-lg transition text-white tab-active shrink-0 shadow';
      } else {
        btn.className = 'px-2.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white shrink-0';
      }
    }
    if (panel) {
      if (t === tabName) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
  });

  // Emit set-round to sync Viewer & MC
  socket.emit('host:set-round', { round: tabName });
}

// RENDER STUDENTS LIST ON LEFT COLUMN
function renderStudents() {
  if (!gameState || !gameState.students) return;
  const container = document.getElementById('studentsList');
  container.innerHTML = '';

  gameState.students.forEach((s, idx) => {
    const isEliminated = gameState.obstacle && gameState.obstacle.eliminatedStudents && gameState.obstacle.eliminatedStudents.includes(idx);
    const card = document.createElement('div');
    card.className = `p-2.5 rounded-xl border transition ${
      s.star ? 'border-amber-400 bg-amber-950/20' : isEliminated ? 'border-red-900 bg-red-950/20 opacity-70' : 'border-slate-800 bg-slate-950'
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2 overflow-hidden">
          <span class="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="truncate">
            <p class="text-xs font-bold text-white truncate flex items-center gap-1">
              <span>${s.name}</span>
              ${s.star ? '<img src="/assets/gcapp/star.gif" class="w-3.5 h-3.5 inline">' : ''}
              ${isEliminated ? '<span class="text-[9px] bg-red-900 text-red-200 px-1 rounded">Bị loại</span>' : ''}
              <span class="w-2 h-2 rounded-full ${s.connected ? 'bg-emerald-400' : 'bg-slate-600'}" title="${s.connected ? 'Online' : 'Offline'}"></span>
            </p>
            <p class="text-[10px] text-slate-400 truncate">${s.school}</p>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-base font-black text-amber-400 font-mono">${s.score}</span>
          <span class="text-[9px] text-slate-500 block -mt-1">điểm</span>
        </div>
      </div>

      <!-- Quick delta buttons -->
      <div class="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
        <div class="flex items-center gap-1">
          <button onclick="updateScore(${idx}, 10)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+10</button>
          <button onclick="updateScore(${idx}, -5)" class="px-1.5 py-0.5 bg-red-950 hover:bg-red-800 text-red-300 rounded border border-red-600/30">-5</button>
          <button onclick="updateScore(${idx}, 20)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+20</button>
          <button onclick="updateScore(${idx}, 30)" class="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/30">+30</button>
        </div>
        <button onclick="toggleStar(${idx})" class="px-2 py-0.5 rounded text-[10px] font-bold transition ${
          s.star ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
        }">
          <i class="fa-solid fa-star"></i> Sao
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// BUZZER STATUS
function renderBuzzerStatus() {
  if (!gameState) return;
  const list = document.getElementById('buzzedList');
  const stateText = document.getElementById('buzzerStateText');
  const box = document.getElementById('buzzerStatusBox');

  if (gameState.buzzer.open) {
    stateText.textContent = 'ĐANG MỞ - SẴN SÀNG';
    stateText.className = 'font-bold text-emerald-400';
    box.className = 'p-2.5 bg-emerald-950/20 rounded-lg border border-emerald-500/40 text-xs';
  } else {
    stateText.textContent = 'ĐANG KHÓA';
    stateText.className = 'font-bold text-red-400';
    box.className = 'p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs';
  }

  if (!gameState.buzzer.buzzedStudents || gameState.buzzer.buzzedStudents.length === 0) {
    list.innerHTML = '<p class="text-slate-500 text-[11px] italic">Chưa có thí sinh bấm chuông</p>';
  } else {
    list.innerHTML = '';
    gameState.buzzer.buzzedStudents.forEach((b, idx) => {
      const item = document.createElement('div');
      item.className = `p-1.5 rounded flex items-center justify-between text-xs ${
        idx === 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'bg-slate-900 text-slate-300'
      }`;
      item.innerHTML = `
        <span class="flex items-center gap-1.5">
          ${idx === 0 ? '<i class="fa-solid fa-trophy text-amber-400 text-xs"></i>' : `#${idx + 1}`}
          <span>${b.studentName}</span>
        </span>
        <span class="font-mono text-[11px] text-slate-400">${b.elapsedMs ? (b.elapsedMs / 1000).toFixed(2) + 's' : '0.00s'}</span>
      `;
      list.appendChild(item);
    });
  }
}

// TAB 1: LOBBY
function updateLobbyClientStatuses() {
  if (!gameState) return;
  const tsConnected = gameState.students.filter(s => s.connected).length;
  const el = document.getElementById('lobbyStatusTS');
  if (el) el.textContent = `${tsConnected} / 4 Online`;
}

// TAB 2: PREVIEW EXAM
function showPreviewSection(sec) {
  previewSection = sec;
  renderPreviewTab();
}

function renderPreviewTab() {
  const container = document.getElementById('previewQuestionsList');
  container.innerHTML = '';
  if (!gameState || !gameState.examData) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic">Chưa nạp đề thi.</p>';
    return;
  }

  let list = [];
  if (previewSection === 'starting') {
    list = [
      ...(gameState.examData.starting.individual[0] || []).map(q => ({ ...q, cat: 'TS 1' })),
      ...(gameState.examData.starting.individual[1] || []).map(q => ({ ...q, cat: 'TS 2' })),
      ...(gameState.examData.starting.common || []).map(q => ({ ...q, cat: 'Chung' }))
    ];
  } else if (previewSection === 'obstacle') {
    const ob = (gameState.examData.obstacle && gameState.examData.obstacle.rounds && gameState.examData.obstacle.rounds[0]) || null;
    if (ob) {
      list = ob.rows || [];
    }
  } else if (previewSection === 'acceleration') {
    list = gameState.examData.acceleration || [];
  } else if (previewSection === 'finish') {
    list = [
      ...(gameState.examData.finish.rounds[0] || []).map(q => ({ ...q, cat: 'Gói TS 1' })),
      ...(gameState.examData.finish.rounds[1] || []).map(q => ({ ...q, cat: 'Gói TS 2' }))
    ];
  } else if (previewSection === 'sub') {
    list = gameState.examData.subQuestions || [];
  }

  if (list.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Không có câu hỏi.</p>';
    return;
  }

  list.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs';
    div.innerHTML = `
      <div class="flex items-center justify-between text-blue-400 mb-1">
        <span class="font-bold">#${q.id || idx + 1} ${q.cat ? `[${q.cat}]` : ''} ${q.points ? `(${q.points}đ)` : ''}</span>
        ${q.time ? `<span class="text-slate-400 font-mono">${q.time}s</span>` : ''}
      </div>
      <p class="text-white mb-1">${q.question}</p>
      <p class="text-emerald-400 font-semibold text-[11px]">Đáp án: ${q.answer}</p>
    `;
    container.appendChild(div);
  });
}

// TAB 3: SCOREBOARD IMAGE TAB
function renderScoreboardImageTab() {
  const grid = document.getElementById('scoreboardImageGrid');
  if (!grid || !gameState) return;
  grid.innerHTML = '';

  gameState.students.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center gap-4 relative overflow-hidden';
    card.innerHTML = `
      <div class="w-16 h-20 bg-slate-900 border border-blue-500/40 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <img src="/assets/gcapp/${idx + 1}.png" alt="TS" class="w-full h-full object-cover">
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">Thí sinh ${idx + 1}</span>
        <h3 class="text-sm font-bold text-white truncate mt-1">${s.name}</h3>
        <p class="text-xs text-slate-400 truncate">${s.school}</p>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-xl font-black text-amber-400 font-mono">${s.score}</span>
          <span class="text-xs text-slate-500">điểm</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// TAB 4: KHỞI ĐỘNG
function changeStartingTurn(val) {
  socket.emit('host:set-round', { round: 'starting', subRound: val });
  renderStartingTab();
}

function renderStartingTab() {
  const container = document.getElementById('startingQuestionsList');
  if (!container || !gameState || !gameState.examData) return;
  container.innerHTML = '';

  const sub = gameState.subRound || 'ts0';
  const sel = document.getElementById('startingTurnSelect');
  if (sel) sel.value = sub;

  let questions = [];
  if (sub === 'common') {
    questions = gameState.examData.starting.common || [];
  } else {
    const sIdx = parseInt(sub.replace('ts', '')) || 0;
    questions = (gameState.examData.starting.individual && gameState.examData.starting.individual[sIdx]) || [];
  }

  if (questions.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Chưa có câu hỏi.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2';
    item.innerHTML = `
      <div class="flex-1">
        <span class="font-bold text-blue-400">Câu #${q.id || idx + 1}:</span>
        <span class="text-white ml-1">${q.question}</span>
        <p class="text-emerald-400 text-[11px] font-semibold mt-0.5">ĐA: ${q.answer}</p>
      </div>
      <div class="shrink-0 flex items-center gap-1">
        <button onclick='selectQuestion(${JSON.stringify(q)}, "main-time")' class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center gap-1">
          <i class="fa-solid fa-play text-[10px]"></i> Đẩy Lên
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function gradeStarting(isCorrect) {
  const sub = gameState?.subRound || 'ts0';
  if (sub === 'common') {
    // Common round: Buzzer winner gets points
    const winner = gameState?.buzzer?.winner || (gameState?.buzzer?.buzzedStudents && gameState.buzzer.buzzedStudents[0]);
    if (winner) {
      const delta = isCorrect ? 10 : -5;
      socket.emit('host:update-score', { studentIndex: winner.studentIndex, delta });
      triggerSound(isCorrect ? 'starting-correct' : 'starting-wrong');
    } else {
      alert('Chưa có thí sinh nào bấm chuông giành quyền!');
    }
  } else {
    // Individual turn: active student gets +10 or 0
    const sIdx = parseInt(sub.replace('ts', '')) || 0;
    if (isCorrect) {
      socket.emit('host:update-score', { studentIndex: sIdx, delta: 10 });
      triggerSound('starting-correct');
    } else {
      triggerSound('starting-wrong');
    }
  }
}

// TAB 5: VƯỢT CHƯỚNG NGẠI VẬT
function obstacleAction(action, data = {}) {
  socket.emit('host:obstacle-action', { action, ...data });
}

function startObstacle15s() {
  socket.emit('host:start-timer', { seconds: 15 });
  socket.emit('host:play-sound', { sound: 'obstacle-15s' });
  socket.emit('host:open-buzzer'); // Allow contestant to submit answers
}

function toggleObstacleAnswersView() {
  const current = gameState?.showAnswersToViewer || false;
  socket.emit('host:toggle-show-answers', { show: !current });
}

function renderObstacleTab() {
  const container = document.getElementById('obstacleRowsList');
  if (!container || !gameState || !gameState.examData) return;
  container.innerHTML = '';

  const ob = (gameState.examData.obstacle && gameState.examData.obstacle.rounds && gameState.examData.obstacle.rounds[0]) || null;
  if (!ob) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic">Chưa nạp phần thi VCNV.</p>';
    return;
  }

  // Obstacle overall banner
  const banner = document.createElement('div');
  banner.className = 'p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl mb-3 flex items-center justify-between text-xs';
  banner.innerHTML = `
    <div>
      <p class="font-bold text-purple-300">CHƯỚNG NGẠI VẬT: ${ob.answer || 'Chưa rõ'}</p>
      <p class="text-slate-400 text-[11px]">${ob.hint || 'Gợi ý'}</p>
    </div>
    <div class="flex items-center gap-1.5">
      <button onclick="awardObstaclePoints()" class="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold">
        Ghi Điểm Trả Lời Đúng CNV
      </button>
    </div>
  `;
  container.appendChild(banner);

  ob.rows.forEach((r, idx) => {
    const isRevealed = gameState.obstacle.revealedRows.includes(r.id);
    const item = document.createElement('div');
    item.className = `p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
      isRevealed ? 'bg-purple-950/30 border-purple-500/50' : 'bg-slate-950 border-slate-800'
    }`;
    item.innerHTML = `
      <div class="flex-1">
        <span class="font-bold text-purple-400">${r.name || `Hàng ngang ${idx + 1}`} (${r.charCount} chữ cái):</span>
        <p class="text-white mt-0.5">${r.question}</p>
        <p class="text-emerald-400 font-bold text-[11px]">ĐA: ${r.answer}</p>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <button onclick='selectQuestion(${JSON.stringify(r)}, "obstacle-quest-show")' class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs">
          Hiện Câu Hỏi
        </button>
        <button onclick="obstacleAction('reveal-row', { rowId: ${r.id} })" class="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs">
          Lật Ô
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function revealObstacleImage() {
  obstacleAction('reveal-image');
}

function awardObstaclePoints() {
  const winner = gameState?.buzzer?.winner || (gameState?.buzzer?.buzzedStudents && gameState.buzzer.buzzedStudents[0]);
  if (!winner) {
    alert('Chưa có thí sinh bấm chuông trả lời CNV!');
    return;
  }
  const points = prompt(`Cộng bao nhiêu điểm CNV cho ${winner.studentName}? (Gợi ý: 60, 40, 30, 20, 10)`, '60');
  if (points) {
    socket.emit('host:update-score', { studentIndex: winner.studentIndex, delta: parseInt(points) || 60 });
    triggerSound('obstacle-correct-cnv');
  }
}

// TAB 6: TĂNG TỐC
function toggleAccelerationAnswers(show) {
  socket.emit('host:toggle-show-answers', { show });
}

function awardAccelerationPoints() {
  // Take answers and award 40, 30, 20, 10 to correct students
  const ans = gameState?.accelerationAnswers || [];
  if (ans.length === 0) {
    alert('Chưa có câu trả lời nào từ thí sinh!');
    return;
  }
  const correct = ans.map(a => a.studentIndex);
  socket.emit('host:award-acceleration', { correctIndices: correct });
}

function renderAccelerationTab() {
  const container = document.getElementById('accelerationQuestionsList');
  if (!container || !gameState || !gameState.examData) return;
  container.innerHTML = '';

  const questions = gameState.examData.acceleration || [];
  if (questions.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Chưa có câu hỏi.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2';
    item.innerHTML = `
      <div class="flex-1">
        <span class="font-bold text-amber-400">Tăng tốc ${idx + 1} (${q.time || 30}s):</span>
        <p class="text-white mt-0.5">${q.question}</p>
        <p class="text-emerald-400 font-bold text-[11px]">ĐA: ${q.answer}</p>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <button onclick='selectQuestion(${JSON.stringify(q)}, "accel-quest-show")' class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs">
          Đẩy Lên
        </button>
        <button onclick="startAccelerationTimer(${q.time || 30})" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1">
          <i class="fa-solid fa-play text-[10px]"></i> Đếm Giờ
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function startAccelerationTimer(sec) {
  const soundName = sec === 20 ? 'accel-20s' : 'accel-30s';
  socket.emit('host:start-timer', { seconds: sec });
  socket.emit('host:play-sound', { sound: soundName });
  socket.emit('host:open-buzzer');
}

// TAB 7: VỀ ĐÍCH
function changeFinishStudent(idx) {
  socket.emit('host:set-round', { round: 'finish', activeStudent: parseInt(idx) });
  renderFinishTab();
}

function finishAction(action, data = {}) {
  socket.emit('host:finish-action', { action, ...data });
}

function toggleCurrentStudentStar() {
  const activeStudent = gameState?.activeStudent || 0;
  finishAction('toggle-star', { studentIndex: activeStudent });
}

function gradeFinish(isCorrect) {
  const activeStudent = gameState?.activeStudent || 0;
  const q = gameState?.currentQuestion;
  const points = (q && q.points) ? q.points : 20;

  if (gameState.finish.isStealTurn) {
    // Steal turn: A rival buzzed
    const winner = gameState?.buzzer?.winner || (gameState?.buzzer?.buzzedStudents && gameState.buzzer.buzzedStudents[0]);
    if (winner) {
      if (isCorrect) {
        socket.emit('host:update-score', { studentIndex: winner.studentIndex, delta: points });
        socket.emit('host:update-score', { studentIndex: activeStudent, delta: -points });
        triggerSound('finish-correct');
      } else {
        socket.emit('host:update-score', { studentIndex: winner.studentIndex, delta: -Math.floor(points / 2) });
        triggerSound('finish-wrong');
      }
    } else {
      alert('Chưa có thí sinh nào bấm chuông giành quyền!');
    }
  } else {
    // Normal turn: Main contestant
    const s = gameState.students[activeStudent];
    if (isCorrect) {
      const delta = s.star ? points * 2 : points;
      socket.emit('host:update-score', { studentIndex: activeStudent, delta });
      triggerSound('finish-correct');
    } else {
      if (s.star) {
        socket.emit('host:update-score', { studentIndex: activeStudent, delta: -points });
      }
      triggerSound('finish-wrong');
    }
  }
}

function renderFinishTab() {
  const container = document.getElementById('finishQuestionsList');
  if (!container || !gameState || !gameState.examData) return;
  container.innerHTML = '';

  const active = gameState.activeStudent || 0;
  const sel = document.getElementById('finishStudentSelect');
  if (sel) sel.value = active;

  const questions = (gameState.examData.finish && gameState.examData.finish.rounds && gameState.examData.finish.rounds[active]) || [];
  if (questions.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Chưa có câu hỏi.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2';
    item.innerHTML = `
      <div class="flex-1">
        <span class="font-bold text-blue-400">Câu ${idx + 1} (${q.points}đ):</span>
        <p class="text-white mt-0.5">${q.question}</p>
        <p class="text-emerald-400 font-bold text-[11px]">ĐA: ${q.answer}</p>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <button onclick='selectQuestion(${JSON.stringify(q)}, "finish-choice-chosen")' class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs">
          Đẩy Lên
        </button>
        <button onclick="startFinishTimer(${q.points === 30 ? 20 : 15})" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs">
          Đếm Giờ
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function startFinishTimer(sec) {
  const soundName = sec === 20 ? 'finish-20s' : 'finish-15s';
  socket.emit('host:start-timer', { seconds: sec });
  socket.emit('host:play-sound', { sound: soundName });
}

// TAB 8: CÂU HỎI PHỤ
function confirmSubStudents() {
  const active = [];
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`subTs${i}`);
    if (el && el.checked) active.push(i);
  }
  socket.emit('host:sub-action', { action: 'set-students', students: active });
  alert(`Đã xác nhận ${active.length} thí sinh tham gia câu hỏi phụ!`);
}

function startSubQuestion15s() {
  socket.emit('host:start-timer', { seconds: 15 });
  socket.emit('host:play-sound', { sound: 'sub-15s' });
  socket.emit('host:open-buzzer');
}

function gradeSub(isCorrect) {
  if (isCorrect) {
    triggerSound('starting-correct');
    alert('Thí sinh trả lời ĐÚNG! Trận đấu kết thúc.');
  } else {
    triggerSound('starting-wrong');
    // Continue timer for other students
    socket.emit('host:start-timer', { seconds: gameState?.timer?.timeLeft || 10 });
    socket.emit('host:open-buzzer');
  }
}

function renderSubQuestionTab() {
  const container = document.getElementById('subQuestionsList');
  if (!container || !gameState || !gameState.examData) return;
  container.innerHTML = '';

  const questions = gameState.examData.subQuestions || [];
  if (questions.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Chưa có câu hỏi phụ.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2';
    item.innerHTML = `
      <div class="flex-1">
        <span class="font-bold text-amber-400">Câu hỏi phụ #${idx + 1} (${q.time || 15}s):</span>
        <p class="text-white mt-0.5">${q.question}</p>
        <p class="text-emerald-400 font-bold text-[11px]">ĐA: ${q.answer}</p>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <button onclick='selectQuestion(${JSON.stringify(q)}, "sub-quest-show")' class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs">
          Đẩy Lên
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

// GENERIC HELPERS
function selectQuestion(q, soundTrigger = null) {
  socket.emit('host:set-question', q);
  if (soundTrigger) triggerSound(soundTrigger);
  if (q.time) setTimerPreset(q.time);
}

function updateTimerDisplay(seconds) {
  const el = document.getElementById('hostTimerText');
  if (el) el.textContent = seconds < 10 ? `0${seconds}` : seconds;
}

function timerAction(action) {
  if (action === 'start') {
    const current = gameState?.timer?.timeLeft || 30;
    socket.emit('host:start-timer', { seconds: current });
    document.getElementById('timerStatusLabel').textContent = 'ĐANG ĐẾM...';
  } else if (action === 'stop') {
    socket.emit('host:stop-timer');
  } else if (action === 'reset') {
    socket.emit('host:reset-timer', { seconds: gameState?.timer?.maxTime || 30 });
  }
}

function setTimerPreset(sec) {
  socket.emit('host:reset-timer', { seconds: sec });
  updateTimerDisplay(sec);
}

function openBuzzer() { socket.emit('host:open-buzzer'); }
function closeBuzzer() { socket.emit('host:close-buzzer'); }
function resetBuzzer() { socket.emit('host:reset-buzzer'); }

function updateScore(studentIndex, delta) {
  socket.emit('host:update-score', { studentIndex, delta });
}

function toggleStar(studentIndex) {
  socket.emit('host:finish-action', { action: 'toggle-star', studentIndex });
}

function triggerSound(sound) {
  socket.emit('host:play-sound', { sound });
  playSound(sound);
}

function stopAllSounds() {
  socket.emit('host:stop-all-sounds');
}

// Upload Exam File
async function uploadExamFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('examFile', file);

  try {
    const res = await fetch('/api/upload-exam', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      alert('Nạp đề thi thành công!');
      gameState.examData = data.examData;
      renderStartingTab();
    } else {
      alert('Lỗi nạp đề: ' + data.message);
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
      <div class="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
        <p class="font-bold text-blue-400">Thí sinh ${idx + 1}</p>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" id="modalName_${idx}" value="${s.name}" placeholder="Họ và tên" class="p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs">
          <input type="text" id="modalSchool_${idx}" value="${s.school}" placeholder="Trường THPT" class="p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs">
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
