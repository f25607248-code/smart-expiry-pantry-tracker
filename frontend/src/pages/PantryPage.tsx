import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Barcode, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ItemCard } from '@/components/pantry/ItemCard'
import { ItemFormDialog, type ItemFormPrefill } from '@/components/pantry/ItemFormDialog'
import { ArchiveDispositionDialog } from '@/components/pantry/ArchiveDispositionDialog'
import { BarcodeScannerDialog } from '@/components/pantry/BarcodeScannerDialog'
import { ReceiptScanDialog } from '@/components/pantry/ReceiptScanDialog'
import { VoiceQuickAddButton } from '@/components/pantry/VoiceQuickAddButton'
import {
  listPantryItems,
  createPantryItem,
  deletePantryItem,
  duplicatePantryItem,
  archivePantryItem,
  restorePantryItem,
  estimateExpiry,
  type PantryListParams,
} from '@/lib/api/pantry'
import { getApiErrorMessage } from '@/lib/axios'
import { formatEnumLabel } from '@/lib/format'
import { CATEGORIES, STORAGE_LOCATIONS, type Category, type PantryItem, type Disposition } from '@/types'
import type { BarcodeProduct } from '@/lib/api/integrations'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'FRESH', label: 'Fresh' },
  { value: 'SOON', label: 'Expiring soon' },
  { value: 'URGENT', label: 'Expiring very soon' },
  { value: 'EXPIRED', label: 'Expired' },
] as const

const SORT_OPTIONS = [
  { value: 'expiryDate', label: 'Expiry date' },
  { value: 'purchaseDate', label: 'Purchase date' },
  { value: 'name', label: 'Name' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'category', label: 'Category' },
] as const

export default function PantryPage() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<PantryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('ALL')
  const [storageLocation, setStorageLocation] = useState<string>('ALL')
  const [status, setStatus] = useState<string>(() => {
    const fromUrl = searchParams.get('status')?.toUpperCase()
    return STATUS_OPTIONS.some((o) => o.value === fromUrl) ? fromUrl! : 'ALL'
  })
  const [archived, setArchived] = useState(false)
  const [sortBy, setSortBy] = useState<PantryListParams['sortBy']>('expiryDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [prefill, setPrefill] = useState<ItemFormPrefill | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: PantryListParams = {
        search: search || undefined,
        category: category === 'ALL' ? undefined : (category as PantryListParams['category']),
        storageLocation: storageLocation === 'ALL' ? undefined : (storageLocation as PantryListParams['storageLocation']),
        status: status === 'ALL' ? undefined : (status as PantryListParams['status']),
        archived,
        sortBy,
        sortOrder,
        pageSize: 60,
      }
      const result = await listPantryItems(params)
      setItems(result.items)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load pantry items'))
    } finally {
      setIsLoading(false)
    }
  }, [search, category, storageLocation, status, archived, sortBy, sortOrder])

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 250)
    return () => clearTimeout(timeout)
  }, [fetchItems])

  function openAddDialog() {
    setEditingItem(null)
    setPrefill(null)
    setFormOpen(true)
  }

  function openEditDialog(item: PantryItem) {
    setEditingItem(item)
    setPrefill(null)
    setFormOpen(true)
  }

  // Scanning a barcode should feel like one click: add the item immediately with a sensible
  // default (qty 1, auto-estimated expiry, image from the lookup) rather than making the user
  // fill out the whole form. The success toast offers "Edit details" for anyone who wants to
  // adjust quantity, storage location, price, etc. afterward.
  async function handleBarcodeDetected(code: string, product: BarcodeProduct | null) {
    if (!product) {
      setEditingItem(null)
      setPrefill({ barcode: code })
      setFormOpen(true)
      return
    }

    const matchedCategory = product.category
      ? (CATEGORIES.find((c) => c.toLowerCase() === product.category!.toLowerCase()) as Category | undefined)
      : undefined
    const category = matchedCategory ?? 'OTHERS'
    const purchaseDate = new Date().toISOString().slice(0, 10)

    try {
      const { expiryDate } = await estimateExpiry({ name: product.name, category, storageLocation: 'PANTRY', purchaseDate })
      const created = await createPantryItem({
        name: product.name,
        brand: product.brand,
        category,
        quantity: 1,
        unit: 'pcs',
        storageLocation: 'PANTRY',
        purchaseDate,
        expiryDate: expiryDate.slice(0, 10),
        barcode: code,
        imageUrl: product.imageUrl,
      })
      setItems((prev) => [created, ...prev])
      toast.success(`Added ${product.name}`, {
        action: {
          label: 'Edit details',
          onClick: () => {
            setEditingItem(created)
            setPrefill(null)
            setFormOpen(true)
          },
        },
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not quick-add this item'))
    }
  }

  function handleVoiceParsed(result: { name: string; quantity: number; unit: string }) {
    setEditingItem(null)
    setPrefill({ name: result.name, quantity: result.quantity, unit: result.unit })
    setFormOpen(true)
  }

  function handleSaved(item: PantryItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id)
      return exists ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev]
    })
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await duplicatePantryItem(id)
      setItems((prev) => [copy, ...prev])
      toast.success('Item duplicated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    try {
      await deletePantryItem(deletingId)
      setItems((prev) => prev.filter((i) => i.id !== deletingId))
      toast.success('Item deleted')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleChooseDisposition(disposition: Disposition, estimatedValue?: number) {
    if (!archivingId) return
    try {
      await archivePantryItem(archivingId, disposition, estimatedValue)
      setItems((prev) => prev.filter((i) => i.id !== archivingId))
      toast.success('Item archived')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setArchivingId(null)
    }
  }

  async function handleRestore(id: string) {
    try {
      await restorePantryItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Item restored')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pantry</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <Barcode className="mr-1 size-4" /> Scan barcode
          </Button>
          <Button variant="outline" onClick={() => setReceiptOpen(true)}>
            <Receipt className="mr-1 size-4" /> Scan receipt
          </Button>
          <VoiceQuickAddButton onParsed={handleVoiceParsed} />
          <Button onClick={openAddDialog}>
            <Plus className="mr-1 size-4" /> Add item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search name or brand…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{formatEnumLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={storageLocation} onValueChange={setStorageLocation}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Storage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All storage</SelectItem>
            {STORAGE_LOCATIONS.map((s) => (
              <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as PantryListParams['sortBy'])}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>

        <Button variant={archived ? 'default' : 'outline'} onClick={() => setArchived((a) => !a)}>
          {archived ? 'Showing archived' : 'Show archived'}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          <p>No items found.</p>
          <Button variant="link" onClick={openAddDialog}>
            Add your first pantry item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => openEditDialog(item)}
              onDuplicate={() => handleDuplicate(item.id)}
              onArchive={() => setArchivingId(item.id)}
              onRestore={() => handleRestore(item.id)}
              onDelete={() => setDeletingId(item.id)}
            />
          ))}
        </div>
      )}

      <ItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editingItem} prefill={prefill} onSaved={handleSaved} />
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleBarcodeDetected} />
      <ReceiptScanDialog open={receiptOpen} onOpenChange={setReceiptOpen} onImported={fetchItems} />
      <ArchiveDispositionDialog
        open={archivingId !== null}
        onOpenChange={(open) => !open && setArchivingId(null)}
        item={items.find((i) => i.id === archivingId) ?? null}
        onChoose={handleChooseDisposition}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
