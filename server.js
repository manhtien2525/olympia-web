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
  currentRound: 'lobby', // 'lobby', 'starting', 'obstacle', 'acceleration', 'finish', 'summary'
  subRound: '',
  currentQuestion: null,
  activeStudent: null, // Thí sinh đang có lượt (vòng Khởi động hoặc Về đích)
  timer: {
    running: false,
    timeLeft: 0,
    maxTime: 0,
    startTime: 0
  },
  buzzer: {
    open: false,
    buzzedStudents: [] // [{ studentIndex, time, elapsedMs }]
  },
  students: [
    { index: 0, name: 'Thí sinh 1', school: 'THPT Chuyên Hà Nội - Amsterdam', score: 0, connected: false, answer: '', answerTime: null, star: false },
    { index: 1, name: 'Thí sinh 2', school: 'THPT Chuyên Lê Hồng Phong', score: 0, connected: false, answer: '', answerTime: null, star: false },
    { index: 2, name: 'Thí sinh 3', school: 'THPT Chuyên Lam Sơn', score: 0, connected: false, answer: '', answerTime: null, star: false },
    { index: 3, name: 'Thí sinh 4', school: 'THPT Chuyên Quốc Học Huế', score: 0, connected: false, answer: '', answerTime: null, star: false }
  ],
  obstacle: {
    currentObstacleIndex: 0,
    revealedRows: [],
    imageRevealed: false
  },
  accelerationAnswers: [], // [{ studentIndex, answer, elapsedMs }]
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
        io.emit('sound:play', { sound: 'timeout' });
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
  gameState.timer.timeLeft = seconds || gameState.timer.maxTime || 0;
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

  // Set user cookie
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

  // Host Controls
  socket.on('host:set-round', ({ round, subRound, activeStudent }) => {
    gameState.currentRound = round;
    gameState.subRound = subRound || '';
    if (activeStudent !== undefined) gameState.activeStudent = activeStudent;
    gameState.currentQuestion = null;
    gameState.accelerationAnswers = [];
    gameState.buzzer.open = false;
    gameState.buzzer.buzzedStudents = [];
    stopTimer();
    broadcastState();
  });

  socket.on('host:set-question', (question) => {
    gameState.currentQuestion = question;
    gameState.accelerationAnswers = [];
    gameState.buzzer.buzzedStudents = [];
    broadcastState();
  });

  socket.on('host:start-timer', ({ seconds }) => {
    startTimer(seconds);
  });

  socket.on('host:stop-timer', () => {
    stopTimer();
  });

  socket.on('host:reset-timer', ({ seconds }) => {
    resetTimer(seconds);
  });

  socket.on('host:open-buzzer', () => {
    gameState.buzzer.open = true;
    gameState.buzzer.buzzedStudents = [];
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
    gameState.buzzer.open = false;
    io.emit('buzzer:reset');
    broadcastState();
  });

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

  socket.on('host:toggle-star', ({ studentIndex }) => {
    if (gameState.students[studentIndex]) {
      gameState.students[studentIndex].star = !gameState.students[studentIndex].star;
      if (gameState.students[studentIndex].star) {
        io.emit('sound:play', { sound: 'star' });
      }
      broadcastState();
    }
  });

  socket.on('host:reveal-obstacle-row', ({ rowIndex }) => {
    if (!gameState.obstacle.revealedRows.includes(rowIndex)) {
      gameState.obstacle.revealedRows.push(rowIndex);
      io.emit('sound:play', { sound: 'reveal-row' });
      broadcastState();
    }
  });

  socket.on('host:reveal-obstacle-image', () => {
    gameState.obstacle.imageRevealed = true;
    io.emit('sound:play', { sound: 'reveal-obstacle' });
    broadcastState();
  });

  socket.on('host:play-sound', ({ sound }) => {
    io.emit('sound:play', { sound });
  });

  socket.on('host:play-trailer', ({ trailer }) => {
    io.emit('trailer:play', { trailer });
  });

  socket.on('host:show-answers', () => {
    io.emit('acceleration:show-answers', { answers: gameState.accelerationAnswers });
    io.emit('sound:play', { sound: 'show-answers' });
  });

  // Contestant (Thí sinh) Events
  socket.on('ts:buzz', () => {
    if (!currentUser || currentUser.role !== 'thi_sinh') return;
    const sIndex = currentUser.studentIndex;
    if (sIndex === undefined || sIndex === null) return;

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
        io.emit('buzzer:first-press', buzzEntry);
        io.emit('sound:play', { sound: 'buzz' });
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

    gameState.students[sIndex].answer = answer;
    gameState.students[sIndex].answerTime = (elapsedMs / 1000).toFixed(2);

    const existingIdx = gameState.accelerationAnswers.findIndex(a => a.studentIndex === sIndex);
    const ansItem = {
      studentIndex: sIndex,
      studentName: gameState.students[sIndex].name,
      answer: answer,
      time: (elapsedMs / 1000).toFixed(2)
    };

    if (existingIdx >= 0) {
      gameState.accelerationAnswers[existingIdx] = ansItem;
    } else {
      gameState.accelerationAnswers.push(ansItem);
    }

    // Sort by time
    gameState.accelerationAnswers.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));

    // Notify Host and MC
    io.to('host_room').emit('ts:answer-received', ansItem);
    io.to('mc_room').emit('ts:answer-received', ansItem);

    socket.emit('ts:answer-confirmed', { success: true, answer, time: ansItem.time });
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
  console.log(`===============================================`);
  console.log(`Olympia Game Show Web Server running at:`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Role Links:`);
  console.log(`- Login:    http://localhost:${PORT}/`);
  console.log(`- Host:     http://localhost:${PORT}/host`);
  console.log(`- MC:       http://localhost:${PORT}/mc`);
  console.log(`- Thí Sinh: http://localhost:${PORT}/thisinh`);
  console.log(`- Viewer:   http://localhost:${PORT}/viewer`);
  console.log(`===============================================`);
});
