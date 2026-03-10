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



/* =====================================================
   NEW FEATURE (Added below your code)
   Dynamically load questions from questions.json
===================================================== */

fetch("questions.json")
.then(res => res.json())
.then(questions => {

    const form = document.getElementById("surveyForm");

    questions.forEach((q,i)=> {

        const div = document.createElement("div");
        div.className = "question";

        const label = document.createElement("label");
        label.innerText = (i+1) + ". " + (q.question || "");
        div.appendChild(label);

        // TEXT INPUT
        if(q.type === "text"){
            const input = document.createElement("input");
            input.type = "text";
            input.name = "q" + q.id;
            div.appendChild(input);
        }

        // TEXTAREA
        if(q.type === "textarea"){
            const input = document.createElement("textarea");
            input.name = "q" + q.id;
            div.appendChild(input);
        }

        // RADIO OPTIONS
        if(q.type === "radio"){
            q.options.forEach(opt => {
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "q" + q.id;
                radio.value = opt;

                const span = document.createElement("span");
                span.innerText = opt;

                div.appendChild(radio);
                div.appendChild(span);
                div.appendChild(document.createElement("br"));
            });
        }

        // Add question before submit button
        const submitButton = form.querySelector("button[type='submit']");
        form.insertBefore(div, submitButton);

    });

})
.catch(err => console.log("Could not load questions.json", err));