// survey.js - multi-page dynamic survey with progress bar

const API_URL = "https://survey-2-v8nc.onrender.com/api/submit";

// ---- Offline storage ----
let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];

// ---- Global state ----
let currentSection = 0;
let sections = [];
let sectionResponses = [];

// ---- Load questions ----
async function loadQuestions() {
    try {
        const res = await fetch("questions.json");
        if (!res.ok) throw new Error("HTTP " + res.status);

        const questions = await res.json();
        const container = document.getElementById("questions");
        container.innerHTML = "";

        const sectionMap = {};

        questions.forEach(q => {
            if (!sectionMap[q.section]) sectionMap[q.section] = [];
            sectionMap[q.section].push(q);
        });

        sections = Object.keys(sectionMap).map(section => ({
            name: section,
            questions: sectionMap[section]
        }));

        sectionResponses = sections.map(() => ({}));

        // Create progress bar & section indicator if not in HTML
        setupProgressUI();

        renderSection(currentSection);

    } catch (err) {
        console.error("Failed to load questions:", err);
        document.getElementById("questions").innerHTML =
            "<p style='color:red;'>Failed to load survey questions.</p>";
    }
}

// ---- Setup progress UI ----
function setupProgressUI() {
    const surveyForm = document.getElementById("surveyForm");

    // Progress container
    let progressContainer = document.getElementById("progressContainer");
    if (!progressContainer) {
        progressContainer = document.createElement("div");
        progressContainer.id = "progressContainer";
        progressContainer.style.marginBottom = "20px";
        surveyForm.prepend(progressContainer);

        // Section indicator
        const indicator = document.createElement("div");
        indicator.id = "sectionIndicator";
        indicator.style.marginBottom = "6px";
        indicator.style.fontWeight = "bold";
        progressContainer.appendChild(indicator);

        // Progress bar background
        const barBg = document.createElement("div");
        barBg.style.width = "100%";
        barBg.style.height = "12px";
        barBg.style.background = "#ccc";
        barBg.style.borderRadius = "6px";
        progressContainer.appendChild(barBg);

        // Progress bar itself
        const bar = document.createElement("div");
        bar.id = "progressBar";
        bar.style.height = "12px";
        bar.style.width = "0%";
        bar.style.background = "#3b82f6";
        bar.style.borderRadius = "6px";
        barBg.appendChild(bar);
    }
}

// ---- Render section ----
function renderSection(index) {

    const container = document.getElementById("questions");
    container.innerHTML = "";

    if (index < 0 || index >= sections.length) return;

    const section = sections[index];

    const title = document.createElement("h3");
    title.innerText = section.name;
    container.appendChild(title);

    section.questions.forEach((q, i) => {

        const div = document.createElement("div");
        div.className = "question";

        const label = document.createElement("label");
        label.innerText = (i + 1) + ". " + q.question;
        div.appendChild(label);

        let value = sectionResponses[index][q.id] || "";

        if (!q.type || q.type === "text") {

            const input = document.createElement("input");
            input.type = "text";
            input.name = q.id;
            input.value = value;
            if (q.required) input.required = true;
            div.appendChild(input);

        } else if (q.type === "textarea") {

            const textarea = document.createElement("textarea");
            textarea.name = q.id;
            textarea.rows = 3;
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

    // ---- Update section indicator ----
    const indicator = document.getElementById("sectionIndicator");
    if (indicator && sections.length > 0) {
        indicator.innerText = `Section ${currentSection + 1} of ${sections.length}`;
    }

    // ---- Update progress bar ----
    updateProgressBar();
}

// ---- Navigation buttons ----
function renderNavButtons() {

    let navContainer = document.getElementById("navButtons");

    if (!navContainer) {
        navContainer = document.createElement("div");
        navContainer.id = "navButtons";
        document.getElementById("surveyForm").appendChild(navContainer);
    }

    navContainer.innerHTML = "";

    if (currentSection > 0) {

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.innerText = "Previous";
        prevBtn.onclick = () => {
            saveSectionResponses();
            currentSection--;
            renderSection(currentSection);
        };

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

// ---- Validation ----
function validateSection() {

    const inputs = document.querySelectorAll(
        "#questions input, #questions select, #questions textarea"
    );

    for (let inp of inputs) {

        if (!inp.checkValidity()) {
            inp.reportValidity();
            return false;
        }
    }

    return true;
}

// ---- Save responses ----
function saveSectionResponses() {

    const formData = new FormData(document.getElementById("surveyForm"));

    formData.forEach((v, k) => {
        sectionResponses[currentSection][k] = v;
    });
}

// ---- Submit survey ----
async function submitSurvey() {

    const finalEntry = Object.assign({}, ...sectionResponses);
    finalEntry.timestamp = new Date().toISOString();
    finalEntry.id = Date.now();

    offlineResponses.push(finalEntry);
    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));

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

    sectionResponses = sections.map(() => ({}));
    currentSection = 0;

    document.getElementById("surveyForm").reset();
    renderSection(currentSection);
}

// ---- Progress Bar ----
function updateProgressBar() {
    const progress = ((currentSection + 1) / sections.length) * 100;
    const bar = document.getElementById("progressBar");
    if (bar) bar.style.width = progress + "%";
}

// ---- Start ----
loadQuestions();