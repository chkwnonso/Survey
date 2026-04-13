// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors({
  origin: "https://anark.ng"
}));
const PORT = process.env.PORT || 3000;

// ======================
// Middleware
// ======================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// PostgreSQL Connection
// ======================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test DB + Create Table
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Connected to PostgreSQL');

    return pool.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id SERIAL PRIMARY KEY,
        survey_id VARCHAR(50) UNIQUE,
        response_data JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  })
  .then(() => {
    console.log('✅ survey_responses table ready');
  })
  .catch(err => {
    console.error('❌ Database setup error:', err.message);
  });

// ======================
// Routes
// ======================

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'ok',
      database_time: result.rows[0].current_time,
      message: 'Server & PostgreSQL are running smoothly!'
    });
  } catch (err) {
    console.error('Health check error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Example users route
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ======================
// ✅ Survey Submission Route (FIXED)
// ======================
app.post('/api/survey', async (req, res) => {
  try {
    console.log('=== SURVEY SUBMISSION RECEIVED ===');

    const { survey_id, response_data } = req.body;

    if (!survey_id || !response_data) {
      return res.status(400).json({
        error: 'Missing survey_id or response_data'
      });
    }

    const result = await pool.query(
      `INSERT INTO survey_responses (survey_id, response_data)
       VALUES ($1, $2)
       RETURNING *`,
      [survey_id, response_data]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('Survey submission error:', err.message);

    // Handle duplicate survey_id
    if (err.code === '23505') {
      return res.status(400).json({
        error: 'Survey already submitted'
      });
    }

    res.status(500).json({
      error: 'Failed to save survey',
      details: err.message
    });
  }
});

//admin dash board//
app.get('/admin/responses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM survey_responses ORDER BY submitted_at DESC'
    );

    const rows = result.rows;

    let html = `
    <html>
    <head>
      <title>Admin Responses</title>
      <style>
        body { font-family: Arial; background:#111; color:#fff; padding:20px; }
        h2 { color:#c9a037; }
        .card {
          background:#222;
          padding:15px;
          margin-bottom:10px;
          border-radius:8px;
        }
        .id { color:#c9a037; font-weight:bold; }
        .time { font-size:12px; color:#aaa; margin-bottom:10px; }
        pre {
          background:#000;
          padding:10px;
          overflow:auto;
          border-radius:6px;
        }
      </style>
    </head>
    <body>
      <h2>📊 Survey Responses (Admin Dashboard)</h2>
      <p>Total Responses: ${rows.length}</p>
    `;

    if (rows.length === 0) {
      html += `<p>No responses yet.</p>`;
    } else {
      rows.forEach(r => {
        html += `
          <div class="card">
            <div class="id">ID: ${r.survey_id}</div>
            <div class="time">Submitted: ${r.submitted_at}</div>
            <pre>${JSON.stringify(r.response_data, null, 2)}</pre>
          </div>
        `;
      });
    }

    html += `
    </body>
    </html>
    `;

    res.send(html);

  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.status(500).send('Error loading responses');
  }
});


// ======================
// GET ALL SURVEY RESPONSES (FIX FOR DASHBOARD)
// ======================
app.get('/api/responses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM survey_responses ORDER BY submitted_at DESC'
    );

    // flatten JSONB for frontend
    const formatted = result.rows.map(r => ({
      survey_id: r.survey_id,
      submitted_at: r.submitted_at,
      ...r.response_data
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Fetch responses error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch responses',
      details: err.message
    });
  }
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug-responses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM survey_responses');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 404 Handler (MUST BE LAST)
// ======================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// ======================
// Start Server
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: /public`);
});