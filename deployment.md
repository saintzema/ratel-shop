# Ratel Shop Deployment Guide

This document provides step-by-step instructions to deploy the Ratel Shop (Frontend + Backend) to production environments like Vercel and Railway.

## 1. Frontend (Next.js) -> Vercel

The frontend is optimized for Vercel's edge network.

### Steps:
1.  **Repository**: Push your code to a GitHub/GitLab/Bitbucket repository.
2.  **Import**: In the Vercel Dashboard, select "New Project" and import your repository.
3.  **Root Directory**: Ensure the Root Directory is set to `frontend`.
4.  **Framework Preset**: Select **Next.js**.
5.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://ratel-backend.up.railway.app`).
6.  **Deploy**: Click "Deploy".

---

## 2. Backend (Python/FastAPI) -> Railway

The backend uses a production-ready Dockerfile and is best suited for Railway or Render.

### Steps:
1.  **New Project**: Select "Deploy from GitHub repo" in Railway.
2.  **Import**: Select the root folder or the `backend` subdirectory.
3.  **Docker Discovery**: Railway will automatically detect the `backend/Dockerfile`.
4.  **Environment Variables**:
    - `PORT`: `8000` (Railway injects this automatically, but ensure it's mapped).
    - `DATABASE_URL`: Your PostgreSQL/SQLite connection string.
5.  **Networking**: Ensure the port is set to `8000` in the "Settings" tab.

---

## 3. Docker Deployment (VPS/Self-Hosted)

If you are using a VPS, use the optimized Dockerfiles provided.

### Frontend Optimized Build:
```bash
cd frontend
docker build -t ratel-frontend .
docker run -p 3000:3000 ratel-frontend
```

### Backend Optimized Build:
```bash
cd backend
docker build -t ratel-backend .
docker run -p 8000:8000 ratel-backend
```

---

## Technical Notes:
- **Frontend Optimization**: Uses Node 20-slim with a multi-stage build, non-root user (`nextjs`), and `npm ci` for deterministic dependencies.
- **Backend Security**: Runs as a non-root user (`rateluser`) and uses `uvicorn` with `--proxy-headers` for correct IP forwarding behind load balancers.
- **Data Persistence**: The SQLite `ratel.db` is included in the Docker build but should be mounted as a volume for persistence in production.
