import { Outlet } from 'react-router-dom'
import { Refrigerator } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Refrigerator className="size-6 text-primary" />
          <span className="text-lg font-semibold">Smart Pantry Tracker</span>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
