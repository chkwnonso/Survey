// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middleware
// ======================
app.use(express.json());                    // Parse JSON bodies

// Serve static files from "public" folder - This makes your website work
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// Routes
// ======================

// Home route - serves your public/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check route (tests both server and database)
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

// Example: Get users (you can remove or modify later)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 404 handler - shows when route is not found
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// ======================
// PostgreSQL Connection Pool
// ======================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres requires SSL
  ssl: {
    rejectUnauthorized: false   // Required for Render
  }
});

// Test database connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Connected to PostgreSQL successfully!');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Make sure DATABASE_URL is set correctly in Render Environment tab.');
  });

// Test database connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

// ======================
// Start Server
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: /public`);
});