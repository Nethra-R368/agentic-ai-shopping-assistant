# 🛍️ AuraBuy – Multimodal AI Shopping Concierge

AuraBuy is an Agentic AI-powered shopping assistant that helps users discover products using **text, voice, and image inputs**. Instead of manually browsing multiple websites, users can describe what they need and receive intelligent, real-time recommendations powered by LLMs and live web retrieval.

---

## 🚀 Features

### 🔍 Intelligent Product Discovery
- Search products using natural language.
- Example:
  - "Best editing laptop under ₹50,000"
  - "Find a winter jacket for extreme weather"
  - "Suggest a gift for a software engineer"

### 🤖 Agentic AI Workflows
- Powered by LangGraph and LangChain.
- Multi-step reasoning and tool calling.
- Product comparison and recommendation generation.

### 🌐 Real-Time Internet Retrieval
- Retrieves live product information using SerpAPI.
- Fetches:
  - Product names
  - Prices
  - Ratings
  - Seller information
  - Product links
  - Images

### 🎙️ Voice Input
- Continuous Speech-to-Text using Web Speech API.
- Hands-free shopping assistance.

### 🔊 Voice Output
- Text-to-Speech support.
- AI responses can be read aloud.

### 🖼️ Image-Based Recommendations
- Upload images and receive contextual recommendations.
- Powered by Gemini Vision.
- Example:
  - Upload a dress and ask for matching jewelry.
  - Upload furniture and ask for matching decor.

### ⚡ Fast-Path Architecture
- Simple product searches bypass heavy agent workflows.
- Reduced latency for common shopping queries.

### 🧠 Conversation Memory
- Session-based memory using LangGraph and MongoDB.
- Supports contextual follow-up questions.

### 💾 MongoDB Query Cache
- Frequently searched products are cached.
- Reduces API calls and improves response speed.

---

# 🏗️ System Architecture

```text
User
 ↓
React Frontend
 ↓
FastAPI Backend
 ↓
Fast Path OR LangGraph Agent
 ↓
Product Search Tool
 ↓
MongoDB Cache
 ↓
SerpAPI (Google Shopping)
 ↓
Gemini Reasoning
 ↓
Frontend Rendering
```

---

# 🛠️ Tech Stack

## Frontend

- React 19
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Web Speech API

## Backend

- FastAPI
- Python 3.11
- LangChain
- LangGraph

## AI

- Google Gemini Flash
- Gemini Vision

## Data & Search

- SerpAPI
- MongoDB Atlas

## Deployment

- Vercel (Frontend)
- Render (Backend)

---

# 📂 Project Structure

```text
agentic-ai-shopping-assistant
│
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── chat
│   │   │   ├── products
│   │   ├── services
│   │   └── App.jsx
│
├── backend
│   ├── api
│   ├── agents
│   ├── tools
│   ├── rag
│   ├── models
│   └── main.py
│
├── render.yaml
├── vercel.json
└── README.md
```

---

# 🔄 Workflow

## Step 1: User Query

User provides:
- Text
- Voice
- Image

Example:

```text
Best laptop under ₹50,000
```

---

## Step 2: FastAPI Receives Request

Request reaches:

```text
backend/api/chat.py
```

---

## Step 3: Routing Decision

### Fast Path

Used for:

```text
Best laptop under ₹50,000
```

Provides ultra-fast retrieval.

### LangGraph Agent

Used for:

```text
Compare iPhone 15 vs Samsung S24
```

Provides deeper reasoning.

---

## Step 4: Product Retrieval

Tool:

```text
backend/tools/product_search.py
```

Flow:

```text
MongoDB Cache
 ↓
SerpAPI
 ↓
Google Shopping Results
```

---

## Step 5: AI Reasoning

Gemini receives:

- User query
- Product results
- Conversation context

Generates:

- Recommendations
- Comparisons
- Explanations

---

## Step 6: Frontend Rendering

React renders:

- AI responses
- Product cards
- Seller links
- Voice controls

---

# 🎤 Voice Features

### Speech-to-Text

- Continuous microphone input
- Real-time transcription

### Text-to-Speech

- Read AI responses aloud
- Start/stop controls

---

# 🖼️ Vision Features

Powered by Gemini Vision.

Examples:

### Outfit Matching

Upload:

```text
Black Dress
```

Ask:

```text
Suggest matching accessories
```

### Home Decor

Upload:

```text
Living Room
```

Ask:

```text
Recommend matching furniture
```

---

# ⚡ Performance Optimizations

### Fast Path Router

Reduces latency by bypassing full agent workflows for simple searches.

### MongoDB Query Cache

Stores previously retrieved products for faster future searches.

### Session Isolation

Unique UUID per conversation prevents memory leakage between users.

---

# 🔐 Environment Variables

Backend:

```env
GEMINI_API_KEY=your_key
SERPAPI_API_KEY=your_key
MONGO_URI=your_mongodb_uri
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

# 🚀 Local Setup

## Clone Repository

```bash
git clone https://github.com/Nethra-R368/agentic-ai-shopping-assistant.git
cd agentic-ai-shopping-assistant
```

## Backend

```bash
cd backend

python -m venv .venv

source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 📈 Future Enhancements

- Browser Extension
- Price Tracking Alerts
- Wishlist Management
- User Authentication
- Personalized Recommendations
- Multi-vendor Price Comparison
- Mobile Application

---

# 👩‍💻 Author

**Nethra R**

B.Tech CSE (AI)  
Amrita Vishwa Vidyapeetham

---

## ⭐ Project Highlights

✅ Agentic AI Architecture  
✅ LangGraph Workflow  
✅ Gemini Vision Integration  
✅ Voice Input & Output  
✅ Real-Time Product Retrieval  
✅ MongoDB Caching  
✅ FastAPI Backend  
✅ React Frontend  
✅ SerpAPI Integration  
✅ Multimodal Shopping Experience
