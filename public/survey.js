// =============================================
// ANARK Research Survey - survey.js
// Multi-section dynamic survey with offline support
// =============================================

const API_URL = "https://survey-2-v8nc.onrender.com/api/submit";

// ============== Global State ==============
let currentSection = 0;
let sections = [];
let sectionResponses = [];

// ============== Load Questions ==============
async function loadQuestions() {
    try {
        const res = await fetch("questions.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const allQuestions = await res.json();

        // Group questions by section
        const sectionMap = {};
        allQuestions.forEach(q => {
            if (!sectionMap[q.section]) sectionMap[q.section] = [];
            sectionMap[q.section].push(q);
        });

        sections = Object.keys(sectionMap).map(sectionName => ({
            name: sectionName,
            questions: sectionMap[sectionName]
        }));

        // Initialize empty response objects for each section
        sectionResponses = sections.map(() => ({}));
        renderSection(currentSection);
    } catch (err) {
        console.error("Failed to load questions:", err);
        document.getElementById("questions").innerHTML = `
            <p style="color:#ff6b6b; text-align:center; font-size:1.1rem;">
                Failed to load survey questions. Please refresh the page.
            </p>`;
    }
}

// ============== Render Current Section ==============
function renderSection(index) {
    if (index < 0 || index >= sections.length) return;
    currentSection = index;
    const container = document.getElementById("questions");
    container.innerHTML = "";

    const section = sections[index];

    // Section Title
    const title = document.createElement("h3");
    title.style.color = "#c9a037";
    title.style.marginBottom = "25px";
    title.style.textAlign = "center";
    title.textContent = section.name;
    container.appendChild(title);

    // Render each question
    section.questions.forEach((q, i) => {
        const div = document.createElement("div");
        div.className = "question";

        const label = document.createElement("label");
        label.className = "question-label";
        label.innerHTML = `${i + 1}. ${q.question}`;
        if (q.required) label.innerHTML += ' <span style="color:#ff6b6b;">*</span>';
        div.appendChild(label);

        const savedValue = sectionResponses[index][q.id] || "";

        if (!q.type || q.type === "text") {
            const input = createInput("text", q.id, savedValue, q.required);
            div.appendChild(input);
        }
        else if (q.type === "email") {
            const input = createInput("email", q.id, savedValue, q.required);
            div.appendChild(input);
        }
        else if (q.type === "number") {
            const input = createInput("number", q.id, savedValue, q.required);
            div.appendChild(input);
        }
        else if (q.type === "textarea") {
            const textarea = document.createElement("textarea");
            textarea.name = q.id;
            textarea.rows = 4;
            textarea.value = savedValue;
            if (q.required) textarea.required = true;
            div.appendChild(textarea);
        }
        else if (q.type === "select") {
            const select = createSelect(q.id, q.options || [], savedValue, q.required);
            div.appendChild(select);
        }
        else if (q.type === "radio") {
            const group = createRadioGroup(q.id, q.options || [], savedValue, q.required);
            div.appendChild(group);
        }

        container.appendChild(div);
    });

    updateProgressUI();
    renderNavButtons();
}

// ============== Helper Functions for Inputs ==============
function createInput(type, name, value, required) {
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.value = value;
    if (required) input.required = true;
    return input;
}

function createSelect(name, options, value, required) {
    const select = document.createElement("select");
    select.name = name;
    if (required) select.required = true;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select an option";
    select.appendChild(placeholder);
    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === value) option.selected = true;
        select.appendChild(option);
    });
    return select;
}

function createRadioGroup(name, options, value, required) {
    const wrapper = document.createElement("div");
    wrapper.className = "option-group";
    options.forEach(opt => {
        const label = document.createElement("label");
        label.className = "option";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = name;
        radio.value = opt;
        if (opt === value) radio.checked = true;
        if (required) radio.required = true;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        wrapper.appendChild(label);
    });
    return wrapper;
}

// ============== Navigation Buttons ==============
function renderNavButtons() {
    document.getElementById("prevBtn").style.display = currentSection > 0 ? "block" : "none";
   
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (currentSection < sections.length - 1) {
        nextBtn.style.display = "block";
        submitBtn.style.display = "none";
        nextBtn.textContent = "Next →";
    } else {
        nextBtn.style.display = "none";
        submitBtn.style.display = "block";
    }
}

// ============== Progress & Section Indicator ==============
function updateProgressUI() {
    const progress = ((currentSection + 1) / sections.length) * 100;
    const progressBar = document.getElementById("progressBar");
    if (progressBar) progressBar.style.width = `${progress}%`;

    const indicator = document.getElementById("sectionIndicator");
    if (indicator) {
        indicator.textContent = `Section ${currentSection + 1} of ${sections.length}`;
    }
}

// ============== Save Current Section Responses ==============
function saveCurrentSection() {
    const formData = new FormData(document.getElementById("surveyForm"));
   
    formData.forEach((value, key) => {
        if (value.trim() !== "") {
            sectionResponses[currentSection][key] = value;
        }
    });
}

// ============== Validation ==============
function validateCurrentSection() {
    const inputs = document.querySelectorAll("#questions input, #questions select, #questions textarea");
   
    for (let input of inputs) {
        if (input.required && !input.checkValidity()) {
            input.reportValidity();
            return false;
        }
    }
    return true;
}

// ============== Offline Sync Logic ==============
async function syncOfflineResponses() {
    let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];
    if (offlineResponses.length === 0) return;

    console.log(`Found ${offlineResponses.length} offline survey(s) to sync...`);

    const stillOffline = [];

    for (const response of offlineResponses) {
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response)
            });

            if (res.ok) {
                console.log("✅ Synced offline survey successfully:", response.id);
            } else {
                console.warn("Server rejected offline survey:", res.status);
                stillOffline.push(response);
            }
        } catch (err) {
            console.warn("Failed to sync offline survey:", err.message || err);
            stillOffline.push(response);
        }
    }

    if (stillOffline.length > 0) {
        localStorage.setItem("offlineSurveyData", JSON.stringify(stillOffline));
    } else {
        localStorage.removeItem("offlineSurveyData");
        console.log("All offline surveys synced successfully!");
    }
}

// ============== Submit Survey ==============
async function submitSurvey() {
    saveCurrentSection();

    const finalResponse = {
        ...Object.assign({}, ...sectionResponses),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        id: "ANARK-" + Date.now().toString(36).toUpperCase()
    };

    // Always save to offline storage first
    let offlineResponses = JSON.parse(localStorage.getItem("offlineSurveyData")) || [];
    offlineResponses.push(finalResponse);
    localStorage.setItem("offlineSurveyData", JSON.stringify(offlineResponses));

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalResponse)
        });

        if (res.ok) {
            alert("✅ Thank you! Your survey has been submitted successfully.");
            localStorage.removeItem("offlineSurveyData"); // Clear after success
            console.log("Survey submitted online successfully:", finalResponse.id);
        } else {
            throw new Error(`Server returned ${res.status}`);
        }
    } catch (err) {
        console.warn("Submitted offline due to:", err.message || err);
        alert("📱 Survey saved offline. It will be submitted automatically when you're back online.");
    }

    // Reset survey
    sectionResponses = sections.map(() => ({}));
    currentSection = 0;
    renderSection(0);
}

// ============== Event Listeners ==============
document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    prevBtn.addEventListener("click", () => {
        saveCurrentSection();
        currentSection--;
        renderSection(currentSection);
    });

    nextBtn.addEventListener("click", () => {
        if (!validateCurrentSection()) return;
        saveCurrentSection();
        currentSection++;
        renderSection(currentSection);
    });

    submitBtn.addEventListener("click", () => {
        if (!validateCurrentSection()) return;
        submitSurvey();
    });

    // Load questions
    loadQuestions();

    // === Offline Sync Setup ===
    // Sync any pending responses when page loads
    syncOfflineResponses();

    // Also sync whenever user comes back online
    window.addEventListener("online", () => {
        console.log("🌐 Connection restored — syncing offline surveys...");
        syncOfflineResponses();
    });
});