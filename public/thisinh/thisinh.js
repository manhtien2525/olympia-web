const socket = io();
let currentUser = null;
let currentStudentIndex = 0;
let gameState = null;
let hasBuzzed = false;

function getUserFromCookie() {
  const match = document.cookie.match(/olympia_user=([^;]+)/);
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {}
  }
  return null;
}

currentUser = getUserFromCookie();
if (currentUser && currentUser.studentIndex !== undefined) {
  currentStudentIndex = currentUser.studentIndex;
}

// Connect & Auth
socket.on('connect', () => {
  socket.emit('auth', currentUser || { role: 'thi_sinh', studentIndex: currentStudentIndex });
});

socket.on('game:state', (state) => {
  gameState = state;
  renderState();
});

socket.on('timer:tick', ({ timeLeft }) => {
  const el = document.getElementById('tsTimer');
  if (el) el.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
});

socket.on('timer:started', () => {
  const status = document.getElementById('typingStatus');
  if (status) status.textContent = 'Thời gian bắt đầu! Bạn có thể gửi đáp án.';
});

socket.on('timer:ended', () => {
  const status = document.getElementById('typingStatus');
  if (status) status.textContent = 'Hết giờ gửi đáp án!';
});

socket.on('buzzer:opened', () => {
  hasBuzzed = false;
  setBuzzerReady(true);
});

socket.on('buzzer:closed', () => {
  setBuzzerReady(false);
});

socket.on('buzzer:reset', () => {
  hasBuzzed = false;
  setBuzzerReady(false);
});

socket.on('buzzer:first-press', (buzz) => {
  handleBuzzerPress(buzz);
});

socket.on('sub:fault', (data) => {
  if (data.studentIndex === currentStudentIndex) {
    const alertBox = document.getElementById('faultAlert');
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
  }
});

socket.on('ts:answer-confirmed', ({ answer, time }) => {
  const fb = document.getElementById('answerFeedback');
  const txt = document.getElementById('submittedAnswerText');
  const t = document.getElementById('submittedAnswerTime');
  txt.textContent = `Đã gửi: "${answer}"`;
  t.textContent = `${time}s`;
  fb.classList.remove('hidden');
});

function renderState() {
  if (!gameState) return;

  const me = gameState.students[currentStudentIndex] || { name: `Thí sinh ${currentStudentIndex + 1}`, score: 0, school: '' };

  document.getElementById('studentAvatarImg').src = `/assets/gcapp/${currentStudentIndex + 1}.png`;
  document.getElementById('studentName').childNodes[0].textContent = me.name + ' ';
  document.getElementById('studentSchool').textContent = me.school || '';
  document.getElementById('studentScore').textContent = me.score;

  const starIcon = document.getElementById('starIcon');
  if (me.star) starIcon.classList.remove('hidden');
  else starIcon.classList.add('hidden');

  // Mini scores of all 4
  gameState.students.forEach((s, idx) => {
    const el = document.getElementById(`miniScore${idx}`);
    if (el) el.textContent = s.score;
  });

  // Question details
  const qRound = document.getElementById('tsQuestionRound');
  const qPoints = document.getElementById('tsQuestionPoints');
  const qText = document.getElementById('tsQuestionText');

  const roundNames = {
    'lobby': 'Sảnh Chờ Trận Đấu',
    'starting': 'Khởi Động',
    'obstacle': 'Vượt Chướng Ngại Vật',
    'acceleration': 'Tăng Tốc',
    'finish': 'Về Đích',
    'sub_question': 'Câu Hỏi Phụ',
    'scoreboard_image': 'Bảng Điểm Tổng Kết'
  };
  qRound.textContent = roundNames[gameState.currentRound] || 'PHẦN THI';

  if (gameState.currentQuestion) {
    const q = gameState.currentQuestion;
    qText.textContent = q.question || '';
    if (q.points) {
      qPoints.textContent = `${q.points} Điểm`;
      qPoints.classList.remove('hidden');
    } else {
      qPoints.classList.add('hidden');
    }
  } else {
    qText.textContent = 'Chờ câu hỏi từ Ban Tổ Chức...';
    qPoints.classList.add('hidden');
  }

  // Answer section visibility
  const answerSection = document.getElementById('answerInputSection');
  if (gameState.currentRound === 'acceleration' || gameState.currentRound === 'obstacle') {
    answerSection.classList.remove('hidden');
  } else {
    answerSection.classList.remove('hidden');
  }

  // Buzzer button state
  if (gameState.buzzer && gameState.buzzer.buzzedStudents && gameState.buzzer.buzzedStudents.length > 0) {
    handleBuzzerPress(gameState.buzzer.buzzedStudents[0]);
  } else if (gameState.buzzer && gameState.buzzer.open) {
    setBuzzerReady(true);
  } else {
    setBuzzerReady(false);
  }
}

function setBuzzerReady(isReady) {
  const btn = document.getElementById('bigBuzzerBtn');
  const icon = document.getElementById('buzzerIcon');
  const label = document.getElementById('buzzerLabel');
  const subLabel = document.getElementById('buzzerSubLabel');

  if (isReady && !hasBuzzed) {
    btn.disabled = false;
    btn.className = 'w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-emerald-400 bg-gradient-to-b from-emerald-500 to-emerald-700 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-2xl buzzer-ready-pulse cursor-pointer';
    icon.className = 'fa-solid fa-bell text-4xl sm:text-5xl text-white mb-1.5';
    label.className = 'text-base sm:text-lg font-black tracking-wider uppercase text-white';
    label.textContent = 'BẤM CHUÔNG!';
    subLabel.textContent = 'Nhấn ngay để giành quyền';
    subLabel.className = 'text-[11px] text-emerald-100 font-semibold mt-1';

    if (navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }
  } else if (!hasBuzzed) {
    btn.disabled = true;
    btn.className = 'w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-slate-700 bg-slate-800 flex flex-col items-center justify-center transition-all duration-150 shadow-2xl cursor-not-allowed opacity-80';
    icon.className = 'fa-solid fa-bell text-4xl sm:text-5xl text-slate-500 mb-1.5';
    label.className = 'text-sm sm:text-base font-black tracking-wider uppercase text-slate-500';
    label.textContent = 'CHUÔNG ĐANG KHÓA';
    subLabel.textContent = 'Chờ hiệu lệnh';
    subLabel.className = 'text-[10px] text-slate-400 mt-1';
  }
}

function pressBuzzer() {
  hasBuzzed = true;
  socket.emit('ts:buzz');

  if (navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch (e) {}
  }
}

function handleBuzzerPress(buzz) {
  const btn = document.getElementById('bigBuzzerBtn');
  const icon = document.getElementById('buzzerIcon');
  const label = document.getElementById('buzzerLabel');
  const subLabel = document.getElementById('buzzerSubLabel');

  btn.disabled = true;

  if (buzz.studentIndex === currentStudentIndex) {
    // You won the buzz!
    btn.className = 'w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 flex flex-col items-center justify-center transition-all duration-150 shadow-2xl scale-105';
    icon.className = 'fa-solid fa-trophy text-4xl sm:text-5xl text-slate-950 mb-1.5 animate-bounce';
    label.className = 'text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 text-center px-2';
    label.textContent = 'BẠN ĐÃ GIÀNH QUYỀN!';
    subLabel.textContent = buzz.elapsedMs ? `${(buzz.elapsedMs / 1000).toFixed(2)}s` : '0.00s';
    subLabel.className = 'text-xs text-slate-900 font-mono font-bold mt-1';
  } else {
    // Other contestant won
    btn.className = 'w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-red-800 bg-red-950/60 flex flex-col items-center justify-center transition-all duration-150 shadow-2xl cursor-not-allowed';
    icon.className = 'fa-solid fa-lock text-4xl sm:text-5xl text-red-400 mb-1.5';
    label.className = 'text-xs sm:text-sm font-black tracking-wider uppercase text-red-300 text-center px-4';
    label.textContent = `${buzz.studentName} đã bấm trước`;
    subLabel.textContent = buzz.elapsedMs ? `${(buzz.elapsedMs / 1000).toFixed(2)}s` : '';
    subLabel.className = 'text-[10px] text-red-400 font-mono mt-1';
  }
}

// Submit Answer
document.getElementById('answerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('answerInput');
  const answer = input.value.trim();
  if (!answer) return;

  socket.emit('ts:submit-answer', { answer });
  input.value = '';
});

// Feature: Bảng điểm cá nhân (Cửa sổ rời như hướng dẫn trong GC App PDF II.3.I)
function openPersonalScoreWindow() {
  const me = gameState?.students?.[currentStudentIndex] || { name: `Thí sinh ${currentStudentIndex + 1}`, score: 0 };
  const pop = window.open('', '_blank', 'width=600,height=500');
  pop.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bảng Điểm Cá Nhân - ${me.name}</title>
      <style>
        body { margin:0; background:#020617; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; overflow:hidden; }
        .name { font-size: 28px; font-weight: bold; text-transform: uppercase; color: #93c5fd; }
        .score { font-size: 140px; font-weight: 900; color: #fbbf24; font-family: monospace; line-height: 1; margin: 20px 0; }
        .label { font-size: 20px; font-weight: bold; color: #64748b; letter-spacing: 4px; }
      </style>
    </head>
    <body>
      <div class="name">${me.name}</div>
      <div class="score" id="popScore">${me.score}</div>
      <div class="label">ĐIỂM</div>
      <script>
        window.addEventListener('message', (e) => {
          if (e.data && e.data.score !== undefined) {
            document.getElementById('popScore').textContent = e.data.score;
          }
        });
      <\/script>
    </body>
    </html>
  `);
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
