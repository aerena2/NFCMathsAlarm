
"use strict";

// ---------- HTML ELEMENTS ----------

const alarmTime = document.getElementById("alarmTime");
const setAlarmButton = document.getElementById("setAlarmButton");
const cancelAlarmButton = document.getElementById("cancelAlarmButton");
const alarmStatus = document.getElementById("alarmStatus");

const alarmSound = document.getElementById("alarmSound");

const wakeupSection = document.getElementById("wakeupSection");
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

// ---------- SET ALARM ----------

setAlarmButton.addEventListener("click", () => {
    if (!alarmTime.value) {
        alarmStatus.textContent =
            "Please choose an alarm date and time.";
        return;
    }

    const target = new Date(alarmTime.value);

    if (Number.isNaN(target.getTime())) {
        alarmStatus.textContent =
            "The selected date or time is invalid.";
        return;
    }

    if (target <= new Date()) {
        alarmStatus.textContent =
            "Please choose a future date and time.";
        return;
    }

    // Stop any currently ringing alarm before resetting.
    stopAlarm();

    scheduledAlarm = target;

    quizSection.hidden = true;
    wakeupSection.hidden = true;
    successSection.hidden = true;

    answerFeedback.textContent = "";
    nfcStatus.textContent = "Waiting for the alarm to ring.";

    alarmStatus.textContent =
        "Alarm set for " + target.toLocaleString();

    console.log("Alarm scheduled for:", target);
});

// ---------- CANCEL ALARM ----------

cancelAlarmButton.addEventListener("click", () => {
    scheduledAlarm = null;

    stopAlarm();

    wakeupSection.hidden = true;
    quizSection.hidden = true;
    successSection.hidden = true;

    alarmStatus.textContent = "Alarm cancelled.";
    nfcStatus.textContent = "No alarm is active.";
});

// ---------- CHECK ALARM ----------

function checkAlarm() {
    if (!scheduledAlarm || alarmRinging) {
        return;
    }

    if (new Date() >= scheduledAlarm) {
        scheduledAlarm = null;
        startAlarm();
    }
}

// Check the time while the page is running.
setInterval(checkAlarm, 1000);

// ---------- START ALARM ----------

async function startAlarm() {
    alarmRinging = true;

    wakeupSection.hidden = false;
    quizSection.hidden = true;
    successSection.hidden = true;

    answerFeedback.textContent = "";

    alarmStatus.textContent =
        "ALARM RINGING! Scan your NFC tag to continue.";

    nfcStatus.textContent =
        "Tap Scan NFC, then hold your phone near the tag.";

    try {
        alarmSound.currentTime = 0;
        await alarmSound.play();
    } catch (error) {
        console.error("Alarm playback failed:", error);

        alarmStatus.textContent =
            "Alarm triggered, but sound could not start. " +
            "Check browser sound permissions and keep the page open.";
    }
}

// ---------- STOP SOUND ----------

function stopSound() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

// ---------- STOP NFC SCANNING ----------

function stopNfcScanning() {
    nfcScanning = false;

    if (nfcAbortController) {
        nfcAbortController.abort();
        nfcAbortController = null;
    }

    nfcReader = null;
}

// ---------- STOP ALARM ----------

function stopAlarm() {
    alarmRinging = false;

    stopSound();
    stopNfcScanning();

    wakeupSection.hidden = true;
    quizSection.hidden = true;
}

// ---------- NFC SCANNING ----------

scanNfcButton.addEventListener("click", async () => {
    if (!alarmRinging) {
        nfcStatus.textContent =
            "Wait for the alarm to ring before scanning.";
        return;
    }

    if (!("NDEFReader" in window)) {
        nfcStatus.textContent =
            "Web NFC is unavailable. Use a compatible Android " +
            "browser, enable NFC, and open this website over HTTPS.";
        return;
    }

    if (nfcScanning) {
        nfcStatus.textContent =
            "Scanning is already active. Hold your phone near the tag.";
        return;
    }

    try {
        nfcReader = new NDEFReader();
        nfcAbortController = new AbortController();

        // Handle a tag reading.
        nfcReader.onreading = () => {
            if (!alarmRinging) {
                stopNfcScanning();
                return;
            }

            nfcStatus.textContent =
                "NFC tag detected! Starting the maths challenge.";

            stopNfcScanning();
            startMathsChallenge();
        };

        nfcReader.onreadingerror = () => {
            nfcStatus.textContent =
                "Could not read the tag. Try holding your phone " +
                "near it again.";
        };

        await nfcReader.scan({
            signal: nfcAbortController.signal
        });

        nfcScanning = true;

        nfcStatus.textContent =
            "Scanning started. Hold your phone near the NFC tag.";

    } catch (error) {
        console.error("NFC scanning error:", error);

        nfcStatus.textContent =
            "Could not start NFC scanning. Check NFC settings, " +
            "browser compatibility, HTTPS, and permissions.";

        stopNfcScanning();
    }
});

// ---------- GENERATE MATHS QUESTIONS ----------

function generateQuestion() {
    const operations = ["+", "-", "*"];

    const operation =
        operations[Math.floor(Math.random() * operations.length)];

    let a = Math.floor(Math.random() * 20) + 1;
    let b = Math.floor(Math.random() * 20) + 1;

    // Keep subtraction answers non-negative.
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
        answer: answer
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

    // Hide NFC controls once the tag has been read.
    wakeupSection.hidden = true;
    quizSection.hidden = false;
    successSection.hidden = true;

    displayQuestion();
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

    answerInput.focus();
}

// ---------- CHECK ANSWERS ----------

answerForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!alarmRinging ||
        currentQuestionIndex >= questions.length) {
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
    stopAlarm();

    successSection.hidden = false;

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
