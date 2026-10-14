
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

const STORAGE_KEY = "nfcMathsAlarmState";
const CHALLENGE_URL = window.location.search.includes("challenge=1");

let scheduledAlarm = null;
let alarmRinging = false;
let nfcReader = null;
let nfcAbortController = null;
let nfcScanning = false;
let questions = [];
let currentQuestionIndex = 0;

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        scheduledAlarm,
        alarmRinging,
        questions,
        currentQuestionIndex
      })
    );
  } catch (error) {
    console.error("Could not save alarm state:", error);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Could not load alarm state:", error);
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

  return {
    text: `${a} ${operation} ${b} = ?`,
    answer
  };
}

function resetChallenge() {
  questions = [];
  currentQuestionIndex = 0;
  answerInput.value = "";
  questionElement.textContent = "";
  questionProgress.textContent = "QUESTION 1 OF 5";
  answerFeedback.textContent = "";
}

function stopNfcScanning() {
  if (nfcAbortController) {
    nfcAbortController.abort();
  }

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

  alarmStatus.textContent = "Your alarm is ringing!";

  alarmSound.currentTime = 0;
  alarmSound.play().catch(() => {
    alarmStatus.textContent =
      "Alarm is due. Tap the page if sound does not play.";
  });

  if (CHALLENGE_URL) {
    startMathsChallenge();
  } else {
    wakeupSection.hidden = false;
    nfcStatus.textContent =
      "Tap your NFC tag to open the maths challenge.";
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
      "Use a compatible Android browser over HTTPS, or tap your programmed NFC tag to open the challenge link.";
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
      "Could not start scanning. Check NFC settings and browser permissions.";
  }
}

  function startMathsChallenge() {
  if (!alarmRinging) return;

  document.getElementById("alarmSection").hidden = true;

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
    `QUESTION ${currentQuestionIndex + 1} OF 5`;

  questionElement.textContent =
    questions[currentQuestionIndex].text;

  answerInput.value = "";
  answerFeedback.textContent = "";
  answerInput.focus();
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
    "Great job! Alarm dismissed. Set your next alarm.";

  setAlarmButton.textContent = "Set Alarm";

  if (CHALLENGE_URL) {
    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }
}

/* Keep the alarm state synchronized between tabs. */
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;

  try {
    const sharedState = JSON.parse(event.newValue);

    if (
      !sharedState.alarmRinging &&
      sharedState.scheduledAlarm === null &&
      (alarmRinging || scheduledAlarm !== null)
    ) {
      scheduledAlarm = null;
      stopAlarm();
      resetChallenge();

      alarmStatus.textContent =
        "Alarm dismissed or cancelled in another tab.";

      setAlarmButton.textContent = "Set Alarm";
      return;
    }

    if (
      !alarmRinging &&
      sharedState.scheduledAlarm !== null
    ) {
      scheduledAlarm = sharedState.scheduledAlarm;
      alarmTime.value = toLocalDateTimeInput(scheduledAlarm);

      alarmStatus.textContent =
        "Alarm set for " +
        new Date(scheduledAlarm).toLocaleString() +
        ".";

      setAlarmButton.textContent = "Update Alarm";
    }
  } catch (error) {
    console.error("Could not sync alarm state:", error);
  }
});

function toLocalDateTimeInput(timestamp) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function restoreSavedState() {
  const saved = loadState();

  if (CHALLENGE_URL) {
    document.getElementById("alarmSection").hidden = true;

    // Open the maths challenge directly from the NFC URL.
    alarmRinging = true;

    if (!saved || !saved.alarmRinging || !Array.isArray(saved.questions) ||
        saved.questions.length !== 5) {
      questions = Array.from({ length: 5 }, generateQuestion);
      currentQuestionIndex = 0;
    } else {
      questions = saved.questions;
      currentQuestionIndex = saved.currentQuestionIndex || 0;
    }

    startMathsChallenge();

    alarmSound.play().catch(() => {
      answerFeedback.textContent =
        "Tap the page if the alarm sound does not play.";
    });

    return;
  }

  if (!saved) return;

  scheduledAlarm = saved.scheduledAlarm ?? null;
  questions = Array.isArray(saved.questions) ? saved.questions : [];
  currentQuestionIndex = saved.currentQuestionIndex ?? 0;

  if (scheduledAlarm !== null) {
    alarmTime.value = toLocalDateTimeInput(scheduledAlarm);
    alarmStatus.textContent =
      "Alarm set for " + new Date(scheduledAlarm).toLocaleString() + ".";
    setAlarmButton.textContent = "Update Alarm";
  }

  if (saved.alarmRinging) {
    alarmStatus.textContent =
      "Your alarm was ringing. Tap your NFC tag to open the challenge.";
  }

  saveState();
}
restoreSavedState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
