import { useState } from 'react'
import { toast } from 'sonner'
import { Receipt, Plus, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { scanReceipt, type ParsedReceiptLine } from '@/lib/api/integrations'
import { createPantryItem, estimateExpiry } from '@/lib/api/pantry'
import { getApiErrorMessage } from '@/lib/axios'

type EditableLine = ParsedReceiptLine & { selected: boolean; added: boolean }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

async function addLineToPantry(line: EditableLine) {
  const purchaseDate = new Date().toISOString().slice(0, 10)
  const expiryDate = await estimateExpiry({ name: line.name, category: 'OTHERS', storageLocation: 'PANTRY', purchaseDate })
    .then((r) => r.expiryDate.slice(0, 10))
    .catch(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

  return createPantryItem({
    name: line.name.trim(),
    category: 'OTHERS',
    quantity: 1,
    unit: 'pcs',
    storageLocation: 'PANTRY',
    purchaseDate,
    expiryDate,
    price: line.price,
  })
}

export function ReceiptScanDialog({ open, onOpenChange, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [lines, setLines] = useState<EditableLine[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [addingIndex, setAddingIndex] = useState<number | null>(null)

  function handleClose(next: boolean) {
    if (!next) {
      setFile(null)
      setLines([])
    }
    onOpenChange(next)
  }

  async function handleScan() {
    if (!file) return
    setIsScanning(true)
    try {
      const detected = await scanReceipt(file)
      if (detected.length === 0) {
        toast.message('No line items detected — try a clearer photo or add items manually.')
      }
      setLines(detected.map((line) => ({ ...line, selected: true, added: false })))
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Receipt scanning is not available yet'))
    } finally {
      setIsScanning(false)
    }
  }

  function updateLine(index: number, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  async function handleQuickAdd(index: number) {
    const line = lines[index]
    if (!line.name.trim() || line.added) return

    setAddingIndex(index)
    try {
      await addLineToPantry(line)
      updateLine(index, { added: true, selected: false })
      toast.success(`Added ${line.name}`)
      onImported()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add this item'))
    } finally {
      setAddingIndex(null)
    }
  }

  async function handleImport() {
    const toImport = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.selected && !line.added && line.name.trim())
    if (toImport.length === 0) return

    setIsImporting(true)
    try {
      let imported = 0
      for (const { line, index } of toImport) {
        await addLineToPantry(line)
        updateLine(index, { added: true, selected: false })
        imported += 1
      }
      toast.success(`Added ${imported} item(s) from the receipt`)
      onImported()
      handleClose(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not import all items'))
    } finally {
      setIsImporting(false)
    }
  }

  const remainingCount = lines.filter((l) => l.selected && !l.added).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4" /> Scan a receipt
          </DialogTitle>
          <DialogDescription>Upload a photo of your receipt to auto-detect items and prices.</DialogDescription>
        </DialogHeader>

        {lines.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={handleScan} disabled={!file || isScanning}>
              {isScanning ? 'Scanning…' : 'Scan receipt'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Click the <Plus className="inline size-3" /> to add one item instantly, or select several and import them together.
            </p>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {lines.map((line, i) => (
                <div key={i} className={`flex items-center gap-2 ${line.added ? 'opacity-50' : ''}`}>
                  <Checkbox
                    checked={line.selected}
                    disabled={line.added}
                    onCheckedChange={(checked) => updateLine(i, { selected: Boolean(checked) })}
                  />
                  <Input
                    value={line.name}
                    disabled={line.added}
                    onChange={(e) => updateLine(i, { name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    disabled={line.added}
                    value={line.price ?? ''}
                    onChange={(e) => updateLine(i, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={line.added || addingIndex === i}
                    onClick={() => handleQuickAdd(i)}
                    title={line.added ? 'Added' : 'Add just this item'}
                  >
                    {line.added ? <Check className="size-4 text-expiry-fresh" /> : <Plus className="size-4" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {lines.some((l) => l.added) ? 'Done' : 'Cancel'}
          </Button>
          {remainingCount > 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importing…' : `Import ${remainingCount} item(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
