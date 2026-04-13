// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
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