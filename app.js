
const alarmTime = document.getElementById("alarmTime");
const setAlarmButton = document.getElementById("setAlarmButton");
const cancelAlarmButton = document.getElementById("cancelAlarmButton");
const alarmStatus = document.getElementById("alarmStatus");

const wakeupSection = document.getElementById("wakeupSection");
const scanNfcLabel = document.getElementById("scanNfcLabel");
const nfcStatus = document.getElementById("nfcStatus");

const quizSection = document.getElementById("quizSection");
const questionProgress = document.getElementById("questionProgress");
const questionElement = document.getElementById("question");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const answerFeedback = document.getElementById("answerFeedback");

const successSection = document.getElementById("successSection");
const alarmSound = document.getElementById("alarmSound");

const CHALLENGE_URL = new URL(window.location.href).searchParams.get("challenge") === "1";

let scheduledAlarm = null;
let alarmRinging = false;
let nfcReader = null;
let nfcAbortController = null;
let nfcScanning = false;

let questions = [];
let currentQuestionIndex = 0;

const STORAGE_KEY = "nfcMathsAlarmState";

function saveState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      scheduledAlarm,
      alarmRinging,
      questions,
      currentQuestionIndex
    }));
  } catch (error) {
    console.warn("Could not save alarm state:", error);
  }
}

function loadState() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);

    if (!saved) return null;

    return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not load alarm state:", error);
    return null;
  }
}

function generateQuestion() {
  const operations = ["+", "-", "*"];
  const operation =
    operations[Math.floor(Math.random() * operations.length)];

  let a = Math.floor(Math.random() * 20) + 1;
  let b = Math.floor(Math.random() * 20) + 1;
  let answer;

  if (operation === "+") {
    answer = a + b;
  } else if (operation === "-") {
    if (b > a) [a, b] = [b, a];
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 12) + 1;
    b = Math.floor(Math.random() * 12) + 1;
    answer = a * b;
  }

  return { text: `${a} ${operation} ${b} = ?`, answer };
}

function resetChallenge() {
  questions = [];
  currentQuestionIndex = 0;

  answerInput.value = "";
  questionElement.textContent = "";
  questionProgress.textContent = "QUESTION 1 OF 5";
  answerFeedback.textContent = "";

  nfcStatus.textContent =
    "Tap the instruction above, then scan your NFC tag.";

  saveState();
}

function stopNfcScanning() {
  if (nfcAbortController) nfcAbortController.abort();

  nfcAbortController = null;
  nfcReader = null;
  nfcScanning = false;
}

function stopAlarm() {
  alarmRinging = false;
  stopNfcScanning();

  alarmSound.pause();
  alarmSound.currentTime = 0;

  wakeupSection.hidden = true;
  quizSection.hidden = true;
  successSection.hidden = true;

  saveState();
}

function startAlarm() {
  if (alarmRinging) return;

  alarmRinging = true;

  wakeupSection.hidden = true;
  quizSection.hidden = true;
  successSection.hidden = true;

  alarmStatus.textContent = "Alarm is ringing!";
  alarmSound.currentTime = 0;

  alarmSound.play().catch(() => {
    alarmStatus.textContent =
      "Alarm is due. Tap the page to allow sound playback.";
  });

  if (CHALLENGE_URL) {
    startMathsChallenge();
  } else {
    wakeupSection.hidden = false;
    nfcStatus.textContent =
      "Tap the instruction above, then scan your NFC tag.";
  }

  saveState();
}

function checkAlarm() {
  if (
    scheduledAlarm !== null &&
    !alarmRinging &&
    Date.now() >= scheduledAlarm
  ) {
    startAlarm();
  }
}

setInterval(checkAlarm, 1000);

setAlarmButton.addEventListener("click", () => {
  if (!alarmTime.value) {
    alarmStatus.textContent = "Please select an alarm date and time.";
    return;
  }

  const alarmDate = new Date(alarmTime.value);

  if (
    Number.isNaN(alarmDate.getTime()) ||
    alarmDate.getTime() <= Date.now()
  ) {
    alarmStatus.textContent = "Please select a future date and time.";
    return;
  }

  stopAlarm();
  resetChallenge();

  scheduledAlarm = alarmDate.getTime();

  alarmStatus.textContent =
    "Alarm set for " + alarmDate.toLocaleString() + ".";

  setAlarmButton.textContent = "Update Alarm";
  saveState();
});

cancelAlarmButton.addEventListener("click", () => {
  scheduledAlarm = null;

  stopAlarm();
  resetChallenge();

  alarmStatus.textContent = "Alarm cancelled. No alarm is set.";
  setAlarmButton.textContent = "Set Alarm";
});

scanNfcLabel.addEventListener("click", startNfcScanning);

scanNfcLabel.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startNfcScanning();
  }
});

async function startNfcScanning() {
  if (!alarmRinging || wakeupSection.hidden) return;

  if (nfcScanning) {
    nfcStatus.textContent = "NFC scanning is already active.";
    return;
  }

  if (!("NDEFReader" in window)) {
    nfcStatus.textContent =
      "Web NFC is not supported in this browser. Use compatible Android Chrome over HTTPS.";
    return;
  }

  try {
    nfcReader = new NDEFReader();
    nfcAbortController = new AbortController();

    nfcReader.onreading = () => {
      if (!alarmRinging) return;

      stopNfcScanning();
      startMathsChallenge();
    };

    nfcReader.onreadingerror = () => {
      nfcStatus.textContent =
        "Could not read the tag. Try holding it closer to your phone.";
    };

    await nfcReader.scan({
      signal: nfcAbortController.signal
    });

    nfcScanning = true;
    nfcStatus.textContent =
      "Ready to scan. Hold your NFC tag near the back of your phone.";
  } catch (error) {
    console.error("NFC scanning error:", error);

    nfcScanning = false;
    nfcStatus.textContent =
      "Could not start scanning. Check NFC settings and browser permission.";
  }
}

function startMathsChallenge() {
  if (!alarmRinging) return;

  if (questions.length !== 5) {
    questions = Array.from({ length: 5 }, generateQuestion);
    currentQuestionIndex = 0;
  }

  wakeupSection.hidden = true;
  quizSection.hidden = false;
  successSection.hidden = true;

  showQuestion();
  saveState();
}

function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    completeChallenge();
    return;
  }

  questionProgress.textContent =
    `QUESTION ${currentQuestionIndex + 1} OF ${questions.length}`;

  questionElement.textContent =
    questions[currentQuestionIndex].text;

  answerInput.value = "";
  answerFeedback.textContent = "";
}

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!alarmRinging || quizSection.hidden) return;

  const enteredAnswer = answerInput.value.trim();

  if (enteredAnswer === "") {
    answerFeedback.textContent = "Please enter an answer.";
    return;
  }

  const numericAnswer = Number(enteredAnswer);
  const correctAnswer = questions[currentQuestionIndex].answer;

  if (numericAnswer === correctAnswer) {
    currentQuestionIndex++;
    saveState();

    if (currentQuestionIndex === questions.length) {
      completeChallenge();
    } else {
      showQuestion();
      answerFeedback.textContent = "Correct! Next question.";
      answerInput.focus();
    }
  } else {
    answerFeedback.textContent =
      "Incorrect answer. Try again! The alarm is still ringing.";
    answerInput.select();
  }
});

function completeChallenge() {
  scheduledAlarm = null;

  stopAlarm();
  resetChallenge();

  alarmStatus.textContent =
    "Alarm dismissed. Set your next alarm.";

  setAlarmButton.textContent = "Set Alarm";

  // Return to the normal alarm-setting URL.
  if (CHALLENGE_URL) {
    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }
}

function restoreSavedState() {
  const saved = loadState();

  if (!saved) {
    if (CHALLENGE_URL) {
      alarmStatus.textContent =
        "Challenge link opened. Set an alarm first, then tap your NFC tag when it rings.";
    }
    return;
  }

  scheduledAlarm = saved.scheduledAlarm ?? null;
  alarmRinging = false;
  questions = Array.isArray(saved.questions) ? saved.questions : [];
  currentQuestionIndex = saved.currentQuestionIndex ?? 0;

  if (scheduledAlarm !== null) {
    alarmTime.value = new Date(scheduledAlarm)
      .toISOString()
      .slice(0, 16);

    alarmStatus.textContent =
      "Alarm set for " + new Date(scheduledAlarm).toLocaleString() + ".";
    setAlarmButton.textContent = "Update Alarm";
  }

  // The challenge URL can show the quiz only if an alarm was already ringing.
  if (CHALLENGE_URL && saved.alarmRinging && questions.length === 5) {
    alarmRinging = true;
    startMathsChallenge();

    alarmSound.play().catch(() => {
      alarmStatus.textContent =
        "Challenge restored. Tap the page if sound does not play.";
    });
  } else if (saved.alarmRinging) {
    alarmStatus.textContent =
      "Your alarm was ringing before this page reopened. Please check the alarm.";
  }

  saveState();
}

restoreSavedState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
