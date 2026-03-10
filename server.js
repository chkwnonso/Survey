// server.js - Node.js API + serve website

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

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// ------------------------
// In-memory storage
let responses = [];

// ------------------------
// Serve homepage (index.html or survey.html)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "survey.html"));
});

// ------------------------
// API endpoint to receive survey submissions
app.post("/api/submit", (req, res) => {

    const entry = req.body;

    if (!entry.timestamp) entry.timestamp = new Date().toISOString();
    if (!entry.id) entry.id = Date.now();

    responses.push(entry);

    // Save responses to JSON file
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

    res.json({
        status: "success",
        message: "Response saved"
    });

});

// ------------------------
// Get all saved responses (for dashboard)
app.get("/api/responses", (req, res) => {

    try {

        const filePath = path.join(__dirname, "responses.json");

        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return res.json(data);
        }

        res.json(responses);

    } catch (err) {

        console.log("Error reading responses:", err);

        res.json(responses);

    }

});

// ------------------------
// Start server
app.listen(PORT, () => {

    console.log(`Server running on port ${PORT} ✅`);

});