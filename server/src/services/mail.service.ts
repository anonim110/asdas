import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

function assertMailConfigured() {
  if (!env.mail.user || !env.mail.pass || !env.mail.from) {
    throw new ApiError(503, 'Email delivery is temporarily unavailable');
  }
}

export async function sendPasswordResetCode(to: string, code: string) {
  assertMailConfigured();

  const transport = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });

  await transport.sendMail({
    from: `Murmur <${env.mail.from}>`,
    to,
    subject: 'Your Murmur password reset code',
    text: `Your Murmur password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1e293b">
        <h1 style="color:#e11d48;font-size:28px;margin-bottom:12px">Murmur</h1>
        <p>Use this code to reset your password:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;text-align:center">
          ${code}
        </div>
        <p style="color:#64748b">The code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  });
}
