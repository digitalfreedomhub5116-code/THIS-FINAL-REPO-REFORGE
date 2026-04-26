import crypto from 'crypto';
import { Resend } from 'resend';
import { supabaseServer } from '../lib/supabase.js';

// ── CONFIG ──
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDER_EMAIL = process.env.OTP_SENDER_EMAIL || 'noreply@reforgeai.in';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOtp(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 10 ** OTP_LENGTH;
  return String(num).padStart(OTP_LENGTH, '0');
}

/**
 * Store OTP in the database (invalidates any existing OTPs for this email)
 */
export async function storeOtp(email: string, otp: string): Promise<void> {
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Delete any existing OTPs for this email
  await (supabaseServer() as any)
    .from('email_otps')
    .delete()
    .eq('email', email.toLowerCase());

  // Insert new OTP
  const { error } = await (supabaseServer() as any)
    .from('email_otps')
    .insert({
      email: email.toLowerCase(),
      otp_hash: hashedOtp,
      expires_at: expiresAt,
      attempts: 0,
    });

  if (error) {
    console.error('[OTP] Failed to store OTP:', error);
    throw new Error('Failed to store verification code');
  }
}

/**
 * Verify an OTP for an email address
 * Returns: { valid: boolean; error?: string }
 */
export async function verifyOtp(email: string, otp: string): Promise<{ valid: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // Fetch the stored OTP record
  const { data, error } = await (supabaseServer() as any)
    .from('email_otps')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (error || !data) {
    return { valid: false, error: 'No verification code found. Please request a new one.' };
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Clean up expired OTP
    await (supabaseServer() as any).from('email_otps').delete().eq('email', normalizedEmail);
    return { valid: false, error: 'Verification code has expired. Please request a new one.' };
  }

  // Check max attempts (5)
  if (data.attempts >= 5) {
    await (supabaseServer() as any).from('email_otps').delete().eq('email', normalizedEmail);
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Increment attempts
  await (supabaseServer() as any)
    .from('email_otps')
    .update({ attempts: data.attempts + 1 })
    .eq('email', normalizedEmail);

  // Verify
  if (data.otp_hash !== hashedOtp) {
    return { valid: false, error: `Invalid code. ${4 - data.attempts} attempts remaining.` };
  }

  // Valid — clean up
  await (supabaseServer() as any).from('email_otps').delete().eq('email', normalizedEmail);
  return { valid: true };
}

/**
 * Send OTP email via Resend
 */
export async function sendOtpEmail(email: string, otp: string, username: string): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: `Reforge <${SENDER_EMAIL}>`,
    to: email,
    subject: `${otp} is your Reforge verification code`,
    html: `
      <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #08081a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">REFORGE</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 8px 0 0;">Email Verification</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 32px 24px;">
          <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
            Welcome, <strong style="color: white;">${username}</strong>!
          </p>
          <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Enter this code to verify your email and complete your registration:
          </p>
          
          <!-- OTP Code -->
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #a78bfa;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0;">
            This code expires in ${OTP_EXPIRY_MINUTES} minutes.<br/>
            If you didn't create a Reforge account, please ignore this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="color: #52525b; font-size: 11px; margin: 0;">
            Reforge — Level Up Your Life
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('[OTP] Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }

  console.log(`[OTP] Verification email sent to ${email}`);
}
