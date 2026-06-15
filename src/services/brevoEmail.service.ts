import { env } from "../config/env";

type BrevoEmailPayload = {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getClientUrl = () => {
  return (env.clientUrl || "").replace(/\/+$/, "");
};

const getBupLogoUrl = () => {
  const clientUrl = getClientUrl();

  if (!clientUrl) {
    return "";
  }

  return `${clientUrl}/images/bup.png`;
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

type OtpEmailTemplateOptions = {
  name: string;
  otp: string;
  expiryMinutes: number;
  heading: string;
  intro: string;
  warning: string;
};

const buildOtpEmailHtml = ({
  name,
  otp,
  expiryMinutes,
  heading,
  intro,
  warning,
}: OtpEmailTemplateOptions) => {
  const logoUrl = getBupLogoUrl();
  const safeName = escapeHtml(name || "Admin");
  const safeOtp = escapeHtml(otp);
  const safeHeading = escapeHtml(heading);
  const safeIntro = escapeHtml(intro);
  const safeWarning = escapeHtml(warning);

  const logoHtml = logoUrl
    ? `
      <div style="margin: 0 auto 14px; height: 74px; width: 74px; border-radius: 999px; background: #ffffff; border: 1px solid #dbe7ed; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.10); text-align: center; line-height: 74px;">
        <img src="${logoUrl}" width="54" height="54" alt="BUP Logo" style="display: inline-block; vertical-align: middle; height: 54px; width: 54px; object-fit: contain; border: 0; outline: none; text-decoration: none;" />
      </div>
    `
    : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeHeading}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #edf7f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          Your Journal of FST Admin OTP is ${safeOtp}. It expires in ${expiryMinutes} minutes.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #edf7f9; margin: 0; padding: 30px 14px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 590px; width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background: #005A78; border-radius: 22px 22px 0 0; padding: 28px 26px 24px; text-align: center;">
                    ${logoHtml}
                    <p style="margin: 0; color: rgba(255,255,255,0.78); font-size: 12px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;">
                      Journal of FST
                    </p>
                    <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; line-height: 1.3; font-weight: 800;">
                      ${safeHeading}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="background: #ffffff; border-left: 1px solid #dbe7ed; border-right: 1px solid #dbe7ed; padding: 30px 30px 8px;">
                    <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #0f172a;">
                      Hello <strong>${safeName}</strong>,
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                      ${safeIntro}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background: #ffffff; border-left: 1px solid #dbe7ed; border-right: 1px solid #dbe7ed; padding: 18px 30px 20px; text-align: center;">
                    <div style="display: inline-block; min-width: 240px; background: #f3fbfd; border: 1px solid #d4e8ef; border-radius: 18px; padding: 18px 22px;">
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                        Verification Code
                      </p>
                      <p style="margin: 0; color: #005A78; font-size: 36px; line-height: 1; font-weight: 900; letter-spacing: 10px;">
                        ${safeOtp}
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background: #ffffff; border-left: 1px solid #dbe7ed; border-right: 1px solid #dbe7ed; padding: 0 30px 28px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px 16px;">
                      <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #475569;">
                        This code will expire in <strong style="color: #0f172a;">${expiryMinutes} minutes</strong>.
                      </p>
                      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                        ${safeWarning}
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background: #f8fafc; border: 1px solid #dbe7ed; border-top: 0; border-radius: 0 0 22px 22px; padding: 18px 26px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                      Bangladesh University of Professionals<br />
                      This is an automated security email from Journal of FST Admin CMS.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
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
    htmlContent: buildOtpEmailHtml({
      name: safeName,
      otp,
      expiryMinutes,
      heading: "Admin Login Verification",
      intro: "Use the following OTP to complete your secure admin login.",
      warning: "If you did not request this login, please ignore this email and do not share the code with anyone.",
    }),
  });
};

export const sendAdminPasswordResetOtpEmail = async ({
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
    subject: "Journal of FST Admin Password Reset OTP",
    textContent: `Hello ${safeName}, your Journal of FST Admin password reset OTP is ${otp}. This code will expire in ${expiryMinutes} minutes. If you did not request a password reset, please ignore this email.`,
    htmlContent: buildOtpEmailHtml({
      name: safeName,
      otp,
      expiryMinutes,
      heading: "Password Reset Verification",
      intro: "Use the following OTP to verify your request and reset your admin password.",
      warning: "If you did not request a password reset, please ignore this email and keep your existing password unchanged.",
    }),
  });
};
