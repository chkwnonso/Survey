// survey.js - multi-page, dynamic, offline storage, download, charts
const API_URL = "https://survey-2-v8nc.onrender.com/api/submit";

// ---- Offline storage ----
let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];

// ---- Global state ----
let currentSection = 0;
let sections = [];
let sectionResponses = []; // store per-section responses

// ---- Load questions and create sections ----
async function loadQuestions() {
    try {
        const res = await fetch("questions.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const questions = await res.json();
        const container = document.getElementById("questions");
        container.innerHTML = "";

        // Group questions by section
        const sectionMap = {};
        questions.forEach(q => {
            if (!sectionMap[q.section]) sectionMap[q.section] = [];
            sectionMap[q.section].push(q);
        });

        sections = Object.keys(sectionMap).map(section => ({
            name: section,
            questions: sectionMap[section]
        }));

        // Initialize sectionResponses
        sectionResponses = sections.map(() => ({}));

        renderSection(currentSection);

    } catch (err) {
        console.error("Failed to load questions.json:", err);
        document.getElementById("questions").innerHTML = "<p style='color:red;'>Failed to load survey questions.</p>";
    }
}

// ---- Render a section ----
function renderSection(index) {
    const container = document.getElementById("questions");
    container.innerHTML = "";

    if (index < 0 || index >= sections.length) return;
    const section = sections[index];

    const title = document.createElement("h3");
    title.innerText = section.name;
    container.appendChild(title);

    section.questions.forEach((q,i) => {
        const div = document.createElement("div");
        div.className = "question";

        const label = document.createElement("label");
        label.innerText = (i+1) + ". " + q.question;
        div.appendChild(label);

        let value = sectionResponses[index][q.id] || "";

        if (!q.type || q.type === "text") {
            const input = document.createElement("input");
            input.type = "text";
            input.name = q.id;
            input.placeholder = q.placeholder || "";
            input.value = value;
            if (q.required) input.required = true;
            div.appendChild(input);
        } else if (q.type === "textarea") {
            const textarea = document.createElement("textarea");
            textarea.name = q.id;
            textarea.rows = 3;
            textarea.placeholder = q.placeholder || "";
            textarea.value = value;
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
                if (value === opt) option.selected = true;
                select.appendChild(option);
            });
            div.appendChild(select);
        }

        container.appendChild(div);
    });

    renderNavButtons();
}

// ---- Render navigation buttons ----
function renderNavButtons() {
    let navContainer = document.getElementById("navButtons");
    if (!navContainer) {
        navContainer = document.createElement("div");
        navContainer.id = "navButtons";
        navContainer.style.marginTop = "20px";
        navContainer.style.display = "flex";
        navContainer.style.justifyContent = "space-between";
        document.getElementById("surveyForm").appendChild(navContainer);
    }
    navContainer.innerHTML = "";

    if (currentSection > 0) {
        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.innerText = "Previous";
        prevBtn.onclick = () => { saveSectionResponses(); currentSection--; renderSection(currentSection); };
        navContainer.appendChild(prevBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerText = currentSection < sections.length - 1 ? "Next" : "Submit";
    nextBtn.onclick = () => {
        if (!validateSection()) return;
        saveSectionResponses();
        if (currentSection < sections.length - 1) {
            currentSection++;
            renderSection(currentSection);
        } else {
            submitSurvey();
        }
    };
    navContainer.appendChild(nextBtn);
}

// ---- Validate current section ----
function validateSection() {
    const inputs = document.querySelectorAll("#questions input, #questions select, #questions textarea");
    for (let inp of inputs) {
        if (!inp.checkValidity()) {
            inp.reportValidity();
            return false;
        }
    }
    return true;
}

// ---- Save current section responses ----
function saveSectionResponses() {
    const formData = new FormData(document.getElementById("surveyForm"));
    formData.forEach((v,k) => sectionResponses[currentSection][k] = v);
}

// ---- Submit survey ----
async function submitSurvey() {
    const finalEntry = Object.assign({}, ...sectionResponses);
    finalEntry.timestamp = new Date().toISOString();
    finalEntry.id = Date.now();

    // Save offline
    offlineResponses.push(finalEntry);
    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));

    // Send to API
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalEntry)
        });
        if (!res.ok) throw new Error("Network error");
        alert("Survey submitted successfully ✅");
    } catch {
        alert("Survey saved offline 📱");
    }

    // Reset
    sectionResponses = sections.map(() => ({}));
    currentSection = 0;
    document.getElementById("surveyForm").reset();
    renderSection(currentSection);
}

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

// ---- Initialize ----
loadQuestions();