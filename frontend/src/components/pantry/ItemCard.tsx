import { MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Trash2, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EXPIRY_STATUS_CONFIG, formatDaysRemaining, formatDate } from '@/lib/expiry'
import { formatEnumLabel, formatCurrency } from '@/lib/format'
import { resolveBackendUrl } from '@/lib/env'
import type { PantryItem } from '@/types'

type Props = {
  item: PantryItem
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

export function ItemCard({ item, onEdit, onDuplicate, onArchive, onRestore, onDelete }: Props) {
  const statusConfig = EXPIRY_STATUS_CONFIG[item.expiryStatus]

  return (
    <Card className="overflow-hidden">
      <div className="flex h-32 items-center justify-center bg-muted">
        {item.imageUrl ? (
          <img src={resolveBackendUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground" />
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">{item.brand || formatEnumLabel(item.category)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`${item.name} actions`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {item.isArchived ? (
                <DropdownMenuItem onClick={onRestore}>
                  <ArchiveRestore className="mr-2 size-4" /> Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 size-4" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge variant={statusConfig.badgeVariant}>{formatDaysRemaining(item.daysRemaining)}</Badge>
          <span className="text-xs text-muted-foreground">
            {item.quantity} {item.unit}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatEnumLabel(item.storageLocation)}</span>
          <span>{formatDate(item.expiryDate)}</span>
        </div>
        {item.price != null && <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.price)}</p>}
      </CardContent>
    </Card>
  )
}
