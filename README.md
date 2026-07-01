# 🍽️ SmartPlate AI

**A Multimodal RAG-Based Food Sustainability Assistant**

SmartPlate AI helps you reduce food waste and eat smarter by analyzing your ingredients — from a photo or manual input — and generating recipes, nutrition info, shelf-life guidance, and sustainability tips.

🔗 **Live Demo:** [smart-plate-ai-nine.vercel.app](https://smart-plate-ai-nine.vercel.app/)
🔗 **Backend API:** [smartplateai-a7wc.onrender.com](https://smartplateai-a7wc.onrender.com)

> ⚠️ The backend runs on Render's free tier and may take 30–60 seconds to wake up on the first request after inactivity.

---

## Developer

**Kartik A**
B.Tech CSE, Inderprastha Engineering College

---

## ✨ Core Features

- ✅ Upload food image for ingredient detection
- ✅ Manual ingredient input
- ✅ Granite Vision–based ingredient detection
- ✅ Recipe recommendation
- ✅ Nutritional information
- ✅ Shelf-life suggestions
- ✅ Storage advice
- ✅ Sustainability tips
- ✅ "Use First" priority suggestions
- ✅ Expiring Soon alerts

## 🚀 Advanced Features

- ✅ Weekly meal planner
- ✅ PDF export of recipes (with footer: *Developed by Kartik A | Inderprastha Engineering College*)
- ✅ Previous scan history
- ✅ Browser local storage for persistence

## 🧠 AI Concepts Used

- IBM Granite
- Granite Vision (multimodal image understanding)
- Prompt Engineering
- RAG (Retrieval-Augmented Generation) using a JSON knowledge base
- Entity Extraction
- Multimodal AI
- Conversational AI
- Responsible AI principles

---

## 🛠️ Tech Stack

**Frontend:** React (Vite), Tailwind CSS, Framer Motion
**Backend:** FastAPI (Python)
**AI:** IBM watsonx (Granite Vision) with Google Gemini as fallback
**Deployment:** Vercel (frontend) + Render (backend)

---

## 📦 Project Structure

```
SmartPlateAi/
├── backend/          # FastAPI server, AI services, recipe engine
│   ├── main.py
│   ├── granite_service.py
│   ├── recipe_engine.py
│   ├── rag_data.json
│   └── requirements.txt
└── frontend/         # React + Vite client
    └── src/
        ├── components/
        ├── pages/
        └── api.js
```

---

## ⚙️ Local Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```
GEMINI_API_KEY=your_gemini_api_key
```

Run the server:
```bash
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🤖 AI Fallback Behavior

SmartPlate AI tries AI engines in this order:

1. **IBM watsonx (Granite Vision)** — if `WATSONX_*` keys are set
2. **Google Gemini** — if `GEMINI_API_KEY` is set
3. **Offline heuristic mode** — basic local logic, used if no API keys are configured, so the app never fully breaks

---

## 📄 License

This project was built for academic purposes as part of a B.Tech CSE coursework submission.
