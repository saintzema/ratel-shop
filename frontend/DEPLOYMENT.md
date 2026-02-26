# 🚀 FairPrice.ng Production Deployment Guide

This guide covers the exact steps to launch **FairPrice.ng** using the recommended startup stack: **Vercel** (Hosting) + **Supabase** (Database) + **Hostinger** (Domain). This stack is built for infinite scalability while keeping initial costs at $0.

---

## 🏗️ Step 1: Database Setup (Supabase)
We have fully modeled the FairPrice database using Prisma ORM. Here is how you connect it to a real Postgres database in the cloud:

1. Create a free account at [Supabase](https://supabase.com).
2. Click **New Project** → Name it "FairPrice" → Add a secure Database Password.
3. Once the database provisions (takes 2 minutes), go to **Project Settings > Database**.
4. Scroll down to **Connection String > URI**.
5. Copy the connection string. It looks like this:
   `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
6. Open `.env.local` in your local `frontend` folder and add it:
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" // (Same as URL but port 5432 and no pgbouncer)
   ```
7. **Sync the Database:** In your terminal, run:
   ```bash
   npx prisma db push
   ```
   *This magically creates all the 15+ tables (Users, Stores, Products, Orders) in Supabase based on the `schema.prisma` file we just wrote.*

---

## 🌐 Step 2: Push Code to GitHub
Vercel needs to read your code from GitHub to deploy it automatically.

1. Go to [GitHub.com](https://github.com) and create a repository named `fairprice-web`.
2. In your local terminal (inside the `frontend` folder), run:
   ```bash
   git init
   git add .
   git commit -m "Initial production commit"
   git branch -M main
   git remote add origin https://github.com/[YOUR-USERNAME]/fairprice-web.git
   git push -u origin main
   ```

---

## 🚀 Step 3: Deploying on Vercel
Vercel is the creator of Next.js. It requires zero DevOps.

1. Create a free account at [Vercel](https://vercel.com).
2. Click **Add New > Project**.
3. Connect your GitHub account and select the `fairprice-web` repository you just created.
4. **Environment Variables:** Before clicking Deploy, expand the "Environment Variables" section.
   Add all variables from your `.env.local` file:
   - `DATABASE_URL` 
   - `DIRECT_URL`
   - `GEMINI_API_KEY`
5. Click **Deploy**. Vercel will install dependencies, build the Next.js app, and deploy it globally. You'll get a free URL like `fairprice-web.vercel.app`.

---

## 🔗 Step 4: Connecting the Hostinger Domain
Now let's attach `www.fairprice.ng` to your Vercel deployment.

1. Log into your **Hostinger** account where you bought `fairprice.ng`.
2. Go to **Domains > fairprice.ng > DNS / Nameservers**.
3. In your **Vercel Dashboard**, go to your project → **Settings > Domains**.
4. Type `fairprice.ng` and click **Add**.
5. Vercel will give you a list of **A Records** and **CNAMEs** to add. For example:
   - Type: `A`, Name: `@`, Value: `76.76.21.21` (Vercel IP)
   - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`
6. Go back to Hostinger DNS settings. **Delete all existing A and CNAME records** and add the two exact records from Vercel. 
7. Back on Vercel, the domain will turn **Green (Valid Configuration)** and SSL will auto-provision!

---

## 🔄 Phase 3: The Final Frontend Migration (When Ready)
Now that the database and API routes (`/api/products`, `/api/orders`, etc.) are built and deployed, the final step for the engineering team is to replace the mock data.

Whenever you are ready to switch from offline mode to the real database:
1. Search the codebase for `DemoStore.getProducts()` and replace it with:
   ```tsx
   const res = await fetch('/api/products');
   const data = await res.json();
   const products = data.products;
   ```
2. Search for `DemoStore.addNegotiation()` in `ZivaChat.tsx` and replace it with:
   ```tsx
   await fetch('/api/negotiations', {
     method: 'POST',
     body: JSON.stringify({ product_id: ..., target_price: ... })
   });
   ```

*Once this frontend refactoring is done, FairPrice is fully live and scaling on a production PostgreSQL database!*
