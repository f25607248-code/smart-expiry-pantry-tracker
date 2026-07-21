import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Share2, Printer, RefreshCcw, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { buildShoppingLinks } from '@/lib/shoppingLinks'
import {
  listShoppingLists,
  createShoppingList,
  deleteShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  autoAddExpiredItems,
  shareShoppingList,
} from '@/lib/api/shoppingLists'
import { getApiErrorMessage } from '@/lib/axios'
import type { ShoppingList } from '@/types'

export default function ShoppingListPage() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newListOpen, setNewListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')

  async function load() {
    setIsLoading(true)
    try {
      const data = await listShoppingLists()
      setLists(data)
      setActiveId((current) => current ?? data[0]?.id ?? null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load shopping lists'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const activeList = lists.find((l) => l.id === activeId) ?? null

  function replaceList(updated: ShoppingList) {
    setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  async function handleCreateList() {
    try {
      const list = await createShoppingList(newListName.trim() || 'Shopping List')
      setLists((prev) => [list, ...prev])
      setActiveId(list.id)
      setNewListOpen(false)
      setNewListName('')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleDeleteList(id: string) {
    try {
      await deleteShoppingList(id)
      setLists((prev) => prev.filter((l) => l.id !== id))
      setActiveId((current) => (current === id ? null : current))
      toast.success('List deleted')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleAddItem() {
    if (!activeList || !newItemName.trim()) return
    try {
      const updated = await addShoppingListItem(activeList.id, { name: newItemName.trim(), quantity: 1, unit: 'pcs' })
      replaceList(updated)
      setNewItemName('')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleTogglePurchased(itemId: string, isPurchased: boolean) {
    if (!activeList) return
    try {
      const updated = await updateShoppingListItem(activeList.id, itemId, { isPurchased })
      replaceList(updated)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!activeList) return
    try {
      const updated = await deleteShoppingListItem(activeList.id, itemId)
      replaceList(updated)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleAutoAddExpired() {
    if (!activeList) return
    try {
      const updated = await autoAddExpiredItems(activeList.id)
      replaceList(updated)
      toast.success('Expired items added')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleShare() {
    if (!activeList) return
    try {
      const { url } = await shareShoppingList(activeList.id)
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied to clipboard')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create share link'))
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Shopping Lists</h1>
        <Button onClick={() => setNewListOpen(true)}>
          <Plus className="mr-1 size-4" /> New list
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          <ShoppingCart className="mb-2 size-8" />
          <p>No shopping lists yet.</p>
          <Button variant="link" onClick={() => setNewListOpen(true)}>Create your first list</Button>
        </div>
      ) : (
        <>
          <Tabs value={activeId ?? undefined} onValueChange={setActiveId}>
            <TabsList>
              {lists.map((l) => (
                <TabsTrigger key={l.id} value={l.id}>{l.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {activeList && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{activeList.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleAutoAddExpired} title="Add expired items">
                    <RefreshCcw className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare} title="Share list">
                    <Share2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print list">
                    <Printer className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteList(activeList.id)} title="Delete list">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an item…"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <Button onClick={handleAddItem}>Add</Button>
                </div>

                <div className="flex flex-col divide-y divide-border">
                  {activeList.items.length === 0 && <p className="py-4 text-sm text-muted-foreground">No items yet.</p>}
                  {activeList.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <Checkbox checked={item.isPurchased} onCheckedChange={(checked) => handleTogglePurchased(item.id, Boolean(checked))} />
                      <span className={item.isPurchased ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>
                        {item.name} {item.quantity > 1 ? `(${item.quantity} ${item.unit})` : ''}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" title="Where to buy">
                            <ShoppingCart className="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <p className="mb-1 px-1 text-xs text-muted-foreground">Buy "{item.name}" on:</p>
                          <div className="flex flex-col">
                            {buildShoppingLinks(item.name).map((link) => (
                              <a
                                key={link.label}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded px-2 py-1.5 text-sm hover:bg-accent"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New shopping list</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listName">List name</Label>
            <Input id="listName" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Weekly groceries" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateList}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
