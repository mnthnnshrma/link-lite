# URL Shortener — Server

A Node.js + Express backend for the URL Shortener app, with MongoDB for storage, Redis for caching, and per-route rate limiting.

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — running locally or a cloud URI
- **Redis** (optional but recommended) — used for redirect caching and distributed rate limiting

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env   # then edit with your values

# 3. Start the development server
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `MONGO_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for signing JWTs |
| `FRONTEND_URL` | `http://localhost:5173` | Used to build short URLs |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection string |

## Redis Setup

Redis is **optional**. The app works without it — rate limiting falls back to in-memory and redirect caching is skipped. However, Redis is strongly recommended for production.

### Option 1: Docker (easiest)

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Option 2: Native Install

- **macOS**: `brew install redis && brew services start redis`
- **Ubuntu**: `sudo apt install redis-server && sudo systemctl start redis`
- **Windows**: Use [Memurai](https://www.memurai.com/) or WSL

### Verify it's running

```bash
redis-cli ping
# Expected output: PONG
```

## Rate Limits

All rate limits are per IP address.

| Endpoint | Max Requests | Window | Purpose |
|---|---|---|---|
| `POST /api/auth/signup` | 10 | 15 minutes | Prevent signup spam |
| `POST /api/auth/login` | 10 | 15 minutes | Prevent brute-force attacks |
| `POST /api/shorten` | 25 | 15 minutes | Prevent link creation abuse |
| `GET /:code` (redirects) | 500 | 1 minute | Prevent DDoS on redirects |

When a limit is exceeded, the server responds with `429 Too Many Requests`.

## Redis Caching

- **Redirect lookups** (`GET /:code`) check Redis first for the `url:<code>` key
- On a **cache miss**, MongoDB is queried and the result is cached with a **1-hour TTL**
- When a link is **updated or deleted**, the cache entry is automatically invalidated
- If Redis is unavailable, every request falls through to MongoDB (no errors)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start for production |
