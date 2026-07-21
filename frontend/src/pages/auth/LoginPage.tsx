import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/lib/axios'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login, loginWithGoogle, completeTwoFactorLogin } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const result = await login(values.email, values.password)
      if (result.requiresTwoFactor) {
        setPendingToken(result.pendingToken)
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid email or password'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleCredential(idToken: string) {
    try {
      const result = await loginWithGoogle(idToken)
      if (result.requiresTwoFactor) {
        setPendingToken(result.pendingToken)
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Google sign-in failed'))
    }
  }

  async function onVerifyCode() {
    if (!pendingToken || !code.trim()) return
    setIsVerifying(true)
    try {
      await completeTwoFactorLogin(pendingToken, code.trim())
      navigate('/dashboard')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid verification code'))
    } finally {
      setIsVerifying(false)
    }
  }

  if (pendingToken) {
    return (
      <Card key="two-factor-step">
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app, or one of your recovery codes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              onVerifyCode()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isVerifying || !code.trim()} className="mt-2">
              {isVerifying ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPendingToken(null)}>
              Back to log in
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card key="password-step">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to manage your pantry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <GoogleSignInButton onCredential={handleGoogleCredential} />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
