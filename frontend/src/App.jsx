import './App.css'
import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Clock, Leaf, AlertTriangle, FileText, Plus, Trash2, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import api from './api'

function App() {
  // ----- Image analysis -----
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null) // { ingredients, entities, recipe, summary, source }
  const [analysisError, setAnalysisError] = useState(null)

  // ----- Manual ingredient input -----
  const [manualIngredients, setManualIngredients] = useState('')
  const [manualDiet, setManualDiet] = useState('Any')

  // ----- Meal planner -----
  const [dietaryPreference, setDietaryPreference] = useState('Vegetarian')
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [availableIngredients, setAvailableIngredients] = useState('')
  const [mealPlan, setMealPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState(null)

  // ----- History -----
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ----- Expiring soon -----
  const [expiring, setExpiring] = useState({ expiring_soon: [], fresh: [], unknown_shelf_life: [] })
  const [newItemName, setNewItemName] = useState('')
  const [newItemDate, setNewItemDate] = useState('')
  const [expiringLoading, setExpiringLoading] = useState(false)

  // ----- Backend status (which AI is actually active) -----
  const [backendStatus, setBackendStatus] = useState(null)

  const reportRef = useRef(null)

  useEffect(() => {
    refreshHistory()
    refreshExpiring()
    api.status().then(setBackendStatus).catch(() => setBackendStatus(null))
  }, [])

  async function refreshHistory() {
    setHistoryLoading(true)
    try {
      const res = await api.getHistory()
      setHistory(res.data || [])
    } catch (e) {
      // backend may not be running yet; fail quietly
    } finally {
      setHistoryLoading(false)
    }
  }

  async function refreshExpiring() {
    setExpiringLoading(true)
    try {
      const res = await api.getExpiring()
      setExpiring(res.data || { expiring_soon: [], fresh: [], unknown_shelf_life: [] })
    } catch (e) {
      // ignore
    } finally {
      setExpiringLoading(false)
    }
  }

  async function handleAnalyzeImage() {
    if (!selectedImageFile) {
      setAnalysisError('Please select an image first.')
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await api.uploadImage(selectedImageFile)
      setAnalysisResult(res.data)
      refreshHistory()
    } catch (e) {
      setAnalysisError(e.message || 'Something went wrong analyzing the image.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleAnalyzeManual() {
    if (!manualIngredients.trim()) {
      setAnalysisError('Please enter at least one ingredient.')
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await api.analyzeText(manualIngredients, manualDiet)
      setAnalysisResult(res.data)
      refreshHistory()
    } catch (e) {
      setAnalysisError(e.message || 'Something went wrong analyzing the ingredients.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleGeneratePlan() {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const res = await api.generateMealPlan(availableIngredients, dietaryPreference, mealsPerDay, calorieGoal)
      setMealPlan(res.data)
    } catch (e) {
      setPlanError(e.message || 'Could not generate a meal plan.')
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleAddTrackedItem() {
    if (!newItemName.trim()) return
    try {
      await api.trackItem(newItemName.trim(), newItemDate || undefined)
      setNewItemName('')
      setNewItemDate('')
      refreshExpiring()
    } catch (e) {
      // ignore
    }
  }

  async function handleClearHistory() {
    await api.clearHistory()
    setHistory([])
  }

  async function handleClearTracked() {
    await api.clearTrackedItems()
    setExpiring({ expiring_soon: [], fresh: [], unknown_shelf_life: [] })
  }

  function handleDownloadPDF() {
    if (!analysisResult) return
    const doc = new jsPDF()
    const { recipe, summary, entities } = analysisResult
    let y = 18

    doc.setFontSize(20)
    doc.text(recipe.title || 'SmartPlate AI Recipe', 14, y)
    y += 10

    doc.setFontSize(11)
    const summaryLines = doc.splitTextToSize(summary || '', 180)
    doc.text(summaryLines, 14, y)
    y += summaryLines.length * 6 + 6

    doc.setFontSize(14)
    doc.text('Ingredients', 14, y)
    y += 7
    doc.setFontSize(11)
    entities.forEach((e) => {
      doc.text(`- ${e.quantity ? e.quantity + ' ' : ''}${e.name}`, 16, y)
      y += 6
    })
    y += 4

    doc.setFontSize(14)
    doc.text('Steps', 14, y)
    y += 7
    doc.setFontSize(11)
    ;(recipe.steps || []).forEach((step, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${step}`, 180)
      doc.text(lines, 16, y)
      y += lines.length * 6
    })
    y += 4

    if (recipe.nutrition) {
      doc.setFontSize(14)
      doc.text('Nutrition (estimated)', 14, y)
      y += 7
      doc.setFontSize(11)
      const n = recipe.nutrition
      doc.text(
        `Calories: ${n.calories ?? '-'}  Protein: ${n.protein_g ?? '-'}g  Carbs: ${n.carbs_g ?? '-'}g  Fat: ${n.fat_g ?? '-'}g`,
        16,
        y
      )
      y += 10
    }

    if (recipe.shelf_life_advice?.length) {
      doc.setFontSize(14)
      doc.text('Shelf Life', 14, y)
      y += 7
      doc.setFontSize(11)
      recipe.shelf_life_advice.forEach((s) => {
        const lines = doc.splitTextToSize(`- ${s}`, 180)
        doc.text(lines, 16, y)
        y += lines.length * 6
      })
      y += 4
    }

    if (recipe.sustainability_tips?.length) {
      if (y > 250) { doc.addPage(); y = 18 }
      doc.setFontSize(14)
      doc.text('Sustainability Tips', 14, y)
      y += 7
      doc.setFontSize(11)
      recipe.sustainability_tips.forEach((s) => {
        const lines = doc.splitTextToSize(`- ${s}`, 180)
        doc.text(lines, 16, y)
        y += lines.length * 6
      })
    }

    doc.save(`${(recipe.title || 'smartplate-recipe').replace(/\s+/g, '_').toLowerCase()}.pdf`)
  }

  return (
    <div className="min-h-screen bg-[#071220] text-white transition-colors">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 pt-28">
        {/* Hero */}
        <section className="bg-[#12203a] rounded-2xl p-12 shadow-sm">
          <div className="hero-grid">
            <div className="hero-left">
              <h1 style={{ color: '#ffffff' }} className="text-5xl md:text-6xl font-bold">
                SmartPlate AI
              </h1>
              <p className="mt-2 text-green-500 font-semibold">Turn Leftovers Into Opportunities</p>
              <p className="mt-4 text-gray-300 max-w-xl">
                Reduce food waste using AI-powered ingredient detection, recipe recommendations and sustainable meal
                planning.
              </p>

              {backendStatus && (
                <p className="mt-3 text-xs text-gray-400">
                  AI engine:{' '}
                  <span className="text-green-400 font-medium">
                    {backendStatus.watsonx_configured
                      ? 'IBM Granite (watsonx)'
                      : backendStatus.gemini_configured
                      ? 'Gemini (fallback active)'
                      : 'Offline heuristic (no API key set)'}
                  </span>
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('recipe')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center px-5 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 shadow"
                >
                  Analyze Ingredients
                </button>
                <a
                  href="#about"
                  className="inline-flex items-center px-5 py-3 rounded-lg border border-white/30 text-white hover:border-green-500"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-8">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="p-5 rounded-xl bg-[#12203a] border border-[#1d335a] shadow">
              <h3 className="font-semibold">Image Ingredient Detection</h3>
              <p className="text-sm text-gray-300 mt-2">Upload a picture and identify ingredients.</p>
            </div>
            <div className="p-5 rounded-xl bg-[#12203a] border border-[#1d335a] shadow">
              <h3 className="font-semibold">AI Recipe Suggestions</h3>
              <p className="text-sm text-gray-300 mt-2">Get recipes from available ingredients.</p>
            </div>
            <div className="p-5 rounded-xl bg-[#12203a] border border-[#1d335a] shadow">
              <h3 className="font-semibold">Weekly Meal Planner</h3>
              <p className="text-sm text-gray-300 mt-2">Plan meals efficiently.</p>
            </div>
            <div className="p-5 rounded-xl bg-[#12203a] border border-[#1d335a] shadow">
              <h3 className="font-semibold">Sustainability Insights</h3>
              <p className="text-sm text-gray-300 mt-2">Reduce food waste and environmental impact.</p>
            </div>
          </div>
        </section>

        {/* Analyze Your Ingredients */}
        <section id="recipe" className="mt-8">
          <div className="bg-[#12203a] rounded-2xl p-10 mx-auto max-w-3xl">
            <h2 style={{ color: '#ffffff' }} className="text-4xl md:text-5xl font-bold text-center">
              Analyze Your Ingredients
            </h2>
            <p className="mt-2 text-gray-300 text-center">
              Upload a food image, or type the ingredients you have, and SmartPlate AI will suggest a recipe.
            </p>

            {/* Image upload */}
            <div className="mt-8 border-2 border-dashed border-white/20 rounded-lg h-56 flex flex-col items-center justify-center text-center px-6">
              <ImageIcon size={48} className="text-white/80" />
              <label className="mt-3 text-white/80 cursor-pointer">
                <span className="text-white font-medium">Drag & drop an image here or click to browse</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      setSelectedImageFile(file)
                      setSelectedImage(URL.createObjectURL(file))
                    }
                  }}
                />
              </label>
            </div>

            {selectedImage && (
              <div className="mt-6 text-center">
                <img src={selectedImage} alt="Selected" className="mx-auto rounded-lg max-h-48 object-cover" />
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={handleAnalyzeImage}
                disabled={analyzing}
                className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {analyzing && <Loader2 className="animate-spin" size={18} />}
                Analyze Image
              </button>
            </div>

            {/* Divider */}
            <div className="mt-8 flex items-center gap-3 text-gray-400 text-sm">
              <div className="flex-1 h-px bg-white/10" />
              OR ENTER INGREDIENTS MANUALLY
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Manual input */}
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="block text-sm text-gray-200 mb-1">Ingredients (comma separated)</label>
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  rows={3}
                  placeholder="e.g. tomato, onion, 200g cheese, garlic"
                  className="w-full p-3 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Diet</label>
                <select
                  value={manualDiet}
                  onChange={(e) => setManualDiet(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white h-11.5"
                >
                  <option>Any</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Non-Vegetarian</option>
                </select>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleAnalyzeManual}
                disabled={analyzing}
                className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {analyzing && <Loader2 className="animate-spin" size={18} />}
                Analyze Ingredients
              </button>
            </div>

            {analysisError && (
              <p className="mt-4 text-center text-red-400 text-sm">{analysisError}</p>
            )}

            {/* Results */}
            {analysisResult && (
              <div ref={reportRef} className="mt-8 p-6 rounded-lg bg-white/5 border border-white/10 text-left">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-2xl font-bold text-green-400">{analysisResult.recipe.title}</h3>
                  {analysisResult.source && (
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">
                      via {analysisResult.source.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-gray-300">{analysisResult.summary}</p>

                <div className="mt-4">
                  <h4 className="font-semibold text-white">Detected Ingredients</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysisResult.entities.map((e, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        {e.quantity ? `${e.quantity} ` : ''}{e.name} <span className="text-green-500/60">· {e.category}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-white">Steps</h4>
                  <ol className="mt-2 list-decimal list-inside text-gray-300 space-y-1">
                    {analysisResult.recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>

                {analysisResult.recipe.nutrition && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-white">Nutrition (estimated per serving)</h4>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                      {Object.entries(analysisResult.recipe.nutrition).map(([k, v]) => (
                        <div key={k} className="p-2 rounded bg-[#0f1720]">
                          <div className="text-green-400 font-semibold">{v}</div>
                          <div className="text-xs text-gray-400">{k.replace('_g', 'g').replace('_', ' ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.recipe.shelf_life_advice?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-white">Shelf Life & Storage</h4>
                    <ul className="mt-2 text-gray-300 text-sm space-y-1">
                      {analysisResult.recipe.shelf_life_advice.map((s, i) => <li key={i}>• {s}</li>)}
                      {analysisResult.recipe.storage_advice?.map((s, i) => <li key={`st-${i}`}>• {s}</li>)}
                    </ul>
                  </div>
                )}

                {analysisResult.recipe.sustainability_tips?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Leaf size={16} className="text-green-400" /> Sustainability Tips
                    </h4>
                    <ul className="mt-2 text-gray-300 text-sm space-y-1">
                      {analysisResult.recipe.sustainability_tips.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}

                {analysisResult.recipe.use_first?.length > 0 && (
                  <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/30">
                    <span className="text-amber-300 text-sm font-medium">
                      Use first: {analysisResult.recipe.use_first.join(', ')}
                    </span>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-2"
                  >
                    <FileText size={16} /> Download as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Weekly Meal Planner */}
        <section id="planner" className="mt-8">
          <div className="bg-[#12203a] rounded-2xl p-10 mx-auto max-w-3xl">
            <h2 style={{ color: '#ffffff' }} className="text-4xl md:text-5xl font-bold text-center">
              Weekly Meal Planner
            </h2>
            <p className="mt-2 text-gray-300 text-center">Generate a personalized meal plan based on your preferences.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-200 mb-1">Dietary Preference</label>
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                >
                  <option>Vegetarian</option>
                  <option>Non-Vegetarian</option>
                  <option>Vegan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-200 mb-1">Meals Per Day</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={mealsPerDay}
                  onChange={(e) => setMealsPerDay(Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-200 mb-1">Daily Calorie Goal</label>
                <input
                  type="number"
                  min={0}
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-200 mb-1">Available Ingredients</label>
                <textarea
                  value={availableIngredients}
                  onChange={(e) => setAvailableIngredients(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                  placeholder="List ingredients you have, separated by commas"
                />
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleGeneratePlan}
                disabled={planLoading}
                className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {planLoading && <Loader2 className="animate-spin" size={18} />}
                Generate Meal Plan
              </button>
            </div>

            {planError && <p className="mt-3 text-center text-red-400 text-sm">{planError}</p>}

            <div className="mt-6">
              {mealPlan ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(mealPlan.plan).map(([day, meals]) => (
                    <div key={day} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <h4 className="font-semibold text-green-400">{day}</h4>
                      <ul className="mt-2 space-y-2 text-sm text-gray-300">
                        {meals.map((m, i) => (
                          <li key={i}>
                            <span className="text-white font-medium">{m.title}</span>{' '}
                            <span className="text-gray-400">({m.nutrition.calories} cal)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center text-gray-200">
                  Your AI-generated weekly meal plan will appear here.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Previous Scans / History */}
        <section id="history" className="mt-8">
          <div className="bg-[#12203a] rounded-2xl p-10 mx-auto max-w-3xl">
            <div className="flex items-center gap-3 justify-center">
              <Clock className="text-white/90" />
              <h2 style={{ color: '#ffffff' }} className="text-4xl md:text-5xl font-bold">
                Previous Scans
              </h2>
            </div>
            <p className="mt-2 text-gray-300 text-center">View recipes and ingredient analyses from earlier uploads.</p>

            <div className="mt-6 p-4 rounded-lg border border-white/10 bg-white/5 text-gray-200">
              {historyLoading ? (
                <div className="text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16}/> Loading…</div>
              ) : history.length === 0 ? (
                <div className="text-center">No previous scans yet.</div>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="p-3 rounded bg-[#0f1720] border border-white/10">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <span className="font-medium text-white">{h.recipe?.title || 'Untitled'}</span>
                        <span className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {h.type === 'image' ? 'Image scan' : 'Manual input'} · {h.ingredients?.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white inline-flex items-center gap-2"
              >
                <Trash2 size={16} /> Clear History
              </button>
            </div>
          </div>
        </section>

        {/* Expiring Soon Alerts */}
        <section id="expiring" className="mt-8">
          <div className="bg-[#12203a] rounded-2xl p-10 mx-auto max-w-3xl">
            <div className="flex items-center gap-3 justify-center">
              <AlertTriangle className="text-white/90" />
              <h2 style={{ color: '#ffffff' }} className="text-4xl md:text-5xl font-bold">
                Expiring Soon Alerts
              </h2>
            </div>
            <p className="mt-2 text-gray-300 text-center">Track ingredients before they expire.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="block text-sm text-gray-200 mb-1">Ingredient Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Milk"
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-200 mb-1">Date Added</label>
                <input
                  type="date"
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#0f1720] border border-white/10 text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddTrackedItem}
                  className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {expiringLoading ? (
                <div className="text-center flex items-center justify-center gap-2 text-gray-300"><Loader2 className="animate-spin" size={16}/> Loading…</div>
              ) : (
                <>
                  {expiring.expiring_soon.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <h4 className="font-semibold text-amber-300">Expiring Soon</h4>
                      <ul className="mt-2 space-y-1 text-sm text-gray-200">
                        {expiring.expiring_soon.map((item, i) => (
                          <li key={i}>
                            <span className="font-medium">{item.name}</span> — {item.days_remaining <= 0 ? 'expired' : `${item.days_remaining} day(s) left`}
                            <span className="text-gray-400"> · {item.storage}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {expiring.fresh.length > 0 && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <h4 className="font-semibold text-green-400">Still Fresh</h4>
                      <ul className="mt-2 space-y-1 text-sm text-gray-300">
                        {expiring.fresh.map((item, i) => (
                          <li key={i}>{item.name} — {item.days_remaining} day(s) left</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {expiring.expiring_soon.length === 0 && expiring.fresh.length === 0 && (
                    <div className="p-6 rounded-lg border border-white/10 bg-white/5 text-gray-200 text-center">
                      No tracked ingredients yet.
                    </div>
                  )}
                </>
              )}
            </div>

            {(expiring.expiring_soon.length > 0 || expiring.fresh.length > 0) && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleClearTracked}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white inline-flex items-center gap-2"
                >
                  <Trash2 size={16} /> Clear Tracked Items
                </button>
              </div>
            )}
          </div>
        </section>

        {/* About SmartPlate AI */}
        <section id="about" className="mt-8">
          <div className="bg-[#12203a] rounded-2xl p-10 mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-5 rounded-xl bg-[#12203a] border border-white/10 shadow flex items-start gap-4">
                <Leaf className="text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">AI Ingredient Detection</h3>
                  <p className="text-sm text-gray-300 mt-2">Identify ingredients from uploaded images using AI.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#12203a] border border-white/10 shadow flex items-start gap-4">
                <Leaf className="text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Smart Recipe Suggestions</h3>
                  <p className="text-sm text-gray-300 mt-2">Generate recipes based on available ingredients.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#12203a] border border-white/10 shadow flex items-start gap-4">
                <Leaf className="text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Sustainable Living</h3>
                  <p className="text-sm text-gray-300 mt-2">Reduce food waste and promote eco-friendly cooking.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-gray-300">
              SmartPlate AI was developed by Kartik A, B.Tech CSE, Inderprastha Engineering College.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
