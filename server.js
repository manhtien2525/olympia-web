const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { parseExamExcel } = require('./lib/exam-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Load accounts
const accountsPath = path.join(__dirname, 'config', 'accounts.json');
let accounts = [];
try {
  accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
} catch (e) {
  console.error('Failed to load accounts.json, using default accounts.', e);
}

// Multer for upload
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initial Game State
const examFilePath = path.join(__dirname, 'data', 'default_exam.xlsx');
let examData = parseExamExcel(examFilePath);

const gameState = {
  // GC App Tab/Round names: 'lobby', 'preview', 'scoreboard_image', 'starting', 'obstacle', 'acceleration', 'finish', 'sub_question'
  currentRound: 'lobby',
  subRound: 'ts0', // for starting: 'ts0', 'ts1', 'ts2', 'ts3', 'common'
  currentQuestion: null,
  activeStudent: 0, // Thí sinh đang có lượt
  timer: {
    running: false,
    timeLeft: 0,
    maxTime: 0,
    startTime: 0
  },
  buzzer: {
    open: false,
    buzzedStudents: [], // [{ studentIndex, time, elapsedMs }]
    winner: null
  },
  students: [
    { index: 0, name: 'Thí sinh 1', school: 'THPT Chuyên Hà Nội - Amsterdam', score: 0, connected: false, answer: '', answerTime: null, star: false, eliminated: false, fault: false },
    { index: 1, name: 'Thí sinh 2', school: 'THPT Chuyên Lê Hồng Phong', score: 0, connected: false, answer: '', answerTime: null, star: false, eliminated: false, fault: false },
    { index: 2, name: 'Thí sinh 3', school: 'THPT Chuyên Lam Sơn', score: 0, connected: false, answer: '', answerTime: null, star: false, eliminated: false, fault: false },
    { index: 3, name: 'Thí sinh 4', school: 'THPT Chuyên Quốc Học Huế', score: 0, connected: false, answer: '', answerTime: null, star: false, eliminated: false, fault: false }
  ],
  obstacle: {
    rowsVisible: false,
    selectedRowId: null,
    revealedRows: [], // list of row IDs revealed
    imageRevealed: false,
    eliminatedStudents: [] // Thí sinh bị loại khỏi phần thi CNV
  },
  accelerationAnswers: [], // [{ studentIndex, studentName, answer, time }]
  showAnswersToViewer: false, // Hiện câu trả lời lên viewer
  finish: {
    showPackageUI: false,
    selectedPackage: [], // [20, 20, 30]
    currentQuestionIndex: 0,
    isStealTurn: false // Đang trong 5 giây giành quyền
  },
  subQuestion: {
    activeStudents: [0, 1, 2, 3], // Những thí sinh tham gia câu hỏi phụ
    faultStudents: [] // Thí sinh bấm chuông trước hiệu lệnh
  },
  examData: examData
};

let timerInterval = null;

function broadcastState() {
  io.emit('game:state', gameState);
}

function startTimer(seconds) {
  stopTimer();
  gameState.timer.maxTime = seconds;
  gameState.timer.timeLeft = seconds;
  gameState.timer.running = true;
  gameState.timer.startTime = Date.now();

  timerInterval = setInterval(() => {
    if (gameState.timer.timeLeft > 0) {
      gameState.timer.timeLeft -= 1;
      io.emit('timer:tick', {
        timeLeft: gameState.timer.timeLeft,
        maxTime: gameState.timer.maxTime
      });
      if (gameState.timer.timeLeft <= 0) {
        stopTimer();
        io.emit('timer:ended');
      }
    } else {
      stopTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  gameState.timer.running = false;
  io.emit('timer:paused', { timeLeft: gameState.timer.timeLeft });
}

function resetTimer(seconds) {
  stopTimer();
  gameState.timer.timeLeft = seconds !== undefined ? seconds : (gameState.timer.maxTime || 0);
  io.emit('timer:tick', {
    timeLeft: gameState.timer.timeLeft,
    maxTime: gameState.timer.maxTime
  });
}

// REST API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = accounts.find(a => a.username === username && a.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu!' });
  }

  res.cookie('olympia_user', JSON.stringify({
    username: user.username,
    role: user.role,
    name: user.name,
    studentIndex: user.studentIndex
  }), { httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });

  let redirectUrl = '/';
  if (user.role === 'host') redirectUrl = '/host';
  else if (user.role === 'mc') redirectUrl = '/mc';
  else if (user.role === 'thi_sinh') redirectUrl = '/thisinh';
  else if (user.role === 'viewer') redirectUrl = '/viewer';

  res.json({ success: true, user, redirectUrl });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('olympia_user');
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  try {
    const raw = req.cookies.olympia_user;
    if (!raw) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, user: JSON.parse(raw) });
  } catch (e) {
    res.status(401).json({ authenticated: false });
  }
});

app.get('/api/game-state', (req, res) => {
  res.json(gameState);
});

app.post('/api/upload-exam', upload.single('examFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Chưa chọn file đề thi!' });
  try {
    const targetPath = path.join(__dirname, 'data', 'default_exam.xlsx');
    fs.copyFileSync(req.file.path, targetPath);
    fs.unlinkSync(req.file.path);
    gameState.examData = parseExamExcel(targetPath);
    broadcastState();
    res.json({ success: true, message: 'Đã nạp đề thi thành công!', examData: gameState.examData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi nạp file: ' + err.message });
  }
});

app.post('/api/update-students', (req, res) => {
  const { students } = req.body;
  if (Array.isArray(students)) {
    students.forEach((s, idx) => {
      if (gameState.students[idx]) {
        if (s.name) gameState.students[idx].name = s.name;
        if (s.school) gameState.students[idx].school = s.school;
        if (s.score !== undefined) gameState.students[idx].score = parseInt(s.score) || 0;
      }
    });
    broadcastState();
    res.json({ success: true, students: gameState.students });
  } else {
    res.status(400).json({ success: false });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('auth', (user) => {
    currentUser = user;
    if (user && user.role) {
      socket.join(`${user.role}_room`);
      if (user.role === 'thi_sinh' && user.studentIndex !== undefined) {
        if (gameState.students[user.studentIndex]) {
          gameState.students[user.studentIndex].connected = true;
          broadcastState();
        }
      }
    }
    socket.emit('game:state', gameState);
  });

  // Host Controls: Tabs & Rounds
  socket.on('host:set-round', ({ round, subRound, activeStudent }) => {
    gameState.currentRound = round;
    if (subRound !== undefined) gameState.subRound = subRound;
    if (activeStudent !== undefined) gameState.activeStudent = activeStudent;

    gameState.currentQuestion = null;
    gameState.accelerationAnswers = [];
    gameState.showAnswersToViewer = false;
    gameState.buzzer.open = false;
    gameState.buzzer.buzzedStudents = [];
    gameState.buzzer.winner = null;
    stopTimer();

    // If lobby, stop all sound effects
    if (round === 'lobby') {
      io.emit('sound:stop-all');
    }

    broadcastState();
  });

  socket.on('host:set-question', (question) => {
    gameState.currentQuestion = question;
    gameState.accelerationAnswers = [];
    gameState.showAnswersToViewer = false;
    gameState.buzzer.buzzedStudents = [];
    gameState.buzzer.winner = null;
    broadcastState();
  });

  // Timer controls
  socket.on('host:start-timer', ({ seconds }) => {
    startTimer(seconds);
    io.emit('timer:started', { seconds });
  });

  socket.on('host:stop-timer', () => {
    stopTimer();
  });

  socket.on('host:reset-timer', ({ seconds }) => {
    resetTimer(seconds);
  });

  // Buzzer controls
  socket.on('host:open-buzzer', () => {
    gameState.buzzer.open = true;
    gameState.buzzer.buzzedStudents = [];
    gameState.buzzer.winner = null;
    io.emit('buzzer:opened');
    broadcastState();
  });

  socket.on('host:close-buzzer', () => {
    gameState.buzzer.open = false;
    io.emit('buzzer:closed');
    broadcastState();
  });

  socket.on('host:reset-buzzer', () => {
    gameState.buzzer.buzzedStudents = [];
    gameState.buzzer.winner = null;
    gameState.buzzer.open = false;
    io.emit('buzzer:reset');
    broadcastState();
  });

  // Score adjustments
  socket.on('host:update-score', ({ studentIndex, delta }) => {
    if (gameState.students[studentIndex]) {
      gameState.students[studentIndex].score += delta;
      io.emit('score:updated', {
        studentIndex,
        newScore: gameState.students[studentIndex].score,
        delta
      });
      broadcastState();
    }
  });

  // VCNV Controls
  socket.on('host:obstacle-action', (payload) => {
    const { action } = payload;
    if (action === 'show-rows') {
      gameState.obstacle.rowsVisible = true;
      io.emit('sound:play', { sound: 'obstacle-rows-show' });
    } else if (action === 'hide-rows') {
      gameState.obstacle.rowsVisible = false;
    } else if (action === 'select-row') {
      gameState.obstacle.selectedRowId = payload.rowId;
      io.emit('sound:play', { sound: 'obstacle-row-choose' });
    } else if (action === 'reveal-row') {
      if (!gameState.obstacle.revealedRows.includes(payload.rowId)) {
        gameState.obstacle.revealedRows.push(payload.rowId);
        io.emit('sound:play', { sound: 'obstacle-correct-row' });
      }
    } else if (action === 'reveal-image') {
      gameState.obstacle.imageRevealed = true;
      io.emit('sound:play', { sound: 'obstacle-correct-cnv' });
    } else if (action === 'eliminate') {
      const sIdx = payload.studentIndex;
      if (!gameState.obstacle.eliminatedStudents.includes(sIdx)) {
        gameState.obstacle.eliminatedStudents.push(sIdx);
        gameState.students[sIdx].eliminated = true;
      }
    }
    broadcastState();
  });

  // Tăng Tốc Controls: show answers and calculate points
  socket.on('host:toggle-show-answers', ({ show }) => {
    gameState.showAnswersToViewer = Boolean(show);
    if (gameState.showAnswersToViewer) {
      io.emit('sound:play', { sound: 'accel-answers-show' });
    }
    broadcastState();
  });

  socket.on('host:award-acceleration', ({ correctIndices }) => {
    // correctIndices: list of studentIndices who answered correctly, sorted by time
    const pointsAward = [40, 30, 20, 10];
    if (Array.isArray(correctIndices)) {
      correctIndices.forEach((sIdx, rank) => {
        if (gameState.students[sIdx] && pointsAward[rank]) {
          gameState.students[sIdx].score += pointsAward[rank];
        }
      });
      io.emit('sound:play', { sound: 'accel-correct' });
      broadcastState();
    }
  });

  // Về Đích Controls
  socket.on('host:finish-action', (payload) => {
    const { action } = payload;
    if (action === 'show-package-ui') {
      gameState.finish.showPackageUI = true;
      io.emit('sound:play', { sound: 'finish-package-show' });
    } else if (action === 'confirm-package') {
      gameState.finish.showPackageUI = false;
      gameState.finish.selectedPackage = payload.package; // [20, 20, 30]
      gameState.finish.currentQuestionIndex = 0;
      io.emit('sound:play', { sound: 'finish-package-choose' });
    } else if (action === 'toggle-star') {
      const sIdx = payload.studentIndex;
      if (gameState.students[sIdx]) {
        gameState.students[sIdx].star = !gameState.students[sIdx].star;
        if (gameState.students[sIdx].star) {
          io.emit('sound:play', { sound: 'finish-star-choose' });
        }
      }
    } else if (action === 'start-steal-timer') {
      // 5 seconds steal countdown
      gameState.finish.isStealTurn = true;
      gameState.buzzer.open = true;
      gameState.buzzer.buzzedStudents = [];
      gameState.buzzer.winner = null;
      startTimer(5);
      io.emit('sound:play', { sound: 'finish-5s' });
    }
    broadcastState();
  });

  // Câu Hỏi Phụ Controls
  socket.on('host:sub-action', (payload) => {
    const { action } = payload;
    if (action === 'set-students') {
      gameState.subQuestion.activeStudents = payload.students || [0, 1];
      gameState.subQuestion.faultStudents = [];
      gameState.buzzer.open = true; // Buzzer is always open in SubQuestion
    } else if (action === 'reset-faults') {
      gameState.subQuestion.faultStudents = [];
    }
    broadcastState();
  });

  // Sound & Trailer Triggers
  socket.on('host:play-sound', ({ sound }) => {
    io.emit('sound:play', { sound });
  });

  socket.on('host:stop-sound', ({ sound }) => {
    io.emit('sound:stop', { sound });
  });

  socket.on('host:stop-all-sounds', () => {
    io.emit('sound:stop-all');
  });

  socket.on('host:play-trailer', ({ trailer }) => {
    io.emit('trailer:play', { trailer });
  });

  // Contestant (Thí sinh) Events
  socket.on('ts:buzz', () => {
    if (!currentUser || currentUser.role !== 'thi_sinh') return;
    const sIndex = currentUser.studentIndex;
    if (sIndex === undefined || sIndex === null) return;

    // Check if eliminated in VCNV
    if (gameState.currentRound === 'obstacle' && gameState.obstacle.eliminatedStudents.includes(sIndex)) {
      socket.emit('buzzer:rejected', { reason: 'Bạn đã bị loại khỏi phần thi VCNV!' });
      return;
    }

    // SubQuestion check: Buzzed BEFORE host started countdown
    if (gameState.currentRound === 'sub_question') {
      if (!gameState.subQuestion.activeStudents.includes(sIndex)) {
        socket.emit('buzzer:rejected', { reason: 'Bạn không tham gia phần thi câu hỏi phụ!' });
        return;
      }
      if (gameState.subQuestion.faultStudents.includes(sIndex)) {
        socket.emit('buzzer:rejected', { reason: 'Bạn đã phạm quy câu hỏi này!' });
        return;
      }

      if (!gameState.timer.running) {
        // FAULT! Buzzed early before countdown started!
        gameState.subQuestion.faultStudents.push(sIndex);
        gameState.students[sIndex].fault = true;
        io.emit('sub:fault', {
          studentIndex: sIndex,
          studentName: gameState.students[sIndex].name,
          time: new Date().toLocaleTimeString()
        });
        io.emit('sound:play', { sound: 'starting-wrong' });
        broadcastState();
        return;
      }
    }

    if (!gameState.buzzer.open) {
      socket.emit('buzzer:rejected', { reason: 'Chuông chưa được mở!' });
      return;
    }

    const alreadyBuzzed = gameState.buzzer.buzzedStudents.find(b => b.studentIndex === sIndex);
    if (!alreadyBuzzed) {
      const now = Date.now();
      const elapsedMs = gameState.timer.startTime ? now - gameState.timer.startTime : 0;
      const buzzEntry = {
        studentIndex: sIndex,
        studentName: gameState.students[sIndex].name,
        time: now,
        elapsedMs: elapsedMs
      };
      gameState.buzzer.buzzedStudents.push(buzzEntry);

      // First buzzer gets priority
      if (gameState.buzzer.buzzedStudents.length === 1) {
        gameState.buzzer.winner = buzzEntry;

        // Sound selection based on round
        let soundName = 'starting-claim';
        if (gameState.currentRound === 'obstacle') soundName = 'obstacle-claim';
        else if (gameState.currentRound === 'finish') soundName = 'finish-claim';
        else if (gameState.currentRound === 'sub_question') {
          soundName = 'sub-claim';
          stopTimer(); // In sub question, first buzz pauses timer!
        }

        io.emit('buzzer:first-press', buzzEntry);
        io.emit('sound:play', { sound: soundName });
      }

      broadcastState();
    }
  });

  socket.on('ts:submit-answer', ({ answer }) => {
    if (!currentUser || currentUser.role !== 'thi_sinh') return;
    const sIndex = currentUser.studentIndex;
    if (sIndex === undefined || sIndex === null) return;

    const now = Date.now();
    const elapsedMs = gameState.timer.startTime ? now - gameState.timer.startTime : 0;
    const formattedTime = (elapsedMs / 1000).toFixed(2);

    gameState.students[sIndex].answer = answer;
    gameState.students[sIndex].answerTime = formattedTime;

    const existingIdx = gameState.accelerationAnswers.findIndex(a => a.studentIndex === sIndex);
    const ansItem = {
      studentIndex: sIndex,
      studentName: gameState.students[sIndex].name,
      answer: answer,
      time: formattedTime
    };

    if (existingIdx >= 0) {
      gameState.accelerationAnswers[existingIdx] = ansItem;
    } else {
      gameState.accelerationAnswers.push(ansItem);
    }

    // Sort by submission time
    gameState.accelerationAnswers.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));

    // Notify Host & MC
    io.to('host_room').emit('ts:answer-received', ansItem);
    io.to('mc_room').emit('ts:answer-received', ansItem);

    socket.emit('ts:answer-confirmed', { success: true, answer, time: formattedTime });
  });

  socket.on('disconnect', () => {
    if (currentUser && currentUser.role === 'thi_sinh' && currentUser.studentIndex !== undefined) {
      if (gameState.students[currentUser.studentIndex]) {
        gameState.students[currentUser.studentIndex].connected = false;
        broadcastState();
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Olympia GC App v2.4.3 Web Server is READY!`);
  console.log(`Address: http://localhost:${PORT}`);
  console.log(`- Host:     http://localhost:${PORT}/host`);
  console.log(`- MC:       http://localhost:${PORT}/mc`);
  console.log(`- Thí Sinh: http://localhost:${PORT}/thisinh`);
  console.log(`- Viewer:   http://localhost:${PORT}/viewer`);
  console.log(`====================================================`);
});
