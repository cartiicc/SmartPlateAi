"""
recipe_engine.py
-----------------
Deterministic planning logic that sits on top of granite_service.py.

- build_weekly_meal_plan(): builds a 7-day plan (N meals/day) by repeatedly
  calling the RAG-grounded recipe generator with rotating ingredient
  subsets, so each day's meals differ even from a small ingredient list.
- check_expiring_items(): given a list of {name, added_on} ingredient
  records, looks up shelf life from the RAG knowledge base and flags items
  expiring within a threshold.
"""

import json
import os
from datetime import datetime, timedelta

import granite_service as gs

_RAG_PATH = os.path.join(os.path.dirname(__file__), "rag_data.json")
with open(_RAG_PATH, "r", encoding="utf-8") as f:
    _RAG_DB = json.load(f)

_INGREDIENT_INDEX = {item["name"].lower(): item for item in _RAG_DB.get("ingredients", [])}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def build_weekly_meal_plan(available_ingredients: list, dietary_preference: str, meals_per_day: int, calorie_goal: int) -> dict:
    """
    Builds a 7-day meal plan. Rather than calling the AI 21+ times (slow,
    costly), we generate a small pool of distinct meal ideas via the RAG +
    Granite pipeline once, then distribute them across the week, scaling
    portions to roughly hit the calorie goal.
    """
    if not available_ingredients:
        available_ingredients = ["rice", "vegetables", "egg", "bread"]

    pool_size = max(meals_per_day * 2, 4)
    rag_context = gs.retrieve_context(available_ingredients)
    candidates = rag_context["candidate_recipes"]

    # If we don't have enough template matches, broaden using all templates
    if len(candidates) < pool_size:
        all_templates = _RAG_DB.get("recipe_templates", [])
        for t in all_templates:
            if t not in candidates:
                candidates.append(t)
            if len(candidates) >= pool_size:
                break

    if not candidates:
        candidates = [{
            "title": "Simple Mixed Plate",
            "steps": ["Combine available ingredients.", "Cook until done.", "Season to taste.", "Serve."],
            "estimated_nutrition": {"calories": 350, "protein_g": 10, "carbs_g": 40, "fat_g": 10},
        }]

    plan = {}
    idx = 0
    per_meal_calorie_target = round(calorie_goal / meals_per_day) if meals_per_day else calorie_goal

    for day in DAYS:
        meals = []
        for m in range(meals_per_day):
            tmpl = candidates[idx % len(candidates)]
            idx += 1
            base_cal = tmpl.get("estimated_nutrition", {}).get("calories", 350)
            scale = round(per_meal_calorie_target / base_cal, 2) if base_cal else 1.0
            scaled_nutrition = {
                k: round(v * scale, 1) for k, v in tmpl.get("estimated_nutrition", {}).items()
            }
            meals.append({
                "title": tmpl["title"],
                "steps": tmpl["steps"],
                "nutrition": scaled_nutrition,
                "portion_scale": scale,
            })
        plan[day] = meals

    return {
        "dietary_preference": dietary_preference,
        "meals_per_day": meals_per_day,
        "calorie_goal": calorie_goal,
        "plan": plan,
    }


def check_expiring_items(items: list, threshold_days: int = 3) -> dict:
    """
    items: list of {"name": str, "added_on": "YYYY-MM-DD"} (added_on optional,
    defaults to today if missing).
    Returns items split into expiring_soon / fresh / unknown_shelf_life, each
    annotated with days_remaining when known.
    """
    today = datetime.now().date()
    expiring_soon = []
    fresh = []
    unknown = []

    for item in items:
        name = item.get("name", "").strip().lower()
        added_str = item.get("added_on")
        try:
            added_on = datetime.strptime(added_str, "%Y-%m-%d").date() if added_str else today
        except ValueError:
            added_on = today

        kb_entry = _INGREDIENT_INDEX.get(name)
        if not kb_entry:
            kb_entry = next((v for k, v in _INGREDIENT_INDEX.items() if k in name or name in k), None)

        if not kb_entry:
            unknown.append({"name": name, "added_on": str(added_on)})
            continue

        shelf_life = kb_entry["shelf_life_days"]
        expiry_date = added_on + timedelta(days=shelf_life)
        days_remaining = (expiry_date - today).days

        record = {
            "name": name,
            "added_on": str(added_on),
            "expiry_date": str(expiry_date),
            "days_remaining": days_remaining,
            "storage": kb_entry["storage"],
        }

        if days_remaining <= threshold_days:
            expiring_soon.append(record)
        else:
            fresh.append(record)

    expiring_soon.sort(key=lambda x: x["days_remaining"])

    return {
        "expiring_soon": expiring_soon,
        "fresh": fresh,
        "unknown_shelf_life": unknown,
    }