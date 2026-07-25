# URL Shortener (MERN Stack + Redis)

A high-performance, feature-rich URL Shortener application built with **MongoDB**, **Express**, **React**, and **Node.js**, powered by **Redis** caching and rate-limiting.

---

## 🌟 Architecture & Features

### Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (Vercel)                                   |
|   React SPA (Vite) + Recharts + httpOnly Cookies (Auth State & API Interceptor)   |
+----------------------------------------+------------------------------------------+
                                         |
                                   HTTP / HTTPS
                                         |
+----------------------------------------v------------------------------------------+
|                                BACKEND (Render)                                   |
|                  Node.js / Express Server + JWT Cookie Middleware                 |
+-------------------+------------------------------------+--------------------------+
                    |                                    |
            Cache Lookup (Read/Write)                    | Event Log & Primary Store
                    |                                    |
+-------------------v-------------------+    +-----------v--------------------------+
|       CACHE & LIMIT (Redis Cloud)     |    |      DATABASE (MongoDB Atlas)        |
|  - Fast URL Lookups (1hr TTL)         |    |  - Users Collection                   |
|  - Distributed Rate Limiter           |    |  - Urls Collection (Denormalized)     |
|  - Automatic Fallback to RAM          |    |  - Clicks Collection (Event-driven)   |
+---------------------------------------+    +--------------------------------------+
```

### Key Features

1. **User Authentication (JWT + httpOnly Cookies & Google OAuth)**
   - Secure signup & login using `bcrypt` password hashing.
   - Seamless 1-click **Google OAuth 2.0** login with Account Linking.
   - Session management via `httpOnly` secure cookies (protected against XSS & CSRF).
   - Seamless session recovery via `/api/auth/me` on client startup.

2. **Smart URL Shortening & Custom Aliases**
   - Instant Base62 short code generation (7 characters).
   - Support for custom aliases for authenticated users.
   - **User-Scoped Deduplication**: Submitting an existing URL reuses the existing short code *only* for that user account. Anonymous users get isolated short links.

3. **High-Performance Caching (Redis)**
   - `GET /:code` check Redis cache first before querying MongoDB.
   - Instant 302 redirects with minimal database load.
   - Automatic cache invalidation upon URL updates or deletions.
   - **Graceful Fallback**: If Redis is offline, the backend seamlessly falls back to MongoDB without breaking.

4. **Analytics & Analytics Dashboard**
   - Event-driven tracking: User-Agent parsing (Browser, OS, Device Type), Geolocation (Country), and Bot filtering (Googlebot, Bingbot, etc.).
   - Denormalized click count for $O(1)$ fast rendering on user dashboards.
   - Interactive charts powered by **Recharts**: Clicks over time, Device breakdown, Top OS, Referrers, and Geographic distribution.

5. **Rate Limiting & Security**
   - Configurable IP-based rate limiting on sensitive routes (`auth`, `shorten`, `redirect`).
   - Automatically disabled in development mode for easy local testing.
   - Production-ready security headers & strict CORS origin setup.

6. **Modern, Responsive UI with Dark Mode**
   - Beautiful, fully responsive layout built with custom CSS variables.
   - Built-in Dark/Light theme toggle that persists via `localStorage`.
   - Sleek **Toast Notifications** for immediate, non-intrusive user feedback (copying, auth, errors).
   - Auto-detects user's system preferences on first visit.

7. **Branded Interstitial Redirect Page**
   - Intercepts shortlink visits (`/:code`) to display a sleek, glassmorphic landing page before redirecting.
   - Dynamic 4-second countdown paired with an animated gradient progress bar.
   - Prominent **"Skip / Continue Now"** button for instant redirection.
   - Transparently displays destination URL for user verification and security.
   - Includes custom branding signature: `"⚡ Powered by SharmaG"`.

---

## 📁 Project Structure

```
url-shortener/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Profile Dropdown
│   │   ├── context/            # AuthContext (cookie-based state)
│   │   ├── pages/              # Home, Login, Signup, MyLinks, Stats, Redirect
│   │   ├── App.jsx             # Main Router & Loading Gate
│   │   ├── App.css             # Vanilla CSS Design System
│   │   └── index.css           # CSS Variables & Global Reset
│   ├── vercel.json             # Vercel SPA Rewrites Config
│   └── vite.config.js          # Vite Proxy Config
│
└── server/                     # Express Backend
    ├── middleware/             # auth, errorHandler, rateLimit
    ├── models/                 # User, Url, Click (Mongoose)
    ├── routes/                 # auth, shorten, urls, redirect
    ├── utils/                  # generateCode, validateUrl, redis
    └── server.js               # Entry Point & Express Setup
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18+ installed
- **MongoDB**: Local instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI
- **Redis** *(Optional)*: Local Redis instance running on `redis://127.0.0.1:6379`

### 1. Server Setup

```bash
cd server
npm install
```

Create a `.env` file inside `/server`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/url-shortener
JWT_SECRET=super_secret_jwt_key_change_in_production
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
```

Start the backend development server:

```bash
npm run dev
```

### 2. Client Setup

```bash
cd ../client
npm install
```

Create a `.env` file inside `/client`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Reference

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/api/health` | `GET` | No | System health check |
| `/api/auth/signup` | `POST` | No | Create account & set httpOnly JWT cookie |
| `/api/auth/login` | `POST` | No | Authenticate & set httpOnly JWT cookie |
| `/api/auth/google` | `GET` | No | Initiates Google OAuth login flow |
| `/api/auth/google/callback` | `GET` | No | Handles Google callback & issues JWT cookie |
| `/api/auth/logout` | `POST` | No | Clear authentication cookie |
| `/api/auth/me` | `GET` | No | Return current logged in user (if cookie exists) |
| `/api/shorten` | `POST` | Optional | Shorten long URL (attach user if authenticated) |
| `/api/urls/mine` | `GET` | **Yes** | Return all links created by logged in user |
| `/api/urls/:id` | `PUT` | **Yes** | Update long URL or custom alias for a link |
| `/api/urls/:id` | `DELETE` | **Yes** | Delete a link and invalidate Redis cache |
| `/api/urls/:code/stats` | `GET` | **Yes** | Get detailed analytics & chart aggregations |
| `/:code` | `GET` | No | Redirect short code to original URL (302) |

---

## 🔑 Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Default / Description |
|---|---|---|
| `PORT` | No | `5000` |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Random 32+ character string for JWT signing |
| `FRONTEND_URL` | **Yes** | Client origin for CORS & cookies (e.g. `http://localhost:5173` or `https://your-app.vercel.app`) |
| `BACKEND_URL` | **Yes** | Backend host for Google callback (e.g. `http://localhost:5000` or `https://backend.onrender.com`) |
| `GOOGLE_CLIENT_ID` | **Yes** | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET`| **Yes**| Google Cloud OAuth Client Secret |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` (Falls back gracefully if absent) |
| `NODE_ENV` | Recommended | `development` or `production` |

### Frontend (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | **Yes** | Backend URL (e.g. `http://localhost:5000` or `https://your-backend.onrender.com`) |

---

## 🌐 Production Deployment Guide

### 1. Database Setup (MongoDB Atlas)
1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free M0 cluster and database user.
3. In **Network Access**, add IP `0.0.0.0/0` (allowing Render backend connections).
4. Copy the connection string (e.g., `mongodb+srv://user:password@cluster.mongodb.net/url-shortener`).

### 2. Cache Setup (Redis Cloud)
1. Create a free account on [Redis Cloud](https://redis.io/try-free/).
2. Create a free 30MB Redis database.
3. Copy the Redis URI (e.g., `redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345`).

### 3. Backend Deployment (Render)
1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository and set Root Directory to `server`.
3. Set Build Command to `npm install` and Start Command to `node server.js`.
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `<your-atlas-uri>`
   - `REDIS_URL`: `<your-redis-cloud-uri>`
   - `JWT_SECRET`: `<your-random-jwt-secret>`
   - `FRONTEND_URL`: `https://<your-vercel-app>.vercel.app`
   - `BACKEND_URL`: `https://<your-render-backend>.onrender.com`
   - `GOOGLE_CLIENT_ID`: `<your-google-client-id>`
   - `GOOGLE_CLIENT_SECRET`: `<your-google-client-secret>`

### 4. Frontend Deployment (Vercel)
1. Import your project into [Vercel](https://vercel.com/).
2. Set Root Directory to `client`.
3. Set Framework Preset to **Vite**.
4. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-backend>.onrender.com`
5. Deploy! Vercel will handle SPA client-side routes via `client/vercel.json`.

---

## 🔮 Future Roadmap

1. **QR Code Generation**: Generate downloadable PNG/SVG QR codes for every short URL.
2. **Link Expiration**: Set optional expiration dates/times for temporary short links.
3. **UTM Campaign Builder**: Attach UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`) dynamically upon redirect.
