# 🚀 Complete Local Setup & Debugging Guide

This is your master runbook for starting the complete Agentic AI E-commerce Assistant locally, testing the LangGraph workflow, and debugging any potential issues step-by-step.

---

## 1. Starting MongoDB Locally

The application uses MongoDB for two things: Storing the product catalog, and acting as the persistent LangGraph memory Checkpointer.

### How to Run MongoDB Locally
If you do not have MongoDB installed on your Windows machine:
1. Download **MongoDB Community Server** from the official MongoDB website.
2. Install it with the default settings (it will run as a background Windows Service on port `27017`).
3. Download **MongoDB Compass** (the GUI) to easily view your databases.

### How to Verify MongoDB is Connected
**Open a PowerShell terminal:**
```powershell
Test-NetConnection -ComputerName localhost -Port 27017
```
**Expected Output:** You should see `TcpTestSucceeded : True` at the bottom.
**Debugging:** If it says `False` or fails to connect, your MongoDB Windows Service is not running. Open the "Services" app in Windows, find "MongoDB Server", right-click, and select "Start".

---

## 2. Backend Setup & Data Seeding

We need to install dependencies, configure Gemini, seed our database, and build the FAISS vector index.

### Step 2.1: Activate Virtual Environment & Install Dependencies
Open a PowerShell terminal and navigate to your project folder:
```powershell
cd "c:\Users\Nethra R\OneDrive\Desktop\e-commerce\backend"
# Activate the virtual environment
.\.venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
pip install pydantic-settings langgraph-checkpoint-mongodb tenacity motor==3.5.1 pymongo==4.8.0
```

### Step 2.2: Verify `.env` Configuration
Ensure your `backend/.env` file looks exactly like this:
```env
GEMINI_API_KEY=your_actual_google_ai_studio_key_here
MONGO_URI=mongodb://localhost:27017
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```
**Debugging**: If you get a `ValidationError` on startup, it means `GEMINI_API_KEY` is completely missing from your `.env` file.

### Step 2.3: Seed MongoDB
```powershell
# Make sure you are still in the backend folder with .venv activated
python scripts\seed_db.py
```
**Expected Output**: 
`Clearing existing collections...`
`Loading products...`
`Loading reviews...`
`Database seeded successfully!`

### Step 2.4: Build the FAISS Vector Index
```powershell
python scripts\build_index.py
```
**Expected Output**:
`Connecting to DB...`
`Fetching products...`
`Generating embeddings for 4 items...`
`Adding to FAISS index...`
`Vector index built successfully!`
**Debugging**: If it says "No products found in DB", you forgot to run `seed_db.py` first! If it crashes with a PyMongo `_QUERY_OPTIONS` error, you need to run `pip install motor==3.5.1 pymongo==4.8.0`.

### Step 2.5: Start the FastAPI Backend
```powershell
python main.py
# OR
uvicorn main:app --reload
```
**Expected Output**: 
`INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`

---

## 3. Frontend Setup

Open a **new** PowerShell terminal (keep the backend terminal running!).
```powershell
cd "c:\Users\Nethra R\OneDrive\Desktop\e-commerce\frontend"
npm install
npm run dev
```
**Expected Output**:
`VITE v5.x.x  ready in X ms`
`➜  Local:   http://localhost:5173/`

Open `http://localhost:5173/` in your browser.

---

## 4. Full System Testing

Open your browser to `http://localhost:5173/` and test the following scenarios:

### Test 1: Semantic Retrieval & Explainable Recommendations
**Query**: *"I need a powerful laptop for video editing under $3000."*
**What to look for**: 
1. The Frontend UI Activity panel should cycle through "Searching FAISS...", etc.
2. In your backend terminal, look for the `[INFO]` log: `Agent decided to call tools: ['product_search']`.
3. The final response in the UI should recommend the MacBook M3 and **explain why** (e.g., citing the 36GB memory and the price).

### Test 2: Product Comparison Tool Calling
**Query**: *"Compare the MacBook Pro M3 and the Dell XPS 15."*
**What to look for**:
1. Backend Terminal: `Agent decided to call tools: ['product_compare']`.
2. UI Response: A side-by-side comparison of the specs.

### Test 3: Conversational Memory Persistence
**Query**: *"My name is Alex and my absolute maximum budget is $1000."*
**Action**: Wait for the bot to reply. Then, go to your backend terminal and press `CTRL+C` to kill the server. 
**Action**: Run `python main.py` again to restart the server.
**Query**: *"What is my name and budget?"*
**What to look for**: The bot should answer "Alex" and "$1000", proving that LangGraph successfully loaded the checkpoint from MongoDB!

---

## 5. End-to-End Workflow Explanation

Here is exactly how the system interacts when you send a message:

1. **React Frontend**: User clicks send. React displays the animated Agent Activity Panel. It sends an Axios POST request to `http://localhost:8000/api/chat` with your `session_id`.
2. **FastAPI**: Receives the request. Initializes the `MongoDBSaver`.
3. **LangGraph & MongoDB**: LangGraph looks at the `session_id`. It queries your local MongoDB (`ecommerce_ai` database, `checkpoints` collection). It pulls the entire chat history so Gemini knows the context.
4. **Gemini API (Turn 1)**: Gemini reads the history and your new prompt. It decides it needs data. It outputs a JSON tool call requesting `product_search("video editing laptop")`.
5. **RAG & FAISS**: LangGraph executes `product_search`. SentenceTransformers turns "video editing laptop" into an embedding. FAISS finds the closest vector IDs. MongoDB fetches the full JSON for those IDs.
6. **Gemini API (Turn 2)**: Gemini receives the FAISS results. Following our strict `EXPLAINABILITY PROTOCOL`, it writes a justification for the laptop.
7. **Return**: The graph finishes. FastAPI returns the final string. React renders it.

---

## 6. Common Debugging Issues

### Issue: "Sorry, I encountered an error connecting to the backend" in UI
**Cause**: The React frontend cannot talk to FastAPI.
**Fix**:
1. Is the backend running? Check the backend terminal.
2. Did you use the right port? Ensure the backend is on `8000` and frontend on `5173`.
3. CORS issue: Look at the browser Console (F12). If you see a CORS error, ensure `.env` has `CORS_ORIGINS=http://localhost:5173` and restart the backend.

### Issue: AI responds with "I don't have information on that product"
**Cause**: FAISS did not retrieve the product.
**Fix**: Check `faiss_index.bin`. Did you run `build_index.py`? Check the terminal logs to see what query the LLM actually sent to the `product_search` tool.

### Issue: LLM Hallucinates or Ignores the Budget
**Cause**: The prompt wasn't strict enough, or the temperature is too high.
**Fix**: In `agents/nodes.py`, ensure `temperature=0.2`. You can tweak the `SYSTEM_PROMPT` in `rag/prompts.py` to be even stricter.
