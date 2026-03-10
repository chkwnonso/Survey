// survey.js - fully dynamic, handles submission, offline storage, download, charts

const API_URL = "https://survey-2-v8nc.onrender.com/api/submit";

// ---- Offline storage ----
let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];

// ---- Dynamic question loader ----
async function loadQuestions() {
    try {
        const res = await fetch("questions.json");
        const questions = await res.json();
        const container = document.getElementById("questions");
        container.innerHTML = ""; // clear previous questions

        questions.forEach((q, i) => {
            const div = document.createElement("div");
            div.className = "question";

            // Question label
            const label = document.createElement("label");
            label.innerText = (i + 1) + ". " + (q.question || "");
            div.appendChild(label);

            // Input types
            if (!q.type || q.type === "text") {
                const input = document.createElement("input");
                input.type = "text";
                input.name = q.id;
                input.placeholder = q.placeholder || "";
                if (q.required) input.required = true;
                div.appendChild(input);
            } else if (q.type === "textarea") {
                const textarea = document.createElement("textarea");
                textarea.name = q.id;
                textarea.rows = 3;
                textarea.placeholder = q.placeholder || "";
                if (q.required) textarea.required = true;
                div.appendChild(textarea);
            } else if (q.type === "select") {
                const select = document.createElement("select");
                select.name = q.id;
                if (q.required) select.required = true;

                const empty = document.createElement("option");
                empty.value = "";
                empty.innerText = "Select";
                select.appendChild(empty);

                (q.options || []).forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt;
                    option.innerText = opt;
                    select.appendChild(option);
                });

                div.appendChild(select);
            }

            container.appendChild(div);
        });
    } catch (err) {
        console.error("Failed to load questions.json:", err);
        document.getElementById("questions").innerHTML = "<p style='color:red;'>Failed to load survey questions.</p>";
    }
}

loadQuestions();

// ---- Form submission ----
document.getElementById("surveyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    let entry = {};
    formData.forEach((value, key) => entry[key] = value);

    // Metadata
    entry.timestamp = new Date().toISOString();
    entry.id = Date.now();

    // Save offline
    offlineResponses.push(entry);
    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));

    // Send to API
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error("Network error");
        alert("Submitted successfully ✅");
    } catch {
        alert("Saved offline 📱");
    }

    e.target.reset();
});

// ---- Retry sending offline submissions ----
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
                    offlineResponses = offlineResponses.filter(e => e.id !== entry.id);
                    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));
                    console.log("Offline entry sent:", entry);
                }
            } catch {}
        }
    }
}

setInterval(sendPending, 5000);
window.addEventListener("online", sendPending);

// ---- Download JSON ----
document.getElementById("downloadJSON").addEventListener("click", () => {
    if(offlineResponses.length === 0){ alert("No responses!"); return; }
    const blob = new Blob([JSON.stringify(offlineResponses, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "survey_results.json";
    a.click();
});

// ---- Download CSV ----
document.getElementById("downloadCSV").addEventListener("click", () => {
    if(offlineResponses.length === 0){ alert("No responses!"); return; }
    const headers = Object.keys(offlineResponses[0]);
    let csv = headers.join(",") + "\n";
    offlineResponses.forEach(r => {
        csv += headers.map(h => `"${(r[h]||"").toString().replace(/"/g,'""')}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "survey_results.csv";
    a.click();
});

// ---- Show Charts ----
document.getElementById("showCharts").addEventListener("click", () => {
    if(offlineResponses.length === 0){ alert("No responses!"); return; }

    // Count importance options if present
    const counts = {};
    offlineResponses.forEach(r => {
        if(r.importance) counts[r.importance] = (counts[r.importance]||0)+1;
    });

    const ctx = document.getElementById("importanceChart").getContext("2d");
    if(window.importanceChart) window.importanceChart.destroy();

    window.importanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Responses',
                data: Object.values(counts),
                backgroundColor: 'rgba(54,162,235,0.6)'
            }]
        },
        options: { responsive:true, maintainAspectRatio:false }
    });
});