import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api, getApiErrorMessage } from '@/lib/axios'
import type { ShoppingList } from '@/types'

export default function SharedShoppingListPage() {
  const { token } = useParams<{ token: string }>()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .get(`/shopping-lists/shared/${token}`)
      .then((res) => setList(res.data.list))
      .catch((err) => setError(getApiErrorMessage(err, 'This share link is invalid or has expired')))
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{list?.name ?? 'Shared shopping list'}</CardTitle>
          <CardDescription>Read-only view</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {list && (
            <ul className="flex flex-col divide-y divide-border">
              {list.items.map((item) => (
                <li key={item.id} className={`py-2 text-sm ${item.isPurchased ? 'text-muted-foreground line-through' : ''}`}>
                  {item.name} {item.quantity > 1 ? `(${item.quantity} ${item.unit})` : ''}
                </li>
              ))}
              {list.items.length === 0 && <p className="py-2 text-sm text-muted-foreground">This list is empty.</p>}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
