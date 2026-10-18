const socket = io();
let gameState = null;

socket.on('connect', () => {
  socket.emit('auth', { role: 'viewer', name: 'Màn Hình Sân Khấu' });
});

socket.on('game:state', (state) => {
  gameState = state;
  renderViewer();
});

socket.on('timer:tick', ({ timeLeft }) => {
  const el = document.getElementById('viewerTimerText');
  const status = document.getElementById('viewerTimerStatus');
  if (el) el.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
  if (status) status.textContent = 'ĐANG ĐẾM';
});

socket.on('timer:ended', () => {
  const status = document.getElementById('viewerTimerStatus');
  if (status) {
    status.textContent = 'HẾT GIỜ';
    status.className = 'text-xs text-red-400 font-bold';
  }
});

socket.on('timer:paused', () => {
  const status = document.getElementById('viewerTimerStatus');
  if (status) {
    status.textContent = 'TẠM DỪNG';
    status.className = 'text-xs text-amber-400 font-semibold';
  }
});

socket.on('buzzer:first-press', (buzz) => {
  showBuzzerWinnerOnStage(buzz);
});

socket.on('buzzer:reset', () => {
  clearBuzzerAlert();
});

socket.on('sound:play', ({ sound }) => {
  playSound(sound);
});

socket.on('trailer:play', ({ trailer }) => {
  playTrailerVideo(trailer);
});

socket.on('acceleration:show-answers', ({ answers }) => {
  renderAccelerationPodium(answers);
});

function renderViewer() {
  if (!gameState) return;

  // Round Title
  const roundMap = {
    'lobby': 'VÒNG CHỜ (LOBBY)',
    'starting': 'VÒNG 1: KHỞI ĐỘNG',
    'obstacle': 'VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT',
    'acceleration': 'VÒNG 3: TĂNG TỐC',
    'finish': 'VÒNG 4: VỀ ĐÍCH',
    'summary': 'TỔNG KẾT TRAO GIẢI'
  };
  document.getElementById('viewerRoundText').textContent = roundMap[gameState.currentRound] || gameState.currentRound.toUpperCase();

  // Mode Switch (Obstacle vs Normal Question)
  const normalBox = document.getElementById('normalQuestionBox');
  const obstacleBox = document.getElementById('obstacleBox');

  if (gameState.currentRound === 'obstacle') {
    normalBox.classList.add('hidden');
    obstacleBox.classList.remove('hidden');
    renderObstacleScreen();
  } else {
    normalBox.classList.remove('hidden');
    obstacleBox.classList.add('hidden');
    renderNormalQuestion();
  }

  // Render Podiums
  renderPodiums();

  // Handle buzzer state
  if (gameState.buzzer.buzzedStudents && gameState.buzzer.buzzedStudents.length > 0) {
    showBuzzerWinnerOnStage(gameState.buzzer.buzzedStudents[0]);
  } else {
    clearBuzzerAlert();
  }
}

function renderNormalQuestion() {
  const qText = document.getElementById('viewerQuestionText');
  const tag = document.getElementById('viewerQuestionRoundTag');
  const pointsTag = document.getElementById('viewerPointsTag');
  const accelBox = document.getElementById('accelPodiumBox');

  if (gameState.currentQuestion) {
    const q = gameState.currentQuestion;
    qText.textContent = q.question || '';
    tag.textContent = q.title || 'CÂU HỎI';

    if (q.points) {
      pointsTag.textContent = `${q.points} Điểm`;
      pointsTag.classList.remove('hidden');
    } else {
      pointsTag.classList.add('hidden');
    }
  } else {
    qText.textContent = 'CHÀO MỪNG ĐẾN VỚI ĐƯỜNG LÊN ĐỈNH OLYMPIA';
    tag.textContent = 'CHỜ TRẬN ĐẤU';
    pointsTag.classList.add('hidden');
    accelBox.classList.add('hidden');
  }
}

function renderObstacleScreen() {
  const container = document.getElementById('obstacleRowsContainer');
  container.innerHTML = '';

  const ob = (gameState.examData && gameState.examData.obstacle && gameState.examData.obstacle.rounds && gameState.examData.obstacle.rounds[0]) || null;
  if (!ob) return;

  const revealed = gameState.obstacle.revealedRows || [];

  ob.rows.forEach((r, idx) => {
    const isRevealed = revealed.includes(r.id);
    const rowEl = document.createElement('div');
    rowEl.className = `p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
      isRevealed ? 'bg-purple-900/50 border-purple-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400'
    }`;

    // Crossword tile boxes for answer letters
    let letterTiles = '';
    const cleanAnswer = (r.answer || '').replace(/\s+/g, '').toUpperCase();
    const count = cleanAnswer.length || r.charCount || 5;

    for (let c = 0; c < count; c++) {
      const letter = isRevealed ? (cleanAnswer[c] || '') : '';
      letterTiles += `
        <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm border ${
          isRevealed ? 'bg-amber-400 text-slate-950 border-amber-300 shadow' : 'bg-slate-900 border-slate-700 text-transparent'
        }">
          ${letter}
        </span>
      `;
    }

    rowEl.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full ${isRevealed ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">
          ${idx + 1}
        </span>
        <span class="text-xs sm:text-sm font-bold ${isRevealed ? 'text-purple-200' : 'text-slate-300'}">
          ${r.name || `Hàng ngang ${idx + 1}`} (${count} chữ cái)
        </span>
      </div>

      <div class="flex items-center gap-1">
        ${letterTiles}
      </div>
    `;
    container.appendChild(rowEl);
  });

  // Obstacle Image reveal
  const img = document.getElementById('obstacleImg');
  const cover = document.getElementById('obstacleCoverText');
  const ansDisplay = document.getElementById('obstacleAnswerDisplay');

  if (gameState.obstacle.imageRevealed) {
    cover.classList.add('hidden');
    img.src = '/media/Obstacle/' + (ob.image || 'cnv.jpg');
    img.classList.remove('hidden');
    ansDisplay.textContent = ob.answer || 'CHƯỚNG NGẠI VẬT';
    ansDisplay.className = 'text-xl font-black text-amber-400 uppercase tracking-widest animate-bounce';
  } else {
    img.classList.add('hidden');
    cover.classList.remove('hidden');
    ansDisplay.textContent = 'CHƯỚNG NGẠI VẬT';
    ansDisplay.className = 'text-lg font-black text-purple-300 uppercase tracking-wider';
  }
}

function renderPodiums() {
  gameState.students.forEach((s, idx) => {
    const nameEl = document.getElementById(`podiumName${idx}`);
    const schoolEl = document.getElementById(`podiumSchool${idx}`);
    const scoreEl = document.getElementById(`podiumScore${idx}`);
    const starEl = document.getElementById(`podiumStar${idx}`);

    if (nameEl) nameEl.childNodes[0].textContent = s.name;
    if (schoolEl) schoolEl.textContent = s.school || 'Trường THPT';
    if (scoreEl) scoreEl.textContent = s.score;
    if (starEl) {
      if (s.star) starEl.classList.remove('hidden');
      else starEl.classList.add('hidden');
    }
  });
}

function showBuzzerWinnerOnStage(buzz) {
  const alertBox = document.getElementById('stageBuzzerAlert');
  const nameEl = document.getElementById('stageBuzzerWinnerName');
  if (alertBox && nameEl) {
    nameEl.textContent = `${buzz.studentName} ĐÃ BẤM CHUÔNG! (${buzz.elapsedMs ? (buzz.elapsedMs/1000).toFixed(2)+'s' : ''})`;
    alertBox.classList.remove('hidden');
    alertBox.classList.add('flex');
  }

  // Highlight podium
  for (let i = 0; i < 4; i++) {
    const pod = document.getElementById(`podium${i}`);
    if (pod) {
      if (i === buzz.studentIndex) {
        pod.className = 'p-3 sm:p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-400 flex flex-col justify-between transition-all duration-200 gold-glow buzz-glow scale-105';
      } else {
        pod.className = 'p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between transition-all duration-200 opacity-60';
      }
    }
  }
}

function clearBuzzerAlert() {
  const alertBox = document.getElementById('stageBuzzerAlert');
  if (alertBox) {
    alertBox.classList.add('hidden');
    alertBox.classList.remove('flex');
  }
  for (let i = 0; i < 4; i++) {
    const pod = document.getElementById(`podium${i}`);
    if (pod) {
      const s = gameState?.students?.[i];
      pod.className = `p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${
        s?.star ? 'bg-amber-950/20 border-amber-500/60' : 'bg-slate-900/90 border-slate-800'
      }`;
    }
  }
}

function renderAccelerationPodium(answers) {
  const box = document.getElementById('accelPodiumBox');
  const grid = document.getElementById('accelAnswersGrid');
  box.classList.remove('hidden');
  grid.innerHTML = '';

  if (!answers || answers.length === 0) {
    grid.innerHTML = '<p class="col-span-4 text-xs text-slate-500 italic">Không có câu trả lời nào.</p>';
    return;
  }

  const medals = [
    { label: 'NHANH NHẤT (+40đ)', color: 'border-amber-400 text-amber-300 bg-amber-950/40' },
    { label: 'THỨ HAI (+30đ)', color: 'border-slate-300 text-slate-200 bg-slate-800/40' },
    { label: 'THỨ BA (+20đ)', color: 'border-amber-600 text-amber-500 bg-amber-950/30' },
    { label: 'THỨ TƯ (+10đ)', color: 'border-blue-500 text-blue-300 bg-blue-950/30' }
  ];

  answers.forEach((ans, idx) => {
    const medal = medals[idx] || medals[3];
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border ${medal.color} shadow-lg`;
    card.innerHTML = `
      <p class="text-[10px] font-bold uppercase tracking-wider mb-1">${medal.label}</p>
      <p class="text-xs font-bold text-white mb-1">${ans.studentName}</p>
      <p class="text-base font-black text-amber-400 font-mono break-words my-2 bg-slate-950/70 p-2 rounded">${ans.answer}</p>
      <p class="text-[11px] font-mono text-slate-400"><i class="fa-regular fa-clock"></i> ${ans.time}s</p>
    `;
    grid.appendChild(card);
  });
}

function playTrailerVideo(trailerFileName) {
  const overlay = document.getElementById('trailerOverlay');
  const video = document.getElementById('trailerVideo');
  overlay.classList.remove('hidden');
  video.src = '/trailers/' + trailerFileName;
  video.currentTime = 0;
  video.play().catch(e => console.warn(e));
  video.onended = () => {
    closeTrailer();
  };
}

function closeTrailer() {
  const overlay = document.getElementById('trailerOverlay');
  const video = document.getElementById('trailerVideo');
  video.pause();
  video.src = '';
  overlay.classList.add('hidden');
}
