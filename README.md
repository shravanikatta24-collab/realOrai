# 🎮 REAL OR AI — Multiplayer Web Game

A real-time, room-based multiplayer guessing game where players determine if facts or images are real or AI-generated.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/realOrai
ADMIN_PASSWORD=admin@bmsccm2026
CLIENT_URL=http://localhost:5173
```

**Client** (`client/.env`):
```env
VITE_SERVER_URL=http://localhost:4000
```

### 3. Run

Open two terminals:

```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client
cd client
npm run dev
```

Open browser at `http://localhost:5173`

---

## 🔐 Admin Access

- **URL:** `/admin`
- **Password:** `admin@bmsccm2026`

---

## 🎯 How to Play

### Admin Flow
1. Login at `/admin`
2. Go to **Questions** tab → Add questions to the bank
3. Go to **Rooms** tab → Create a room
4. Share the **Room Code** with players
5. Watch players join, then click **START GAME**
6. Monitor the live scoreboard

### Player Flow
1. Go to `/join` (or homepage → PLAY)
2. Enter a username + room code
3. Wait for admin to start
4. For each question: choose **REAL** or **AI** before timer runs out
5. See your final score and rank

---

## 📁 Project Structure

```
realOrai/
├── server/
│   ├── models/
│   │   ├── Question.js        # Question schema
│   │   └── Room.js            # Room + Player schema
│   ├── routes/
│   │   └── admin.js           # Admin REST API routes
│   ├── socket/
│   │   └── gameHandler.js     # All Socket.io game logic
│   ├── .env.example
│   ├── index.js               # Server entry point
│   └── package.json
│
└── client/
    ├── src/
    │   ├── components/
    │   │   └── TimerRing.jsx  # Animated countdown timer
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── PlayerJoin.jsx
    │   │   ├── PlayerGame.jsx
    │   │   ├── AdminLogin.jsx
    │   │   └── AdminDashboard.jsx
    │   ├── App.jsx
    │   ├── socket.js          # Socket singleton
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | TailwindCSS + Framer Motion |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | Admin password via HTTP header |

---

## ⚙️ Scoring Formula

```
Correct answer:  score = 10 + remaining_seconds
Wrong / timeout: score = 0
```

---

## 🔒 Security

- Admin password verified server-side on every request
- Game logic (scoring, answer validation) runs on backend only
- Players cannot see other players' scores during game
- Socket connections validated with room membership

---

## 🌐 Production Deployment

### Backend (e.g. Railway, Render)
- Set all env variables
- `npm start`

### Frontend (e.g. Vercel, Netlify)
- Set `VITE_SERVER_URL` to your backend URL
- `npm run build` → deploy `dist/`

### MongoDB
- Use MongoDB Atlas free tier, update `MONGODB_URI`
