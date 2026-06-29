# InciSioN GS Watch 🌍

**Global Surgery Intelligence Platform** — The world's first student-led longitudinal global surgery surveillance platform.

Built by **Seemab Mehmood**, Global Chair InciSioN 2026–27.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | Neon (PostgreSQL) |
| Hosting | Render |

---

## Deployment Guide (GitHub → Render + Neon)

### Step 1 — Set up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **New Project** → name it `gswatch`
3. Once created, go to **Dashboard → Connection Details**
4. Copy the **Connection string** — it looks like:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. The tables are created **automatically** when the server starts — no manual SQL needed ✅

---

### Step 2 — Push to GitHub

1. Create a new repo on [github.com](https://github.com) (name it `gswatch`)
2. In your terminal, inside this folder:

```bash
git init
git add .
git commit -m "Initial GS Watch deployment"
git remote add origin https://github.com/YOUR_USERNAME/gswatch.git
git push -u origin main
```

---

### Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub account and select the `gswatch` repo
4. Fill in these settings:

| Setting | Value |
|---|---|
| **Name** | `gswatch` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Click **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: *(paste your Neon connection string)*

6. Click **Create Web Service**

Render will build and deploy. In ~3 minutes you'll have a live URL like:
```
https://gswatch.onrender.com
```

---

### Step 4 — Share with contributors

Send your Render URL to InciSioN NWG representatives. They fill the form → data goes straight into Neon → your dashboard updates live.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Then edit .env and paste your Neon DATABASE_URL

# 3. Run both API and frontend together
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

---

## Project Structure

```
gswatch/
├── api/
│   └── server.js          # Express API + Neon DB
├── src/
│   ├── main.jsx           # React entry point
│   └── App.jsx            # Full GS Watch app
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/submissions` | Fetch all submissions |
| `POST` | `/api/submit` | Save a new submission |
| `DELETE` | `/api/submissions/:id` | Remove a submission (admin) |

---

## Admin Access

The default admin password is set in `src/App.jsx`:

```js
const ADMIN_PASSWORD = "gswatch2026admin";
```

**Change this before going live** — search for `ADMIN_PASSWORD` in `src/App.jsx` and update it.

---

## Important Notes

- **Free tier sleep**: Render free services sleep after 15 minutes of inactivity. First load after sleep takes ~30 seconds. Upgrade to a paid plan ($7/mo) to avoid this.
- **Database**: Neon free tier gives 0.5GB storage — enough for thousands of submissions.
- **Data**: All submissions are stored in Neon. Use the Admin Control Room to export as CSV/PDF.

---

© 2026 InciSioN — International Student Surgical Network
