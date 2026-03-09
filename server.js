// server.js - Node.js API + serve survey.html

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const app = express();
app.use(express.static("public")); // <-- this tells Express to serve anything in the public folder
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// In-memory storage
let responses = [];

// ------------------------
// Serve survey.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "survey.html"));
});

// ------------------------
// API endpoint to receive survey submissions
app.post("/api/submit", (req, res) => {
    const entry = req.body;

    if (!entry.timestamp) entry.timestamp = new Date().toISOString();
    if (!entry.id) entry.id = Date.now();

    responses.push(entry);

    // Optional: save to JSON file
    try {
        const filePath = path.join(__dirname, "responses.json");
        let data = [];
        if (fs.existsSync(filePath)) {
            data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        }
        data.push(entry);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.log("Failed to write to responses.json:", err.message);
    }

    console.log("Received entry:", entry);
    res.json({ status: "success", message: "Response saved" });
});

// ------------------------
// Get all saved responses
app.get("/api/responses", (req, res) => {
    res.json(responses);
});

// ------------------------
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} ✅`);
});