// Centralized backend API client for SmartPlate AI.
// Change BASE_URL if your backend runs somewhere other than localhost:8000.

const BASE_URL = "https://smartplateai-a7wc.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      detail = errJson.detail || errJson.message || detail;
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  status: () => request("/status"),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/upload-image`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Image upload failed");
    return res.json();
  },

  analyzeText: (ingredients, dietaryPreference) =>
    request("/analyze-text", {
      method: "POST",
      body: JSON.stringify({ ingredients, dietary_preference: dietaryPreference }),
    }),

  getHistory: () => request("/history"),
  clearHistory: () => request("/history", { method: "DELETE" }),

  generateMealPlan: (availableIngredients, dietaryPreference, mealsPerDay, calorieGoal) =>
    request("/meal-plan", {
      method: "POST",
      body: JSON.stringify({
        available_ingredients: availableIngredients,
        dietary_preference: dietaryPreference,
        meals_per_day: mealsPerDay,
        calorie_goal: calorieGoal,
      }),
    }),

  trackItem: (name, addedOn) =>
    request("/track-item", {
      method: "POST",
      body: JSON.stringify({ name, added_on: addedOn }),
    }),

  getExpiring: () => request("/expiring"),
  clearTrackedItems: () => request("/tracked-items", { method: "DELETE" }),

  ingredientInfo: (name) => request(`/ingredient-info/${encodeURIComponent(name)}`),
};

export default api;