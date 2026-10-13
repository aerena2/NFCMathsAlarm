
"use strict";

// ==========================================
// NFC MATHS ALARM
// ==========================================

// ---------- HTML ELEMENTS ----------

const clock = document.getElementById("clock");
const dateDisplay = document.getElementById("date");

const alarmTime = document.getElementById("alarmTime");
const setAlarmButton = document.getElementById("setAlarmButton");
const cancelAlarmButton = document.getElementById("cancelAlarmButton");
const alarmStatus = document.getElementById("alarmStatus");

const alarmSound = document.getElementById("alarmSound");
const testSoundButton = document.getElementById("testSoundButton");
const stopSoundButton = document.getElementById("stopSoundButton");

const scanNfcButton = document.getElementById("scanNfcButton");
const nfcStatus = document.getElementById("nfcStatus");

const quizSection = document.getElementById("quizSection");
const questionProgress = document.getElementById("questionProgress");
const questionDisplay = document.getElementById("question");

const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const answerFeedback = document.getElementById("answerFeedback");

const successSection = document.getElementById("successSection");

// ---------- APPLICATION STATE ----------

let scheduledAlarm = null;
let alarmRinging = false;

let nfcReader = null;
let nfcAbortController = null;
let nfcScanning = false;

let questions = [];
let currentQuestionIndex = 0;

// ---------- INITIAL SETTINGS ----------

alarmSound.loop = true;

// Use local date/time for the date-time picker.
function formatLocalDateTime(date) {
    const pad = number => String(number).padStart(2, "0");

    return (
        date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + "T" +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes())
    );
}

function updateMinimumAlarmTime() {
    alarmTime.min = formatLocalDateTime(new Date());
}

updateMinimumAlarmTime();

// ---------- DIGITAL CLOCK ----------

function updateClock() {
    const now = new Date();

    clock.textContent = now.toLocaleTimeString();

    dateDisplay.textContent = now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    updateMinimumAlarmTime();
    checkAlarm(now);
}

updateClock();
setInterval(updateClock, 1000);

// ---------- SET ALARM ----------

setAlarmButton.addEventListener("click", () => {
    if (!alarmTime.value) {
        alarmStatus.textContent = "Please choose an alarm date and time.";
        return;
    }

    const target = new Date(alarmTime.value);

    if (Number.isNaN(target.getTime())) {
        alarmStatus.textContent = "The selected date or time is invalid.";
        return;
    }

    if (target <= new Date()) {
        alarmStatus.textContent = "Please choose a future date and time.";
        return;
    }

    if (alarmRinging) {
        stopAlarm();
    }

    scheduledAlarm = target;

    quizSection.hidden = true;
    successSection.hidden = true;

    alarmStatus.textContent =
        "Alarm set for " + scheduledAlarm.toLocaleString();

    nfcStatus.textContent =
        "When the alarm rings, tap Scan NFC and scan your tag.";

    console.log("Alarm scheduled for:", scheduledAlarm);
});

// ---------- CANCEL ALARM ----------

cancelAlarmButton.addEventListener("click", () => {
    scheduledAlarm = null;

    stopAlarm();

    alarmStatus.textContent = "Alarm cancelled.";
    nfcStatus.textContent = "No alarm is active.";
});

// ---------- CHECK SCHEDULED ALARM ----------

function checkAlarm(now) {
    if (!scheduledAlarm || alarmRinging) {
        return;
    }

    if (now >= scheduledAlarm) {
        scheduledAlarm = null;
        startAlarm();
    }
}

// ---------- START ALARM ----------

async function startAlarm() {
    alarmRinging = true;

    quizSection.hidden = true;
    successSection.hidden = true;
    answerFeedback.textContent = "";

    alarmStatus.textContent =
        "ALARM RINGING! Tap Scan NFC and scan your tag.";

    nfcStatus.textContent =
        "The alarm is ringing. Tap Scan NFC to begin scanning.";

    try {
        alarmSound.currentTime = 0;
        await alarmSound.play();
    } catch (error) {
        console.error("Alarm playback failed:", error);

        alarmStatus.textContent =
            "Alarm triggered, but sound could not start. " +
            "Keep the page open and check browser sound permissions.";
    }
}

// ---------- TEST SOUND ----------

testSoundButton.addEventListener("click", async () => {
    if (alarmRinging) {
        alarmStatus.textContent =
            "The alarm is already ringing. Complete the NFC challenge to dismiss it.";
        return;
    }

    try {
        alarmSound.currentTime = 0;
        await alarmSound.play();

        alarmStatus.textContent =
            "Sound test is playing. Press Stop Test Sound to stop it.";
    } catch (error) {
        console.error("Sound test failed:", error);

        alarmStatus.textContent =
            "Sound could not play. Check the audio file and browser permissions.";
    }
});

// ---------- STOP TEST SOUND ----------

stopSoundButton.addEventListener("click", () => {
    if (alarmRinging) {
        alarmStatus.textContent =
            "Scan your NFC tag and complete the challenge to stop the alarm.";
        return;
    }

    stopSound();
    alarmStatus.textContent = "Sound test stopped.";
});

function stopSound() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

// ---------- STOP ALARM ----------

function stopAlarm() {
    alarmRinging = false;

    stopSound();
    stopNfcScanning();

    quizSection.hidden = true;
}

// ---------- NFC SCANNING ----------

scanNfcButton.addEventListener("click", async () => {
    if (!alarmRinging) {
        nfcStatus.textContent =
            "Wait for the alarm to ring before scanning your NFC tag.";
        return;
    }

    if (!("NDEFReader" in window)) {
        nfcStatus.textContent =
            "Web NFC is unavailable. Use a compatible Android browser " +
            "with NFC enabled and open this app over HTTPS.";

        return;
    }

    if (nfcScanning) {
        nfcStatus.textContent =
            "Scanning is already active. Hold your phone near the NFC tag.";
        return;
    }

    try {
        nfcReader = new NDEFReader();
        nfcAbortController = new AbortController();

        await nfcReader.scan({
            signal: nfcAbortController.signal
        });

        nfcScanning = true;

        nfcStatus.textContent =
            "Scanning started. Hold your phone near the NFC tag.";

        nfcReader.onreading = () => {
            if (!alarmRinging) {
                nfcStatus.textContent =
                    "The alarm is no longer active.";
                stopNfcScanning();
                return;
            }

            nfcStatus.textContent =
                "NFC tag detected! Starting your maths challenge.";

            stopNfcScanning();
            startMathsChallenge();
        };

        nfcReader.onreadingerror = () => {
            nfcStatus.textContent =
                "The tag could not be read. Try holding your phone " +
                "near the tag again.";
        };

    } catch (error) {
        console.error("NFC scanning error:", error);

        nfcStatus.textContent =
            "Could not start NFC scanning. Check HTTPS, NFC settings, " +
            "browser compatibility, and permissions.";

        stopNfcScanning();
    }
});

// ---------- STOP NFC SCANNING ----------

function stopNfcScanning() {
    nfcScanning = false;

    if (nfcAbortController) {
        nfcAbortController.abort();
        nfcAbortController = null;
    }

    nfcReader = null;
}

// ---------- GENERATE MATHS QUESTIONS ----------

function generateQuestion() {
    const operations = ["+", "-", "*"];

    const operation =
        operations[Math.floor(Math.random() * operations.length)];

    let a = Math.floor(Math.random() * 20) + 1;
    let b = Math.floor(Math.random() * 20) + 1;

    if (operation === "-" && b > a) {
        [a, b] = [b, a];
    }

    let answer;

    if (operation === "+") {
        answer = a + b;
    } else if (operation === "-") {
        answer = a - b;
    } else {
        answer = a * b;
    }

    return {
        text: `${a} ${operation} ${b} = ?`,
        answer
    };
}

// ---------- START MATHS CHALLENGE ----------

function startMathsChallenge() {
    if (!alarmRinging) {
        return;
    }

    questions = [];

    currentQuestionIndex = 0;

    for (let i = 0; i < 5; i++) {
        questions.push(generateQuestion());
    }

    quizSection.hidden = false;
    successSection.hidden = true;

    displayQuestion();

    answerInput.focus();
}

// ---------- DISPLAY QUESTION ----------

function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        completeChallenge();
        return;
    }

    questionProgress.textContent =
        `Question ${currentQuestionIndex + 1} of 5`;

    questionDisplay.textContent =
        questions[currentQuestionIndex].text;

    answerInput.value = "";
    answerFeedback.textContent = "";
}

// ---------- CHECK ANSWERS ----------

answerForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!alarmRinging || currentQuestionIndex >= questions.length) {
        return;
    }

    const enteredValue = answerInput.value.trim();

    if (enteredValue === "") {
        answerFeedback.textContent = "Please enter an answer.";
        return;
    }

    const userAnswer = Number(enteredValue);
    const correctAnswer = questions[currentQuestionIndex].answer;

    if (userAnswer === correctAnswer) {
        currentQuestionIndex++;

        if (currentQuestionIndex < questions.length) {
            answerFeedback.textContent = "Correct! Next question.";
            displayQuestion();
        } else {
            completeChallenge();
        }
    } else {
        answerFeedback.textContent = "Incorrect answer. Try again!";
        answerInput.value = "";
        answerInput.focus();
    }
});

// ---------- COMPLETE CHALLENGE ----------

function completeChallenge() {
    quizSection.hidden = true;
    successSection.hidden = false;

    stopAlarm();

    alarmStatus.textContent =
        "Congratulations! You completed all five questions.";

    nfcStatus.textContent =
        "Challenge completed. Alarm stopped.";
}

// ---------- SERVICE WORKER ----------

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("Service worker registered.");
            })
            .catch(error => {
                console.error(
                    "Service worker registration failed:",
                    error
                );
            });
    });
}