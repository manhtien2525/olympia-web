// Olympia Web Audio Manager
const soundMap = {
  'buzz': '/sounds/Starting/Claim.mp3',
  'correct': '/sounds/Starting/CorrectAnswer.mp3',
  'wrong': '/sounds/Obstacle/WrongRow.mp3',
  'star': '/sounds/Finish/StarChoose.mp3',
  'timeout': '/sounds/Obstacle/WrongRow.mp3',
  'start-starting': '/sounds/Starting/StartTurn.mp3',
  'start-obstacle': '/sounds/Obstacle/StartRound.mp3',
  'reveal-row': '/sounds/Obstacle/CorrectRow.mp3',
  'reveal-obstacle': '/sounds/Obstacle/CorrectObstacle.mp3',
  'start-acceleration': '/sounds/Acceleration/StartRound.mp3',
  'show-answers': '/sounds/Acceleration/AnswersShowing.mp3',
  'correct-accel': '/sounds/Acceleration/Correct.mp3',
  'start-finish': '/sounds/Finish/StartRound.mp3',
  'tick-15': '/sounds/Finish/15Seconds.mp3',
  'tick-20': '/sounds/Acceleration/20Seconds.mp3',
  'tick-30': '/sounds/Acceleration/30Seconds.mp3',
  'summary': '/sounds/Main/PointSummary.mp3'
};

const audioCache = {};
let soundEnabled = true;

function initSounds() {
  Object.keys(soundMap).forEach(key => {
    const audio = new Audio(soundMap[key]);
    audio.preload = 'auto';
    audioCache[key] = audio;
  });
}

function playSound(soundKey) {
  if (!soundEnabled) return;
  const audio = audioCache[soundKey] || (soundMap[soundKey] ? new Audio(soundMap[soundKey]) : null);
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.warn('Autoplay prevented or audio play error:', e.message);
      });
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  }
}

function stopSound(soundKey) {
  const audio = audioCache[soundKey];
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// Auto init on script load
initSounds();

// Unlock audio on first user touch / click
window.addEventListener('click', () => {
  // Silent play to unlock audio context in browsers
  const silent = new Audio(soundMap['buzz']);
  silent.volume = 0.001;
  silent.play().then(() => {
    silent.pause();
  }).catch(() => {});
}, { once: true });
