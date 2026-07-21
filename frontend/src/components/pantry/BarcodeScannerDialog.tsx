import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { toast } from 'sonner'
import { Camera, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { lookupBarcode, type BarcodeProduct } from '@/lib/api/integrations'
import { getApiErrorMessage } from '@/lib/axios'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string, product: BarcodeProduct | null) => void
}

export function BarcodeScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  useEffect(() => {
    if (!open || !videoRef.current) return
    setError(null)

    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
        if (cancelled || isLookingUp) return
        if (result) {
          const code = result.getText()
          controlsRef.current?.stop()
          setIsLookingUp(true)
          try {
            const product = await lookupBarcode(code)
            toast.success(`Found: ${product.name}`)
            onDetected(code, product)
          } catch (lookupError) {
            toast.message(getApiErrorMessage(lookupError, 'Product lookup unavailable — add details manually'))
            onDetected(code, null)
          } finally {
            setIsLookingUp(false)
            onOpenChange(false)
          }
          return
        }
        // NotFoundException fires continuously while no barcode is in frame - that's expected, not an error.
        if (err && err.name !== 'NotFoundException') {
          console.error(err)
        }
      })
      .then((controls) => {
        controlsRef.current = controls
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not access the camera')
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-4" /> Scan a barcode
          </DialogTitle>
          <DialogDescription>Point your camera at a product barcode.</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <X className="size-6 text-destructive" />
            <p>{error}</p>
            <p className="text-xs">Check camera permissions, or add the item manually instead.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
        )}
        {isLookingUp && <p className="text-center text-sm text-muted-foreground">Looking up product…</p>}
      </DialogContent>
    </Dialog>
  )
}
