const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

let responses = [];

app.get("/", (req, res) => res.send("Survey API running ✅"));

app.post("/api/submit", (req, res) => {
  const entry = req.body;
  if (!entry.timestamp) entry.timestamp = new Date().toISOString();
  if (!entry.id) entry.id = Date.now();

  responses.push(entry);

  try {
    const filePath = path.join(__dirname, "responses.json");
    let data = [];
    if (fs.existsSync(filePath)) data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    data.push(entry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("Failed to write JSON:", err.message);
  }

  console.log("Received:", entry);
  res.json({ status: "success", message: "Response saved" });
});

app.get("/api/responses", (req, res) => res.json(responses));

app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));