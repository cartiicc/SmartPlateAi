"""
main.py
-------
SmartPlate AI backend. Wires the FastAPI routes to the real AI pipeline in
granite_service.py and the planning logic in recipe_engine.py.

Run with:
    uvicorn main:app --reload --port 8000

Environment variables (set in a .env file or your shell):
    WATSONX_API_KEY        - IBM Cloud API key for watsonx.ai
    WATSONX_PROJECT_ID     - watsonx.ai project ID
    WATSONX_URL            - region endpoint (default: us-south)
    GEMINI_API_KEY         - fallback if watsonx isn't configured/working
"""

import json
import os
import shutil
import uuid
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import granite_service as gs
import recipe_engine as re_engine

app = FastAPI(title="SmartPlate AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

HISTORY_FILE = "history.json"


def _load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_history(history: list):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)


def _append_history(entry: dict):
    history = _load_history()
    entry["id"] = str(uuid.uuid4())
    entry["timestamp"] = datetime.now().isoformat()
    history.insert(0, entry)
    history = history[:50]  # cap history size
    _save_history(history)
    return entry


# ---------------------------------------------------------------------------
# Health / status
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "SmartPlate AI Backend Running"}


@app.get("/test")
def test():
    return {"message": "Frontend connected successfully!"}


@app.get("/status")
def status():
    """Lets the frontend show which AI backend is actually active."""
    return {
        "watsonx_configured": gs.watsonx_configured(),
        "gemini_configured": gs.gemini_configured(),
    }


# ---------------------------------------------------------------------------
# Core analyze flow (image OR manual text input -> recipe + advice)
# ---------------------------------------------------------------------------

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Multimodal entry point: image -> detected ingredients -> full pipeline."""
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detection = gs.detect_ingredients_from_image(file_path)
    ingredients = detection["ingredients"]

    pipeline_result = gs.analyze_pipeline(ingredients, dietary_preference="Any")

    entry = _append_history({
        "type": "image",
        "filename": file.filename,
        "ingredients": ingredients,
        "entities": detection["entities"],
        "recipe": pipeline_result["recipe"],
        "summary": pipeline_result["summary"],
        "source": detection["source"],
    })

    return {
        "success": True,
        "message": "Image processed successfully",
        "data": {
            "ingredients": ingredients,
            "entities": detection["entities"],
            "recipe": pipeline_result["recipe"],
            "summary": pipeline_result["summary"],
            "source": detection["source"],
            "history_id": entry["id"],
        },
    }


@app.post("/analyze-text")
async def analyze_text(payload: dict = Body(...)):
    """
    Manual ingredient input entry point (text, not image) — same pipeline as
    the image route, just skipping the vision step. payload: {"ingredients":
    "tomato, onion, cheese", "dietary_preference": "Vegetarian"}
    """
    raw = payload.get("ingredients", "")
    dietary_preference = payload.get("dietary_preference", "Any")

    entities = gs.extract_entities(raw)
    ingredients = [e["name"] for e in entities]

    if not ingredients:
        return {"success": False, "message": "No ingredients provided."}

    pipeline_result = gs.analyze_pipeline(ingredients, dietary_preference)

    entry = _append_history({
        "type": "manual",
        "ingredients": ingredients,
        "entities": entities,
        "recipe": pipeline_result["recipe"],
        "summary": pipeline_result["summary"],
        "source": pipeline_result["recipe"].get("source"),
    })

    return {
        "success": True,
        "data": {
            "ingredients": ingredients,
            "entities": entities,
            "recipe": pipeline_result["recipe"],
            "summary": pipeline_result["summary"],
            "source": pipeline_result["recipe"].get("source"),
            "history_id": entry["id"],
        },
    }


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

@app.get("/history")
def get_history():
    return {"success": True, "data": _load_history()}


@app.delete("/history")
def clear_history():
    _save_history([])
    return {"success": True, "message": "History cleared."}


# ---------------------------------------------------------------------------
# Weekly meal planner
# ---------------------------------------------------------------------------

@app.post("/meal-plan")
async def meal_plan(payload: dict = Body(...)):
    """
    payload: {
      "available_ingredients": "rice, chicken, vegetables",
      "dietary_preference": "Vegetarian",
      "meals_per_day": 3,
      "calorie_goal": 2000
    }
    """
    raw_ingredients = payload.get("available_ingredients", "")
    dietary_preference = payload.get("dietary_preference", "Any")
    meals_per_day = int(payload.get("meals_per_day", 3))
    calorie_goal = int(payload.get("calorie_goal", 2000))

    entities = gs.extract_entities(raw_ingredients) if raw_ingredients else []
    ingredient_names = [e["name"] for e in entities]

    plan = re_engine.build_weekly_meal_plan(ingredient_names, dietary_preference, meals_per_day, calorie_goal)

    return {"success": True, "data": plan}


# ---------------------------------------------------------------------------
# Expiring soon tracker
# ---------------------------------------------------------------------------

EXPIRY_TRACKER_FILE = "tracked_items.json"


def _load_tracked_items() -> list:
    if os.path.exists(EXPIRY_TRACKER_FILE):
        try:
            with open(EXPIRY_TRACKER_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_tracked_items(items: list):
    with open(EXPIRY_TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)


@app.post("/track-item")
async def track_item(payload: dict = Body(...)):
    """payload: {"name": "Milk", "added_on": "2026-06-20"} (added_on optional)"""
    items = _load_tracked_items()
    items.append({
        "name": payload.get("name", "").strip(),
        "added_on": payload.get("added_on") or datetime.now().strftime("%Y-%m-%d"),
    })
    _save_tracked_items(items)
    result = re_engine.check_expiring_items(items)
    return {"success": True, "data": result}


@app.get("/expiring")
def get_expiring():
    items = _load_tracked_items()
    result = re_engine.check_expiring_items(items)
    return {"success": True, "data": result}


@app.delete("/tracked-items")
def clear_tracked_items():
    _save_tracked_items([])
    return {"success": True, "message": "Tracked items cleared."}


# ---------------------------------------------------------------------------
# RAG knowledge base lookup (used by frontend for direct ingredient lookups)
# ---------------------------------------------------------------------------

@app.get("/ingredient-info/{name}")
def ingredient_info(name: str):
    context = gs.retrieve_context([name])
    if context["matched_ingredients"]:
        return {"success": True, "data": context["matched_ingredients"][0]}
    return {"success": False, "message": "No data found for this ingredient."}