const socket = io();
let gameState = null;

socket.on('connect', () => {
  socket.emit('auth', { role: 'mc', name: 'MC Dẫn Chương Trình' });
});

socket.on('game:state', (state) => {
  gameState = state;
  renderMCState();
});

socket.on('timer:tick', ({ timeLeft }) => {
  const el = document.getElementById('mcTimer');
  if (el) el.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
});

socket.on('ts:answer-received', (ans) => {
  renderSubmittedAnswers();
});

socket.on('buzzer:first-press', () => {
  renderBuzzerList();
});

function renderMCState() {
  if (!gameState) return;

  // Round label
  const roundNames = {
    'lobby': 'Chờ Trận Đấu (Lobby)',
    'starting': 'Khởi Động',
    'obstacle': 'Vượt Chướng Ngại Vật',
    'acceleration': 'Tăng Tốc',
    'finish': 'Về Đích',
    'summary': 'Tổng Kết'
  };
  document.getElementById('mcRoundLabel').textContent = roundNames[gameState.currentRound] || gameState.currentRound;

  // Timer
  const timerEl = document.getElementById('mcTimer');
  if (timerEl) {
    const tl = gameState.timer.timeLeft || 0;
    timerEl.textContent = tl < 10 ? `0${tl}` : tl;
  }

  // Question & Answer
  const qText = document.getElementById('mcQuestionText');
  const aText = document.getElementById('mcAnswerText');
  const aNote = document.getElementById('mcAnswerNote');
  const meta = document.getElementById('mcQuestionMeta');
  const badge = document.getElementById('mcPointsBadge');

  if (gameState.currentQuestion) {
    const q = gameState.currentQuestion;
    qText.textContent = q.question || '';
    aText.textContent = q.answer || '(Chưa có)';
    meta.textContent = q.title || 'CÂU HỎI TRỰC TIẾP';

    if (q.points) {
      badge.textContent = `${q.points} Điểm`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (q.note) {
      aNote.textContent = 'Chú thích: ' + q.note;
      aNote.classList.remove('hidden');
    } else {
      aNote.classList.add('hidden');
    }
  } else {
    qText.textContent = 'Chờ Ban Tổ Chức (Host) chọn câu hỏi...';
    aText.textContent = '(Chờ câu hỏi)';
    meta.textContent = 'CÂU HỎI TRỰC TIẾP';
    badge.classList.add('hidden');
    aNote.classList.add('hidden');
  }

  // Buzzer Status
  renderBuzzerList();

  // Students Scores
  renderStudentsScores();

  // Submitted answers
  renderSubmittedAnswers();
}

function renderBuzzerList() {
  const badge = document.getElementById('mcBuzzerStateBadge');
  const list = document.getElementById('mcBuzzerRankingList');

  if (gameState.buzzer.open) {
    badge.textContent = 'ĐANG MỞ';
    badge.className = 'font-bold text-emerald-400';
  } else {
    badge.textContent = 'ĐANG KHÓA';
    badge.className = 'font-bold text-red-400';
  }

  if (!gameState.buzzer.buzzedStudents || gameState.buzzer.buzzedStudents.length === 0) {
    list.innerHTML = '<p class="text-slate-500 text-xs italic text-center py-4">Chưa có ai bấm chuông</p>';
    return;
  }

  list.innerHTML = '';
  gameState.buzzer.buzzedStudents.forEach((b, idx) => {
    const item = document.createElement('div');
    item.className = `p-3 rounded-xl border flex items-center justify-between text-xs transition ${
      idx === 0
        ? 'bg-amber-950/40 border-amber-500 text-amber-200 font-bold'
        : 'bg-slate-950 border-slate-800 text-slate-300'
    }`;
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full ${idx === 0 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs">
          ${idx + 1}
        </span>
        <span>${b.studentName}</span>
      </div>
      <span class="font-mono text-slate-400">${b.elapsedMs ? (b.elapsedMs / 1000).toFixed(2) + 's' : '0.00s'}</span>
    `;
    list.appendChild(item);
  });
}

function renderStudentsScores() {
  const container = document.getElementById('mcStudentsScoreList');
  container.innerHTML = '';

  gameState.students.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border flex items-center justify-between text-xs ${
      s.star ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800 bg-slate-950'
    }`;
    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-blue-900/60 text-blue-300 font-bold flex items-center justify-center text-xs">
          ${idx + 1}
        </span>
        <div>
          <p class="font-bold text-white flex items-center gap-1">
            ${s.name}
            ${s.star ? '<i class="fa-solid fa-star text-amber-400 text-[10px]"></i>' : ''}
          </p>
          <p class="text-[10px] text-slate-400">${s.school}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-base font-black text-amber-400 font-mono">${s.score}</span>
        <span class="text-[9px] text-slate-500 block -mt-1">điểm</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSubmittedAnswers() {
  const container = document.getElementById('mcSubmittedAnswers');
  if (!gameState || !gameState.accelerationAnswers || gameState.accelerationAnswers.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 text-center py-6 text-slate-500 text-xs italic">
        Chưa có thí sinh nào gửi câu trả lời cho câu hỏi này.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  gameState.accelerationAnswers.forEach((ans, idx) => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-slate-950 border border-blue-500/30 rounded-xl';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs mb-1.5 pb-1 border-b border-slate-800">
        <span class="font-bold text-blue-300">${ans.studentName}</span>
        <span class="text-[11px] font-mono text-amber-400"><i class="fa-regular fa-clock"></i> ${ans.time}s</span>
      </div>
      <p class="text-sm font-extrabold text-white font-mono break-words">${ans.answer}</p>
    `;
    container.appendChild(card);
  });
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
