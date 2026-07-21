import { useEffect, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPantryItem, updatePantryItem, uploadPantryItemImage, estimateExpiry } from '@/lib/api/pantry'
import { getApiErrorMessage } from '@/lib/axios'
import { formatEnumLabel } from '@/lib/format'
import { toDateInputValue } from '@/lib/expiry'
import { resolveBackendUrl } from '@/lib/env'
import { CATEGORIES, STORAGE_LOCATIONS, type Category, type StorageLocation, type PantryItem } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  brand: z.string().trim().optional(),
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  quantity: z.coerce.number().positive('Must be greater than 0'),
  unit: z.string().trim().min(1, 'Unit is required'),
  storageLocation: z.enum(STORAGE_LOCATIONS as [StorageLocation, ...StorageLocation[]]),
  purchaseDate: z.string().min(1),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  price: z.literal('').or(z.coerce.number().nonnegative()).optional(),
  barcode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

export type ItemFormPrefill = Partial<Pick<FormValues, 'name' | 'brand' | 'category' | 'barcode' | 'quantity' | 'unit'>>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PantryItem | null
  /** Initial field values for a new item (e.g. from a barcode scan or receipt line) - ignored when editing an existing item. */
  prefill?: ItemFormPrefill | null
  onSaved: (item: PantryItem) => void
}

const defaultValues: FormValues = {
  name: '',
  brand: '',
  category: 'OTHERS',
  quantity: 1,
  unit: 'pcs',
  storageLocation: 'PANTRY',
  purchaseDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  price: '',
  barcode: '',
  notes: '',
}

export function ItemFormDialog({ open, onOpenChange, item, prefill, onSaved }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [expiryTouched, setExpiryTouched] = useState(false)
  const [expirySuggested, setExpirySuggested] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues })

  useEffect(() => {
    if (!open) return
    if (item) {
      reset({
        name: item.name,
        brand: item.brand ?? '',
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        storageLocation: item.storageLocation,
        purchaseDate: toDateInputValue(item.purchaseDate),
        expiryDate: toDateInputValue(item.expiryDate),
        price: item.price ?? '',
        barcode: item.barcode ?? '',
        notes: item.notes ?? '',
      })
      setExpiryTouched(true) // never auto-overwrite an existing item's expiry date
    } else {
      reset({ ...defaultValues, ...prefill })
      setExpiryTouched(false)
    }
    setExpirySuggested(false)
    setImageFile(null)
  }, [open, item, prefill, reset])

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImagePreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setImagePreviewUrl(item?.imageUrl ? resolveBackendUrl(item.imageUrl) : null)
  }, [imageFile, item])

  const watchedName = watch('name')
  const watchedCategory = watch('category')
  const watchedStorageLocation = watch('storageLocation')
  const watchedPurchaseDate = watch('purchaseDate')

  // Smart expiry estimation: while adding a new item, suggest an expiry date from a shelf-life
  // knowledge base once the user has typed a name - saves them from having to know/look up how
  // long milk vs. rice vs. chicken actually lasts. Never overrides a date the user set themselves.
  useEffect(() => {
    if (!open || item || expiryTouched || !watchedName.trim()) return
    const timeout = setTimeout(async () => {
      try {
        const { expiryDate } = await estimateExpiry({
          name: watchedName,
          category: watchedCategory,
          storageLocation: watchedStorageLocation,
          purchaseDate: watchedPurchaseDate || undefined,
        })
        setValue('expiryDate', expiryDate.slice(0, 10))
        setExpirySuggested(true)
      } catch {
        // Best-effort suggestion; silently skip if the estimate call fails.
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [open, item, expiryTouched, watchedName, watchedCategory, watchedStorageLocation, watchedPurchaseDate, setValue])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        ...values,
        price: values.price === '' ? undefined : Number(values.price),
      }

      const saved = item ? await updatePantryItem(item.id, payload) : await createPantryItem(payload)
      const withImage = imageFile ? await uploadPantryItemImage(saved.id, imageFile) : saved

      toast.success(item ? 'Item updated' : 'Item added')
      onSaved(withImage)
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save item'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit item' : 'Add pantry item'}</DialogTitle>
          <DialogDescription>Track expiry and storage details for accurate reminders.</DialogDescription>
        </DialogHeader>

        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex gap-3 sm:col-span-2">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Product preview" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1.5">
              <Label htmlFor="image">Product photo</Label>
              <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" {...register('brand')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...register('barcode')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {formatEnumLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Storage location</Label>
            <Controller
              control={control}
              name="storageLocation"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_LOCATIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" step="any" {...register('quantity')} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="pcs, kg, liter…" {...register('unit')} />
            {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchaseDate">Purchase date</Label>
            <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiryDate">Expiry date</Label>
              {expirySuggested && !expiryTouched && (
                <span className="text-xs text-muted-foreground">Estimated</span>
              )}
            </div>
            <Input
              id="expiryDate"
              type="date"
              {...register('expiryDate', {
                onChange: () => {
                  setExpiryTouched(true)
                  setExpirySuggested(false)
                },
              })}
            />
            {errors.expiryDate && <p className="text-xs text-destructive">{errors.expiryDate.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" {...register('price')} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
