// Olympia Web Audio Manager - Fully mapped to GC App v2.4.3
const soundMap = {
  // Main
  'main-space': '/sounds/Main/Space.mp3',
  'main-summary': '/sounds/Main/PointSummary.mp3',
  'main-end': '/sounds/Main/EndSound.mp3',

  // Starting (Khởi Động)
  'start-round-starting': '/sounds/Starting/StartRound.mp3',
  'start-turn-starting': '/sounds/Starting/StartTurn.mp3',
  'pre-main-time': '/sounds/Starting/PreMainTime.mp3',
  'main-time': '/sounds/Starting/MainTime.mp3',
  'starting-correct': '/sounds/Starting/CorrectAnswer.mp3',
  'starting-wrong': '/sounds/Starting/WrongAnswer.mp3',
  'starting-claim': '/sounds/Starting/Claim.mp3',
  'starting-finish-turn': '/sounds/Starting/FinishTurn.mp3',

  // Obstacle (VCNV)
  'obstacle-start-round': '/sounds/Obstacle/StartRound.mp3',
  'obstacle-rows-show': '/sounds/Obstacle/RowsShow.mp3',
  'obstacle-row-choose': '/sounds/Obstacle/RowChoose.mp3',
  'obstacle-quest-show': '/sounds/Obstacle/RowQuestShow.mp3',
  'obstacle-15s': '/sounds/Obstacle/15Seconds.mp3',
  'obstacle-answers-show': '/sounds/Obstacle/AnswersShowing.mp3',
  'obstacle-correct-row': '/sounds/Obstacle/CorrectRow.mp3',
  'obstacle-wrong-row': '/sounds/Obstacle/WrongRow.mp3',
  'obstacle-picture-reveal': '/sounds/Obstacle/PictureReveal.mp3',
  'obstacle-claim': '/sounds/Obstacle/ObstacleGrant.mp3',
  'obstacle-correct-cnv': '/sounds/Obstacle/CorrectObstacle.mp3',

  // Acceleration (Tăng Tốc)
  'accel-start-round': '/sounds/Acceleration/StartRound.mp3',
  'accel-quest-show': '/sounds/Acceleration/QuestionShowing.mp3',
  'accel-20s': '/sounds/Acceleration/20Seconds.mp3',
  'accel-30s': '/sounds/Acceleration/30Seconds.mp3',
  'accel-answers-show': '/sounds/Acceleration/AnswersShowing.mp3',
  'accel-correct': '/sounds/Acceleration/Correct.mp3',

  // Finish (Về Đích)
  'finish-start-round': '/sounds/Finish/StartRound.mp3',
  'finish-start-turn': '/sounds/Finish/StartTurn.mp3',
  'finish-package-show': '/sounds/Finish/PackageShow.mp3',
  'finish-package-choose': '/sounds/Finish/PackageChoose.mp3',
  'finish-star-choose': '/sounds/Finish/StarChoose.mp3',
  'finish-choice-chosen': '/sounds/Finish/ChoiceChosen.mp3',
  'finish-15s': '/sounds/Finish/15Seconds.mp3',
  'finish-20s': '/sounds/Finish/20Seconds.mp3',
  'finish-practice-20s': '/sounds/Finish/Practice20Seconds.mp3',
  'finish-practice-30s': '/sounds/Finish/Practice30Seconds.mp3',
  'finish-practice-40s': '/sounds/Finish/Practice40Seconds.mp3',
  'finish-practice-60s': '/sounds/Finish/Practice60Seconds.mp3',
  'finish-5s': '/sounds/Finish/5Seconds.mp3',
  'finish-claim': '/sounds/Finish/Grant.mp3',
  'finish-correct': '/sounds/Finish/CorrectFinish.mp3',
  'finish-wrong': '/sounds/Finish/WrongFinish.mp3',
  'finish-round-end': '/sounds/Finish/FinishRound.mp3',

  // Sub Question (Câu Hỏi Phụ)
  'sub-quest-show': '/sounds/SubQuestion/QuestionShowing.mp3',
  'sub-15s': '/sounds/SubQuestion/15Seconds.mp3',
  'sub-claim': '/sounds/SubQuestion/Claim.mp3'
};

const audioCache = {};
let currentBgm = null;
let soundEnabled = true;

function initSounds() {
  Object.keys(soundMap).forEach(key => {
    try {
      const audio = new Audio(soundMap[key]);
      audio.preload = 'auto';
      audioCache[key] = audio;
    } catch (e) {}
  });
}

function playSound(soundKey) {
  if (!soundEnabled) return;
  const audio = audioCache[soundKey] || (soundMap[soundKey] ? new Audio(soundMap[soundKey]) : null);
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.warn('Autoplay prevented or error:', e.message);
      });
      if (soundKey === 'main-time' || soundKey === 'pre-main-time') {
        currentBgm = audio;
      }
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

function stopAllSounds() {
  Object.keys(audioCache).forEach(k => {
    try {
      audioCache[k].pause();
      audioCache[k].currentTime = 0;
    } catch (e) {}
  });
  currentBgm = null;
}

// Init on load
initSounds();

// Unlock browser audio context on first user click
window.addEventListener('click', () => {
  if (audioCache['main-space']) {
    const silent = audioCache['main-space'];
    silent.volume = 0.001;
    silent.play().then(() => {
      silent.pause();
      silent.volume = 1;
    }).catch(() => {});
  }
}, { once: true });
