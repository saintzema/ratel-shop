# Ratel Shop Deployment Guide

This document provides step-by-step instructions to deploy the Ratel Shop (Frontend + Backend) to production environments like Vercel and Railway.

## 1. Frontend (Next.js) -> Vercel

The frontend is optimized for Vercel's edge network.

### Steps:
1.  **Repository**: Push your code to a GitHub/GitLab/Bitbucket repository.
2.  **Import**: In the Vercel Dashboard, select "New Project" and import your repository.
3.  **Root Directory**: 
    - Look for the **Root Directory** field in the project setup screen.
    - Click **Edit** and select the **`frontend`** folder.
4.  **Framework Preset**: Ensure it says **Next.js**.
5.  **Environment Variables**:
    - Under the **Environment Variables** section, add:
    - **Key**: `NEXT_PUBLIC_API_URL`
    - **Value**: Your Render backend URL (e.g., `https://ratel-shop.onrender.com`).
6.  **Deploy**: Click **Deploy**.

---

## 2. Backend (Python/FastAPI) -> Render (Web Service)

Render needs to know where your `Dockerfile` is since it's inside the `backend` folder.

### Steps:
1.  **Select GitHub Repo**: Choose your `ratel-shop` repository.
2.  **Service Type**: Select **Web Service**.
3.  **Runtime**: Select **Docker**.
6.  **Important Settings**:
    - **Root Directory**: `backend`
    - **Dockerfile Path**: `Dockerfile`
    - **Start Command**: **LEAVE THIS EMPTY** (Render will automatically use the command inside your Dockerfile).
7.  **Environment Variables**:
    - `DATABASE_URL`: Use your connection string from **[Neon.tech](https://neon.tech/)**.
    - `PORT`: `8000`
8.  **Deploy**: Click "Create Web Service".

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
