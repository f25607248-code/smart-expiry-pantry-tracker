import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, getApiErrorMessage } from '@/lib/axios'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    api
      .get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch((error) => {
        setStatus('error')
        setMessage(getApiErrorMessage(error, 'Verification link is invalid or expired'))
      })
  }, [token])

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {status === 'loading' && <Loader2 className="size-8 animate-spin text-muted-foreground" />}
        {status === 'success' && <CheckCircle2 className="size-8 text-expiry-fresh" />}
        {status === 'error' && <XCircle className="size-8 text-destructive" />}
        <CardTitle>
          {status === 'loading' && 'Verifying your email…'}
          {status === 'success' && 'Email verified!'}
          {status === 'error' && 'Verification failed'}
        </CardTitle>
        <CardDescription>{status === 'error' ? message : status === 'success' ? 'You can now use all features.' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Link to="/dashboard" className="text-primary hover:underline">
          Go to dashboard
        </Link>
      </CardContent>
    </Card>
  )
}
