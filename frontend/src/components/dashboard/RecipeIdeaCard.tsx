import { ChefHat } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { RecipeSuggestion } from '@/types'

export function RecipeIdeaCard({ recipe }: { recipe: RecipeSuggestion }) {
  return (
    <Card className="bg-card/60">
      <CardContent className="flex gap-3 p-3">
        <ChefHat className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">{recipe.title}</p>
          <p className="text-xs text-muted-foreground">{recipe.description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
