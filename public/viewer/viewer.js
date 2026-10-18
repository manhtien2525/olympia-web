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

socket.on('sound:stop', ({ sound }) => {
  stopSound(sound);
});

socket.on('sound:stop-all', () => {
  stopAllSounds();
});

socket.on('trailer:play', ({ trailer }) => {
  playTrailerVideo(trailer);
});

function renderViewer() {
  if (!gameState) return;

  const round = gameState.currentRound || 'lobby';
  const body = document.getElementById('viewerBody');
  const subtitle = document.getElementById('viewerRoundSubtitle');

  // Change background and subtitle based on round (matching GC App original assets)
  if (round === 'obstacle') {
    body.style.backgroundImage = "url('/assets/gcapp/backgroundv2.jpg')";
    subtitle.textContent = "PHẦN THI VƯỢT CHƯỚNG NGẠI VẬT";
  } else if (round === 'acceleration') {
    body.style.backgroundImage = "url('/assets/gcapp/backgroundv3.png')";
    subtitle.textContent = "PHẦN THI TĂNG TỐC";
  } else if (round === 'finish') {
    body.style.backgroundImage = "url('/assets/gcapp/backgroundv4.jpg')";
    subtitle.textContent = "PHẦN THI VỀ ĐÍCH";
  } else if (round === 'sub_question') {
    body.style.backgroundImage = "url('/assets/gcapp/backgroundpractice.jpg')";
    subtitle.textContent = "PHẦN THI CÂU HỎI PHỤ";
  } else if (round === 'scoreboard_image') {
    body.style.backgroundImage = "url('/assets/gcapp/background.jpg')";
    subtitle.textContent = "BẢNG ĐIỂM HÌNH ẢNH TỔNG KẾT";
  } else if (round === 'starting') {
    body.style.backgroundImage = "url('/assets/gcapp/background.jpg')";
    subtitle.textContent = "PHẦN THI KHỞI ĐỘNG";
  } else {
    body.style.backgroundImage = "url('/assets/gcapp/background.jpg')";
    subtitle.textContent = "SẢNH CHỜ TRẬN ĐẤU";
  }

  // Toggle Mode Displays
  const normalBox = document.getElementById('normalQuestionBox');
  const obstacleBox = document.getElementById('obstacleBox');
  const scoreboardBox = document.getElementById('scoreboardImageBox');
  const packageBox = document.getElementById('finishPackageBox');

  // Hide all first
  normalBox.classList.add('hidden');
  obstacleBox.classList.add('hidden');
  scoreboardBox.classList.add('hidden');
  packageBox.classList.add('hidden');

  if (round === 'obstacle' && gameState.obstacle && gameState.obstacle.rowsVisible) {
    obstacleBox.classList.remove('hidden');
    renderObstacleScreen();
  } else if (round === 'scoreboard_image') {
    scoreboardBox.classList.remove('hidden');
    renderScoreboardImageScreen();
  } else if (round === 'finish' && gameState.finish && gameState.finish.showPackageUI) {
    packageBox.classList.remove('hidden');
    renderPackageScreen();
  } else {
    normalBox.classList.remove('hidden');
    renderNormalQuestion();
  }

  // Render Contestant Podiums
  renderPodiums();

  // Handle buzzer highlight
  if (gameState.buzzer && gameState.buzzer.winner) {
    showBuzzerWinnerOnStage(gameState.buzzer.winner);
  } else if (gameState.buzzer && gameState.buzzer.buzzedStudents && gameState.buzzer.buzzedStudents.length > 0) {
    showBuzzerWinnerOnStage(gameState.buzzer.buzzedStudents[0]);
  } else {
    clearBuzzerAlert();
  }
}

function renderNormalQuestion() {
  const qText = document.getElementById('viewerQuestionText');
  const tag = document.getElementById('viewerQuestionTag');
  const badge = document.getElementById('viewerPointsBadge');
  const accelBox = document.getElementById('accelPodiumBox');

  if (gameState.currentQuestion) {
    const q = gameState.currentQuestion;
    qText.textContent = q.question || '';
    tag.textContent = q.title || 'CÂU HỎI';

    if (q.points) {
      badge.textContent = `${q.points} Điểm`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } else {
    qText.textContent = 'CHÀO MỪNG ĐẾN VỚI ĐƯỜNG LÊN ĐỈNH OLYMPIA';
    tag.textContent = 'CHỜ TRẬN ĐẤU';
    badge.classList.add('hidden');
  }

  // Acceleration Answers Reveal
  if (gameState.currentRound === 'acceleration' && gameState.showAnswersToViewer) {
    renderAccelerationPodium(gameState.accelerationAnswers);
    accelBox.classList.remove('hidden');
  } else {
    accelBox.classList.add('hidden');
  }
}

// VCNV (Obstacle) with 5 Puzzle Pieces
function renderObstacleScreen() {
  const container = document.getElementById('obstacleRowsContainer');
  container.innerHTML = '';

  const ob = (gameState.examData && gameState.examData.obstacle && gameState.examData.obstacle.rounds && gameState.examData.obstacle.rounds[0]) || null;
  if (!ob) return;

  const revealed = gameState.obstacle.revealedRows || [];

  ob.rows.forEach((r, idx) => {
    const isRevealed = revealed.includes(r.id);
    const rowEl = document.createElement('div');
    rowEl.className = `p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
      isRevealed ? 'bg-purple-900/60 border-purple-400 text-white shadow-lg' : 'bg-slate-950/80 border-slate-800 text-slate-400'
    }`;

    // Crossword tile boxes for answer letters
    let letterTiles = '';
    const cleanAnswer = (r.answer || '').replace(/\s+/g, '').toUpperCase();
    const count = cleanAnswer.length || r.charCount || 5;

    for (let c = 0; c < count; c++) {
      const letter = isRevealed ? (cleanAnswer[c] || '') : '';
      letterTiles += `
        <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs sm:text-sm border ${
          isRevealed ? 'bg-amber-400 text-slate-950 border-amber-300 shadow' : 'bg-slate-900 border-slate-700 text-transparent'
        }">
          ${letter}
        </span>
      `;
    }

    rowEl.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg ${isRevealed ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-black">
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

  // Handle 5 Puzzle Pieces:
  // Row 1 -> topleft, Row 2 -> topright, Row 3 -> bottomleft, Row 4 -> bottomright, Center/Row 5 -> center
  const pieceTopLeft = document.getElementById('piece-topleft');
  const pieceTopRight = document.getElementById('piece-topright');
  const pieceBottomLeft = document.getElementById('piece-bottomleft');
  const pieceBottomRight = document.getElementById('piece-bottomright');
  const pieceCenter = document.getElementById('piece-center');
  const ansDisplay = document.getElementById('obstacleAnswerDisplay');

  if (gameState.obstacle.imageRevealed) {
    pieceTopLeft.classList.add('hidden-piece');
    pieceTopRight.classList.add('hidden-piece');
    pieceBottomLeft.classList.add('hidden-piece');
    pieceBottomRight.classList.add('hidden-piece');
    pieceCenter.classList.add('hidden-piece');
    ansDisplay.textContent = ob.answer || 'CHƯỚNG NGẠI VẬT';
    ansDisplay.className = 'text-xl font-black text-amber-400 uppercase tracking-widest animate-bounce mt-3';
  } else {
    ansDisplay.textContent = 'CHƯỚNG NGẠI VẬT';
    ansDisplay.className = 'text-base font-black text-purple-300 uppercase tracking-widest mt-3';

    // Check individual revealed rows
    if (revealed.includes(1)) pieceTopLeft.classList.add('hidden-piece');
    else pieceTopLeft.classList.remove('hidden-piece');

    if (revealed.includes(2)) pieceTopRight.classList.add('hidden-piece');
    else pieceTopRight.classList.remove('hidden-piece');

    if (revealed.includes(3)) pieceBottomLeft.classList.add('hidden-piece');
    else pieceBottomLeft.classList.remove('hidden-piece');

    if (revealed.includes(4)) pieceBottomRight.classList.add('hidden-piece');
    else pieceBottomRight.classList.remove('hidden-piece');

    if (revealed.includes(5) || revealed.includes(ob.rows.length)) pieceCenter.classList.add('hidden-piece');
    else pieceCenter.classList.remove('hidden-piece');
  }
}

// Acceleration Podium
function renderAccelerationPodium(answers) {
  const grid = document.getElementById('accelAnswersGrid');
  grid.innerHTML = '';

  if (!answers || answers.length === 0) {
    grid.innerHTML = '<p class="col-span-4 text-xs text-slate-400 italic">Không có câu trả lời nào được gửi.</p>';
    return;
  }

  const medals = [
    { label: 'NHANH NHẤT (+40đ)', color: 'border-amber-400 text-amber-300 bg-amber-950/60' },
    { label: 'THỨ HAI (+30đ)', color: 'border-slate-300 text-slate-200 bg-slate-800/60' },
    { label: 'THỨ BA (+20đ)', color: 'border-amber-600 text-amber-400 bg-amber-950/40' },
    { label: 'THỨ TƯ (+10đ)', color: 'border-blue-500 text-blue-300 bg-blue-950/40' }
  ];

  answers.forEach((ans, idx) => {
    const medal = medals[idx] || medals[3];
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border ${medal.color} shadow-lg backdrop-blur-md`;
    card.innerHTML = `
      <p class="text-[10px] font-black uppercase tracking-wider mb-1">${medal.label}</p>
      <p class="text-xs font-bold text-white mb-1">${ans.studentName}</p>
      <p class="text-base font-black text-amber-400 font-mono break-words my-1 bg-black/60 p-1.5 rounded">${ans.answer}</p>
      <p class="text-[11px] font-mono text-slate-300"><i class="fa-regular fa-clock"></i> ${ans.time}s</p>
    `;
    grid.appendChild(card);
  });
}

// Scoreboard Image Screen
function renderScoreboardImageScreen() {
  const container = document.getElementById('scoreboardImageCards');
  container.innerHTML = '';
  gameState.students.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/50 flex flex-col items-center text-center shadow-2xl relative overflow-hidden';
    card.innerHTML = `
      <div class="w-24 h-32 rounded-xl bg-slate-950 border border-blue-400/50 mb-3 overflow-hidden shadow-inner flex items-center justify-center">
        <img src="/assets/gcapp/${idx + 1}.png" alt="TS" class="w-full h-full object-cover">
      </div>
      <span class="text-[11px] font-black text-blue-300 uppercase bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/40">Thí sinh ${idx + 1}</span>
      <h3 class="text-base font-black text-white mt-1 truncate max-w-full">${s.name}</h3>
      <p class="text-xs text-slate-400 truncate max-w-full mb-3">${s.school}</p>
      <div class="w-full py-2 bg-black/70 rounded-xl border border-amber-500/40">
        <span class="text-3xl font-black text-amber-400 font-mono">${s.score}</span>
        <span class="text-xs text-slate-400 block -mt-1 font-semibold">ĐIỂM</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Finish Package Screen
function renderPackageScreen() {
  const container = document.getElementById('finishPackageDisplay');
  container.innerHTML = `
    <div class="w-28 h-28 rounded-2xl bg-blue-900/60 border-2 border-blue-400 flex items-center justify-center text-3xl font-black text-amber-400 font-mono shadow-xl">
      20đ
    </div>
    <div class="w-28 h-28 rounded-2xl bg-blue-900/60 border-2 border-blue-400 flex items-center justify-center text-3xl font-black text-amber-400 font-mono shadow-xl">
      20đ
    </div>
    <div class="w-28 h-28 rounded-2xl bg-blue-900/60 border-2 border-blue-400 flex items-center justify-center text-3xl font-black text-amber-400 font-mono shadow-xl">
      30đ
    </div>
  `;
}

// Contestant Podiums at Bottom
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

  for (let i = 0; i < 4; i++) {
    const pod = document.getElementById(`podium${i}`);
    if (pod) {
      if (i === buzz.studentIndex) {
        pod.className = 'p-3 rounded-2xl bg-amber-950/90 border-2 border-amber-400 flex flex-col justify-between transition-all duration-300 gold-glow buzz-anim scale-105';
      } else {
        pod.className = 'p-3 rounded-2xl bg-slate-950/80 border border-blue-900/60 flex flex-col justify-between transition-all duration-300 opacity-60';
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
      pod.className = `p-3 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
        s?.star ? 'bg-amber-950/30 border-amber-500' : 'bg-slate-950/80 border-blue-900/60'
      }`;
    }
  }
}

function playTrailerVideo(trailerFileName) {
  const overlay = document.getElementById('trailerOverlay');
  const video = document.getElementById('trailerVideo');
  overlay.classList.remove('hidden');
  video.src = '/trailers/' + trailerFileName;
  video.currentTime = 0;
  video.play().catch(e => console.warn(e));
  video.onended = () => {
    overlay.classList.add('hidden');
    video.src = '';
  };
}
