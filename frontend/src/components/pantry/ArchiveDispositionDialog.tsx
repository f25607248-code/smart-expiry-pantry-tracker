import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Disposition, PantryItem } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PantryItem | null
  onChoose: (disposition: Disposition, estimatedValue?: number) => void
}

export function ArchiveDispositionDialog({ open, onOpenChange, item, onChoose }: Props) {
  const [pendingDisposition, setPendingDisposition] = useState<Disposition | null>(null)
  const [valueInput, setValueInput] = useState('')

  useEffect(() => {
    if (!open) {
      setPendingDisposition(null)
      setValueInput('')
    }
  }, [open])

  function handlePick(disposition: Disposition) {
    // DONATED isn't counted in money saved/wasted stats, and items with a price already have a value to log — skip the extra prompt.
    if (disposition === 'DONATED' || item?.price != null) {
      onChoose(disposition)
      return
    }
    setPendingDisposition(disposition)
  }

  function handleSkipValue() {
    if (pendingDisposition) onChoose(pendingDisposition)
  }

  function handleConfirmValue() {
    if (!pendingDisposition) return
    const parsed = Number(valueInput)
    onChoose(pendingDisposition, valueInput !== '' && !Number.isNaN(parsed) ? parsed : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {pendingDisposition ? (
          <>
            <DialogHeader>
              <DialogTitle>What was it worth?</DialogTitle>
              <DialogDescription>
                This item has no price on file — add an estimate so it counts toward your money saved/wasted stats. Optional.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="archiveValue">Estimated value</Label>
              <Input
                id="archiveValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleSkipValue}>
                Skip
              </Button>
              <Button onClick={handleConfirmValue}>Confirm</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>What happened to this item?</DialogTitle>
              <DialogDescription>This helps track your money saved and food waste stats.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handlePick('CONSUMED')}>Consumed / used it</Button>
              <Button variant="outline" onClick={() => handlePick('WASTED')}>
                Thrown away / wasted
              </Button>
              <Button variant="outline" onClick={() => handlePick('DONATED')}>
                Donated
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
