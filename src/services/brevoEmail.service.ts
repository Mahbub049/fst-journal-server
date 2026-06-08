import { env } from "../config/env";

type BrevoEmailPayload = {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
};

export const sendBrevoEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
}: BrevoEmailPayload): Promise<void> => {
  if (!env.brevo.apiKey || !env.brevo.senderEmail) {
    throw new Error(
      "Brevo is not configured. Please set BREVO_API_KEY and BREVO_SENDER_EMAIL."
    );
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.brevo.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: env.brevo.senderName,
        email: env.brevo.senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo email failed: ${response.status} ${errorText}`);
  }
};

export const sendAdminLoginOtpEmail = async ({
  to,
  name,
  otp,
  expiryMinutes,
}: {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}): Promise<void> => {
  const safeName = name || "Admin";

  await sendBrevoEmail({
    to,
    subject: "Journal of FST Admin Login OTP",
    textContent: `Hello ${safeName}, your Journal of FST Admin login OTP is ${otp}. This code will expire in ${expiryMinutes} minutes. If you did not request this login, please ignore this email.`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: #005A78; padding: 22px 26px; color: #ffffff;">
          <p style="margin: 0; letter-spacing: 3px; text-transform: uppercase; font-size: 12px; opacity: 0.8;">Journal of FST</p>
          <h2 style="margin: 8px 0 0; font-size: 22px;">Admin Login Verification</h2>
        </div>
        <div style="padding: 26px; color: #0f172a;">
          <p style="margin: 0 0 14px; font-size: 15px;">Hello ${safeName},</p>
          <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6;">Use the following OTP to complete your admin login.</p>
          <div style="margin: 22px 0; text-align: center;">
            <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #005A78; background: #f1f5f9; border-radius: 14px; padding: 16px 22px;">${otp}</span>
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; color: #475569;">This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
          <p style="margin: 0; font-size: 13px; color: #64748b;">If you did not request this login, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};
