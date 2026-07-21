import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/lib/axios'
import {
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  type TwoFactorSetup,
} from '@/lib/api/twoFactor'

type Step = 'closed' | 'setup' | 'recoveryCodes' | 'disable' | 'regenerate'

export function TwoFactorSettings() {
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState<Step>('closed')
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  function resetAndClose() {
    setStep('closed')
    setSetupData(null)
    setConfirmCode('')
    setPassword('')
    setCode('')
  }

  async function handleStartSetup() {
    setIsBusy(true)
    try {
      const data = await setupTwoFactor()
      setSetupData(data)
      setStep('setup')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not start two-factor setup'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleConfirmSetup() {
    if (!confirmCode.trim()) return
    setIsBusy(true)
    try {
      const codes = await confirmTwoFactor(confirmCode.trim())
      setRecoveryCodes(codes)
      setStep('recoveryCodes')
      await refreshUser()
      toast.success('Two-factor authentication enabled')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid code'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDisable() {
    if (!password || !code.trim()) return
    setIsBusy(true)
    try {
      await disableTwoFactor(password, code.trim())
      await refreshUser()
      toast.success('Two-factor authentication disabled')
      resetAndClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not disable two-factor authentication'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRegenerate() {
    if (!password) return
    setIsBusy(true)
    try {
      const codes = await regenerateRecoveryCodes(password)
      setRecoveryCodes(codes)
      setStep('recoveryCodes')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not regenerate recovery codes'))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Add an extra layer of security with an authenticator app like Google Authenticator.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {user?.twoFactorEnabled ? (
          <Badge variant="fresh" className="gap-1">
            <ShieldCheck className="size-3.5" /> Enabled
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <ShieldOff className="size-3.5" /> Disabled
          </Badge>
        )}

        {user?.twoFactorEnabled ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('regenerate')}>
              New recovery codes
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setStep('disable')}>
              Disable
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleStartSetup} disabled={isBusy}>
            Enable 2FA
          </Button>
        )}
      </CardContent>

      <Dialog open={step === 'setup'} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan with your authenticator app</DialogTitle>
            <DialogDescription>Use Google Authenticator, Authy, or any TOTP app.</DialogDescription>
          </DialogHeader>
          {setupData && (
            <div className="flex flex-col items-center gap-3">
              <img src={setupData.qrCodeDataUrl} alt="Two-factor setup QR code" className="size-48 rounded-md border" />
              <p className="text-xs text-muted-foreground">Can't scan? Enter this code manually:</p>
              <code className="w-full break-all rounded bg-muted px-2 py-1 text-center text-xs">{setupData.secret}</code>
              <div className="flex w-full flex-col gap-1.5">
                <Label htmlFor="confirmCode">6-digit code</Label>
                <Input
                  id="confirmCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleConfirmSetup} disabled={isBusy || !confirmCode.trim()}>
                Verify & enable
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={step === 'recoveryCodes'} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save your recovery codes</DialogTitle>
            <DialogDescription>
              Each code works once and lets you in if you lose your authenticator app. This is the only time they'll be shown.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/50 p-3 font-mono text-sm">
            {recoveryCodes?.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button className="mt-2" onClick={resetAndClose}>
            I've saved these codes
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={step === 'disable'} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication</DialogTitle>
            <DialogDescription>Confirm your password and a current code to turn this off.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disablePassword">Password</Label>
              <Input id="disablePassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disableCode">Verification code</Label>
              <Input id="disableCode" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button variant="destructive" onClick={handleDisable} disabled={isBusy || !password || !code.trim()}>
              Disable two-factor authentication
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={step === 'regenerate'} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate new recovery codes</DialogTitle>
            <DialogDescription>Your old recovery codes will stop working. Confirm your password to continue.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regeneratePassword">Password</Label>
              <Input id="regeneratePassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button onClick={handleRegenerate} disabled={isBusy || !password}>
              Generate new codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
