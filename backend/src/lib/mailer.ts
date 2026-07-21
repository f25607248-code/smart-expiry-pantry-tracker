import dns from 'node:dns'
import nodemailer from 'nodemailer'
import { env, isEmailConfigured } from '../config/env.js'

// Some hosts (e.g. Railway) have no outbound IPv6 route, but smtp.gmail.com resolves to
// both families - prefer IPv4 process-wide so SMTP connections don't hang/ENETUNREACH.
dns.setDefaultResultOrder('ipv4first')

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null

type SendMailInput = {
  to: string
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  if (!transporter) {
    console.warn(`[mailer] SMTP not configured - skipping email to ${to}: "${subject}"`)
    return { skipped: true }
  }

  await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
  return { skipped: false }
}

export function verificationEmailTemplate(name: string, verifyUrl: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Welcome to Smart Pantry Tracker, ${name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Verify Email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
    </div>`
}

export function passwordResetEmailTemplate(name: string, resetUrl: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Password reset requested</h2>
      <p>Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>`
}

export function dailyReminderEmailTemplate(name: string, expiringSoon: string[], expiredToday: string[]) {
  const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p>None</p>')
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Your daily pantry summary, ${name}</h2>
      <h3>Expiring soon</h3>
      ${list(expiringSoon)}
      <h3>Expired</h3>
      ${list(expiredToday)}
    </div>`
}
