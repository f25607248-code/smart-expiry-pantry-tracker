import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings'
import { useAuth } from '@/context/AuthContext'
import { api, getApiErrorMessage } from '@/lib/axios'

type ProfileForm = {
  name: string
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  language: string
  timezone: string
  currency: string
  measurementUnit: 'metric' | 'imperial'
  notifyEmail: boolean
  notifyInApp: boolean
  dailySummaryEnabled: boolean
  weeklyReportEnabled: boolean
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? '',
      theme: user?.theme ?? 'SYSTEM',
      language: user?.language ?? 'en',
      timezone: user?.timezone ?? 'UTC',
      currency: user?.currency ?? 'USD',
      measurementUnit: user?.measurementUnit ?? 'metric',
      notifyEmail: user?.notifyEmail ?? true,
      notifyInApp: user?.notifyInApp ?? true,
      dailySummaryEnabled: user?.dailySummaryEnabled ?? true,
      weeklyReportEnabled: user?.weeklyReportEnabled ?? true,
    },
  })

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm } = useForm<PasswordForm>()

  async function onSaveProfile(values: ProfileForm) {
    setIsSavingProfile(true)
    try {
      await api.patch('/users/me', values)
      await refreshUser()
      toast.success('Settings saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function onChangePassword(values: PasswordForm) {
    setIsSavingPassword(true)
    try {
      await api.patch('/users/me/password', values)
      toast.success('Password changed')
      resetPasswordForm()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not change password'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile & preferences</CardTitle>
          <CardDescription>Personalize how Pantry Tracker looks and notifies you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSaveProfile)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Theme</Label>
                <Select value={watch('theme')} onValueChange={(v) => setValue('theme', v as ProfileForm['theme'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGHT">Light</SelectItem>
                    <SelectItem value="DARK">Dark</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Measurement units</Label>
                <Select value={watch('measurementUnit')} onValueChange={(v) => setValue('measurementUnit', v as ProfileForm['measurementUnit'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="imperial">Imperial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" {...register('currency')} placeholder="USD" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timezone">Time zone</Label>
                <Input id="timezone" {...register('timezone')} placeholder="UTC" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Input id="language" {...register('language')} placeholder="en" />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyEmail">Email notifications</Label>
                <Switch id="notifyEmail" checked={watch('notifyEmail')} onCheckedChange={(v) => setValue('notifyEmail', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyInApp">In-app notifications</Label>
                <Switch id="notifyInApp" checked={watch('notifyInApp')} onCheckedChange={(v) => setValue('notifyInApp', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dailySummaryEnabled">Daily reminder summary</Label>
                <Switch id="dailySummaryEnabled" checked={watch('dailySummaryEnabled')} onCheckedChange={(v) => setValue('dailySummaryEnabled', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weeklyReportEnabled">Weekly report</Label>
                <Switch id="weeklyReportEnabled" checked={watch('weeklyReportEnabled')} onCheckedChange={(v) => setValue('weeklyReportEnabled', v)} />
              </div>
            </div>

            <Button type="submit" disabled={isSavingProfile} className="self-start">
              {isSavingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit(onChangePassword)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" {...registerPassword('currentPassword', { required: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" {...registerPassword('newPassword', { required: true, minLength: 8 })} />
            </div>
            <Button type="submit" disabled={isSavingPassword} className="self-start">
              {isSavingPassword ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TwoFactorSettings />
    </div>
  )
}
