import { api } from '@/lib/axios'
import type { RecipeSuggestion } from '@/types'

export async function suggestRecipesFromPantry() {
  const { data } = await api.get<{ recipes: RecipeSuggestion[]; ingredientsUsed: string[]; priorityIngredients: string[] }>(
    '/integrations/recipes/from-pantry',
  )
  return data
}
