
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

let scheduledAlarm = null;
let alarmRinging = false;
let nfcReader = null;
let nfcAbortController = null;
let nfcScanning = false;

let questions = [];
let currentQuestionIndex = 0;

// Set a new alarm.
setAlarmButton.addEventListener("click", () => {
  const selectedTime = alarmTime.value;

  if (!selectedTime) {
    alarmStatus.textContent = "Please select an alarm date and time.";
    return;
  }

  const alarmDate = new Date(selectedTime);

  if (Number.isNaN(alarmDate.getTime()) || alarmDate <= new Date()) {
    alarmStatus.textContent = "Please select a future date and time.";
    return;
  }

  stopAlarm();
  scheduledAlarm = alarmDate.getTime();

  resetChallenge();

  alarmStatus.textContent =
    "Alarm set for " + alarmDate.toLocaleString() + ".";

  setAlarmButton.textContent = "Update Alarm";
});

// Cancel the scheduled alarm.
cancelAlarmButton.addEventListener("click", () => {
  scheduledAlarm = null;

  stopAlarm();
  resetChallenge();

  alarmStatus.textContent = "Alarm cancelled. No alarm is set.";
  setAlarmButton.textContent = "Set Alarm";
});

// Check the scheduled alarm every second while this page is running.
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

// Start ringing and show only the NFC instruction.
function startAlarm() {
  if (alarmRinging) return;

  alarmRinging = true;

  wakeupSection.hidden = false;
  quizSection.hidden = true;
  successSection.hidden = true;

  nfcStatus.textContent =
    "Tap the instruction above, then scan your NFC tag.";

  alarmStatus.textContent = "Alarm is ringing!";

  alarmSound.currentTime = 0;

  alarmSound.play().catch((error) => {
    console.log("Alarm audio could not start automatically:", error);
    nfcStatus.textContent =
      "Tap the page if sound is blocked, then scan your NFC tag.";
  });
}

// Make the label work with both a tap and keyboard activation.
scanNfcLabel.addEventListener("click", startNfcScanning);

scanNfcLabel.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startNfcScanning();
  }
});

// Start NFC scanning only when the user taps the instruction.
async function startNfcScanning() {
  if (!alarmRinging || !wakeupSection.hidden === false) {
    // The alarm must be ringing before NFC scanning can begin.
    if (!alarmRinging) return;
  }

  if (nfcScanning) {
    nfcStatus.textContent =
      "NFC scanning is already active. Hold your tag near your phone.";
    return;
  }

  if (!("NDEFReader" in window)) {
    nfcStatus.textContent =
      "Web NFC is not supported here. Use a compatible Android phone and Chrome over HTTPS.";
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
        "Could not read the tag. Hold it near your phone and try again.";
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

    if (error.name === "NotAllowedError") {
      nfcStatus.textContent =
        "NFC permission was denied. Allow NFC access and try again.";
    } else {
      nfcStatus.textContent =
        "Could not start NFC scanning. Check that NFC is enabled and try again.";
    }
  }
}

// Stop NFC scanning safely.
function stopNfcScanning() {
  if (nfcAbortController) {
    nfcAbortController.abort();
  }

  nfcAbortController = null;
  nfcReader = null;
  nfcScanning = false;
}

// Generate a simple arithmetic question.
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
    if (b > a) {
      [a, b] = [b, a];
    }

    answer = a - b;
  } else {
    // Keep multiplication questions reasonably small.
    a = Math.floor(Math.random() * 12) + 1;
    b = Math.floor(Math.random() * 12) + 1;
    answer = a * b;
  }

  return {
    text: `${a} ${operation} ${b} = ?`,
    answer
  };
}

// Reveal maths questions only after a successful NFC scan.
function startMathsChallenge() {
  if (!alarmRinging) return;

  questions = Array.from({ length: 5 }, () => generateQuestion());
  currentQuestionIndex = 0;

  wakeupSection.hidden = true;
  quizSection.hidden = false;
  successSection.hidden = true;

  answerFeedback.textContent = "";
  showQuestion();

  answerInput.focus();
}

// Display the current question.
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

// Check each submitted answer.
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

    if (currentQuestionIndex === questions.length) {
      completeChallenge();
    } else {
      answerFeedback.textContent = "Correct! Next question.";
      showQuestion();
      answerInput.focus();
    }
  } else {
    answerFeedback.textContent =
      "Incorrect answer. Try again! The alarm is still ringing.";

    answerInput.select();
  }
});

// Stop the alarm and return to the normal alarm page.
function completeChallenge() {
  scheduledAlarm = null;

  stopAlarm();
  resetChallenge();

  alarmStatus.textContent =
    "Alarm dismissed. Set your next alarm.";

  setAlarmButton.textContent = "Set Alarm";
}

// Stop the sound and hide the NFC and maths sections.
function stopAlarm() {
  alarmRinging = false;

  stopNfcScanning();

  alarmSound.pause();
  alarmSound.currentTime = 0;

  wakeupSection.hidden = true;
  quizSection.hidden = true;
  successSection.hidden = true;
}

// Clear the previous challenge and its feedback.
function resetChallenge() {
  questions = [];
  currentQuestionIndex = 0;

  answerInput.value = "";
  questionElement.textContent = "";
  questionProgress.textContent = "QUESTION 1 OF 5";
  answerFeedback.textContent = "";

  nfcStatus.textContent =
    "Tap the instruction above, then scan your NFC tag.";
}

// Register the service worker for PWA support.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
