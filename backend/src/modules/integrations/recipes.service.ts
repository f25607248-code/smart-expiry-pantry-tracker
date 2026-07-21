import { env, isGeminiConfigured, isOpenAiConfigured, isSpoonacularConfigured } from '../../config/env.js'
import { ApiError } from '../../lib/apiError.js'
import { RECIPE_LIBRARY } from './recipeLibrary.js'

export type RecipeSuggestion = {
  title: string
  description: string
  usesIngredients: string[]
}

function recipePrompt(ingredients: string[], priorityIngredients: string[]) {
  const priorityNote =
    priorityIngredients.length > 0
      ? ` These ingredients are expiring soon and should be prioritized in your suggestions: ${priorityIngredients.join(', ')}.`
      : ''
  return {
    system:
      'You suggest simple recipes using only the ingredients the user lists (plus common pantry staples like salt, oil, water). Respond with strict JSON: an array of objects with keys "title", "description", "usesIngredients" (array of strings from the input list). No prose outside the JSON.' +
      priorityNote,
    user: `Ingredients available: ${ingredients.join(', ')}`,
  }
}

function parseRecipeJson(content: string): RecipeSuggestion[] {
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : (parsed.recipes ?? [])
}

/** Gemini's own project may have quota/billing issues (see assistant.service.ts for details), so callers should treat failure as non-fatal and fall back to the next provider. */
async function suggestWithGemini(ingredients: string[], priorityIngredients: string[]): Promise<RecipeSuggestion[]> {
  const prompt = recipePrompt(ingredients, priorityIngredients)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  })

  if (!response.ok) {
    throw ApiError.badRequest(`Gemini request failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return parseRecipeJson(content)
}

async function suggestWithOpenAi(ingredients: string[], priorityIngredients: string[]): Promise<RecipeSuggestion[]> {
  const prompt = recipePrompt(ingredients, priorityIngredients)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw ApiError.badRequest(`OpenAI request failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const content = data.choices[0]?.message.content ?? '{}'
  return parseRecipeJson(content)
}

async function suggestWithSpoonacular(ingredients: string[]): Promise<RecipeSuggestion[]> {
  const url = new URL('https://api.spoonacular.com/recipes/findByIngredients')
  url.searchParams.set('ingredients', ingredients.join(','))
  url.searchParams.set('number', '6')
  url.searchParams.set('ranking', '2')
  url.searchParams.set('apiKey', env.SPOONACULAR_API_KEY!)

  const response = await fetch(url)
  if (!response.ok) {
    throw ApiError.badRequest(`Spoonacular request failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as Array<{
    title: string
    usedIngredients: { name: string }[]
    missedIngredients: { name: string }[]
  }>

  return data.map((r) => ({
    title: r.title,
    description: `Uses ${r.usedIngredients.length} of your ingredients; missing ${r.missedIngredients.length}.`,
    usesIngredients: r.usedIngredients.map((i) => i.name),
  }))
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function fuzzyIncludes(haystack: Set<string>, needle: string): boolean {
  for (const item of haystack) {
    if (item.includes(needle) || needle.includes(item)) return true
  }
  return false
}

/**
 * Zero-configuration recipe matcher against a small built-in recipe library, used when neither
 * OPENAI_API_KEY nor SPOONACULAR_API_KEY is set. Ensures "what can I cook" works out of the box
 * instead of the app's flagship feature being invisible until someone configures a paid API key.
 */
function suggestLocally(ingredients: string[], priorityIngredients: string[]): RecipeSuggestion[] {
  const have = new Set(ingredients.map(normalize))
  const priority = new Set(priorityIngredients.map(normalize))

  const scored = RECIPE_LIBRARY.map((recipe) => {
    const matched = recipe.ingredients.filter((ing) => fuzzyIncludes(have, ing))
    const priorityMatched = recipe.ingredients.filter((ing) => fuzzyIncludes(priority, ing))
    return { recipe, matchCount: matched.length, priorityBonus: priorityMatched.length }
  })
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.priorityBonus * 10 + b.matchCount - (a.priorityBonus * 10 + a.matchCount))
    .slice(0, 6)

  return scored.map(({ recipe }) => ({
    title: recipe.title,
    description: recipe.instructions,
    usesIngredients: recipe.ingredients,
  }))
}

export async function suggestRecipes(ingredients: string[], priorityIngredients: string[] = []): Promise<RecipeSuggestion[]> {
  if (ingredients.length === 0) {
    throw ApiError.badRequest('Provide at least one ingredient')
  }

  if (isGeminiConfigured) {
    try {
      return await suggestWithGemini(ingredients, priorityIngredients)
    } catch {
      // Gemini project may be out of quota (see assistant.service.ts) — fall through to the next provider instead of failing the request.
    }
  }
  if (isOpenAiConfigured) return suggestWithOpenAi(ingredients, priorityIngredients)
  if (isSpoonacularConfigured) return suggestWithSpoonacular(ingredients)
  return suggestLocally(ingredients, priorityIngredients)
}
