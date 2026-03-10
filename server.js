// server.js - Node.js API + serve website (multi-instance safe)

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const FILE_PATH = path.join(__dirname, "responses.json");

// ---- Helper functions ----

// Read responses from file safely
function readResponses() {
    try {
        if (fs.existsSync(FILE_PATH)) {
            const data = fs.readFileSync(FILE_PATH, "utf8");
            return data ? JSON.parse(data) : [];
        }
        return [];
    } catch (err) {
        console.error("Failed to read responses.json:", err.message);
        return [];
    }
}

// Write responses to file safely
function writeResponses(data) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Failed to write responses.json:", err.message);
    }
}

// ------------------------
// Serve homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "survey.html"));
});

// ------------------------
// POST survey submissions
app.post("/api/submit", (req, res) => {
    const entry = req.body;

    // Add timestamp and ID
    entry.timestamp = entry.timestamp || new Date().toISOString();
    entry.id = entry.id || Date.now();

    // Always read current file, append, write back
    const allResponses = readResponses();
    allResponses.push(entry);
    writeResponses(allResponses);

    console.log("Received entry:", entry);

    res.json({ status: "success", message: "Response saved" });
});

// ------------------------
// GET all responses
app.get("/api/responses", (req, res) => {
    const allResponses = readResponses();
    res.json(allResponses);
});

// ------------------------
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} ✅`);
});