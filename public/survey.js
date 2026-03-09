// survey.js - handles form submission and offline storage

// -----------------------------
// Change this to your Render URL
const API_URL = "https://survey-2-v8nc.onrender.com/api/submit";

// Load any previously saved offline entries
let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];

// -----------------------------
// Submit form
document.getElementById("surveyForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const entry = {
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        course: document.getElementById("course").value,
        timestamp: new Date().toISOString()
    };

    try {
        // Try sending to API
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
        });

        if (!res.ok) throw new Error("Network error");

        document.getElementById("status").innerText = "Submitted successfully ✅";

    } catch (err) {
        // Save offline if API fails
        offlineResponses.push(entry);
        localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));
        document.getElementById("status").innerText = "Saved offline 📱";
    }

    // Clear form
    document.getElementById("surveyForm").reset();
});

// -----------------------------
// Retry sending offline submissions
async function sendPending() {
    if (navigator.onLine && offlineResponses.length > 0) {
        const copy = [...offlineResponses];
        for (let entry of copy) {
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(entry)
                });
                if (res.ok) {
                    // Remove successfully sent entry
                    offlineResponses = offlineResponses.filter(e => e.timestamp !== entry.timestamp);
                    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));
                    console.log("Offline entry sent:", entry);
                }
            } catch (err) {
                console.log("Still offline, will retry later");
            }
        }
    }
}

// Check every 5 seconds
setInterval(sendPending, 5000);
window.addEventListener("online", sendPending);