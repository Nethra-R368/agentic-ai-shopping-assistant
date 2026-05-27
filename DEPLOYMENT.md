# Production Deployment Guide

This guide explains how to deploy the Agentic AI E-commerce Assistant to production using **Vercel** (Frontend) and **Render** (Backend).

## 1. Database Migration (MongoDB Atlas)

Currently, you are using a local MongoDB instance (`mongodb://localhost:27017`). For production, you must move to a cloud database.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free cluster.
2. Under "Database Access", create a user with a secure password.
3. Under "Network Access", allow access from anywhere (`0.0.0.0/0`).
4. Click "Connect" -> "Drivers" and copy your connection string. It will look like:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`
5. **CRITICAL**: Do NOT commit this URL to GitHub. We will add it to our environment variables in Render.

## 2. Pushing to GitHub

1. Initialize a git repository in the root of your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for AI E-commerce Assistant"
   ```
2. Create a new repository on GitHub and push your code.

## 3. Backend Deployment (Render)

We have already created a `render.yaml` infrastructure-as-code file and a `start.sh` script for you.

1. Create an account on [Render](https://render.com/).
2. Click "New" -> "Blueprint".
3. Connect your GitHub repository. Render will automatically detect the `render.yaml` file and create a Web Service.
4. Go to the dashboard for your new Web Service -> "Environment".
5. Add the following variables:
   - `GEMINI_API_KEY`: Your Google AI Studio key.
   - `MONGO_URI`: The MongoDB Atlas connection string you copied earlier.
   - `CORS_ORIGINS`: We will fill this in after deploying the frontend!
6. Click "Deploy". Your backend URL will be something like `https://ecommerce-ai-backend.onrender.com`.

## 4. Frontend Deployment (Vercel)

We have already created a `vercel.json` file to handle SPA routing.

1. Create an account on [Vercel](https://vercel.com/).
2. Click "Add New" -> "Project" and import your GitHub repository.
3. Set the **Framework Preset** to `Vite`.
4. Set the **Root Directory** to `frontend`.
5. Under Environment Variables, add:
   - `VITE_API_BASE_URL`: The URL of your Render backend (e.g., `https://ecommerce-ai-backend.onrender.com`).
6. Click "Deploy". Vercel will give you a URL (e.g., `https://my-frontend.vercel.app`).

## 5. Final Connection

1. Go back to your Render dashboard.
2. Under Environment Variables, add your Vercel URL to `CORS_ORIGINS`.
   - `CORS_ORIGINS`: `https://my-frontend.vercel.app`
3. Trigger a manual deploy on Render so the new CORS rules take effect.

Congratulations! Your AI Agent is now live globally!

## Troubleshooting

- **CORS Errors**: If the frontend console shows CORS errors, double-check that your `CORS_ORIGINS` on Render exactly matches your Vercel URL (no trailing slash).
- **MongoDB Connection Errors**: Ensure your cluster's Network Access is set to allow IPs from anywhere (`0.0.0.0/0`), as Render's IP addresses change dynamically.
- **FAISS Errors**: Render's free tier has limited RAM. If building the FAISS index crashes due to Out of Memory (OOM), reduce the number of products you seed the database with.
