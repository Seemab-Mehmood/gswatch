import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Serve built frontend in production ──────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ── Neon DB connection ───────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL);

// ── Init table if it doesn't exist ──────────────────────────────────────────
async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id           SERIAL PRIMARY KEY,
      name         TEXT,
      email        TEXT,
      nwg          TEXT,
      country      TEXT,
      region       TEXT,
      facility     TEXT,
      role         TEXT,
      gdpr         BOOLEAN,
      year         INTEGER,
      t1q1         TEXT,
      t1q2         TEXT,
      t1q3         INTEGER,
      t1q4         TEXT,
      t2q1         TEXT,
      t2q2         TEXT,
      t2q3         TEXT,
      t2q4         TEXT,
      t3q1         TEXT,
      t3q2         TEXT,
      t3q3         TEXT,
      t3q3b        TEXT,
      d1           TEXT,
      d2           TEXT,
      timestamp    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS removal_log (
      id           SERIAL PRIMARY KEY,
      submission_id INTEGER,
      removed_at   TIMESTAMPTZ DEFAULT NOW(),
      reason       TEXT,
      snapshot     JSONB
    )
  `;
  console.log('✅ Database tables ready');
}

// ── GET all submissions ──────────────────────────────────────────────────────
app.get('/api/submissions', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM submissions ORDER BY timestamp DESC`;
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ── POST a new submission ────────────────────────────────────────────────────
app.post('/api/submit', async (req, res) => {
  try {
    const s = req.body;
    await sql`
      INSERT INTO submissions
        (name, email, nwg, country, region, facility, role, gdpr, year,
         t1q1, t1q2, t1q3, t1q4,
         t2q1, t2q2, t2q3, t2q4,
         t3q1, t3q2, t3q3, t3q3b,
         d1, d2)
      VALUES
        (${s.name||null}, ${s.email||null}, ${s.nwg||null},
         ${s.country||null}, ${s.region||null}, ${s.facility||null},
         ${s.role||null}, ${s.gdpr||false}, ${s.year||new Date().getFullYear()},
         ${s.t1q1||null}, ${s.t1q2||null}, ${s.t1q3||null}, ${s.t1q4||null},
         ${s.t2q1||null}, ${s.t2q2||null}, ${s.t2q3||null}, ${s.t2q4||null},
         ${s.t3q1||null}, ${s.t3q2||null}, ${s.t3q3||null}, ${s.t3q3b||null},
         ${s.d1||null}, ${s.d2||null})
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// ── DELETE a submission (admin only) ─────────────────────────────────────────
app.delete('/api/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Save to audit log first
    const [sub] = await sql`SELECT * FROM submissions WHERE id = ${id}`;
    if (sub) {
      await sql`
        INSERT INTO removal_log (submission_id, reason, snapshot)
        VALUES (${id}, ${reason||'No reason given'}, ${JSON.stringify(sub)})
      `;
    }

    await sql`DELETE FROM submissions WHERE id = ${id}`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// ── Fallback: serve React app for all other routes ───────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 GS Watch server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  });
