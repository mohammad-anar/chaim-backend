import config from "../../config/index.js";
import { IContact, ICreateAccount, IResetPassword, IWorkshopContact } from "../../types/emailTamplate.js";

const PRIMARY_COLOR = "#4C55A4";

const baseTemplate = (content: string) => `
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0; background-color:#f4f6f8;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:580px; background:#ffffff; border-radius:12px;
          padding:36px 32px; box-shadow:0 4px 20px rgba(0,0,0,0.06); border:1px solid #eaeaea;">

          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <h1 style="margin:0; font-size:22px; color:${PRIMARY_COLOR}; font-weight:700; letter-spacing: 0.5px;">
                Shabbos Rent
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td>
              <hr style="border:none; border-top:1px solid #eef0f5; margin:16px 0 24px 0;">
            </td>
          </tr>

          <!-- Dynamic Content -->
          <tr>
            <td>
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <hr style="border:none; border-top:1px solid #eeeeee; margin-bottom:20px;">
              <p style="font-size:12px; color:#888888; line-height:1.6; margin:0; text-align:center;">
                If you have any questions or need assistance, contact our support team at <a href="mailto:shabbosrent@gmail.com" style="color:${PRIMARY_COLOR}; text-decoration:none;">shabbosrent@gmail.com</a>.
              </p>
              <p style="font-size:11px; color:#aaaaaa; margin-top:8px; text-align:center;">
                © ${new Date().getFullYear()} Shabbos Rent. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
`;

// ==========================
// 🔐 CREATE ACCOUNT TEMPLATE
// ==========================
const createAccount = (values: ICreateAccount) => {
  const content = `
    <h2 style="margin:0 0 16px 0; font-size:20px; color:#222; font-weight:700;">
      Welcome to Shabbos Rent, ${values.name}
    </h2>

    <p style="font-size:15px; line-height:1.6; color:#555; margin-bottom:20px;">
      Thank you for creating an account. Please use the verification code below to activate your account:
    </p>

    <div style="text-align:center; margin:24px 0;">
      <span style="
        display:inline-block;
        background:${PRIMARY_COLOR};
        color:#ffffff;
        padding:12px 28px;
        border-radius:8px;
        font-size:24px;
        letter-spacing:4px;
        font-weight:700;
        box-shadow: 0 4px 12px ${PRIMARY_COLOR}33;">
        ${values.otp}
      </span>
    </div>

    <p style="font-size:13px; color:#777; margin-top:12px; text-align:center;">
      This verification code is valid for <strong>5 minutes</strong>.
    </p>

    <p style="font-size:12px; color:#999; margin-top:20px;">
      If you did not request this account, you can safely ignore this email.
    </p>
  `;

  return {
    to: values.email,
    subject: "Verify Your Shabbos Rent Account",
    html: baseTemplate(content),
  };
};

// ==========================
// 🔁 RESET PASSWORD (OTP)
// ==========================
const resetPassword = (values: IResetPassword) => {
  const content = `
    <h2 style="margin:0 0 16px 0; font-size:20px; color:#222; font-weight:700;">
      Password Reset Code
    </h2>

    <p style="font-size:15px; line-height:1.6; color:#555; margin-bottom:20px;">
      Use the single-use code below to reset your Shabbos Rent password:
    </p>

    <div style="text-align:center; margin:24px 0;">
      <span style="
        display:inline-block;
        background:${PRIMARY_COLOR};
        color:#ffffff;
        padding:12px 28px;
        border-radius:8px;
        font-size:24px;
        letter-spacing:4px;
        font-weight:700;
        box-shadow: 0 4px 12px ${PRIMARY_COLOR}33;">
        ${values.otp}
      </span>
    </div>

    <p style="font-size:13px; color:#777; margin-top:12px; text-align:center;">
      This code is valid for <strong>15 minutes</strong>.
    </p>

    <p style="font-size:12px; color:#999; margin-top:20px;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `;

  return {
    to: values.email,
    subject: "Your Password Reset Code - Shabbos Rent",
    html: baseTemplate(content),
  };
};

// ==========================
// 🔗 FORGET PASSWORD (LINK)
// ==========================
const forgetPassword = (values: { email: string; token: string }) => {
  const baseUrl = config.frontend_url || "https://shabbos-rent-website.vercel.app";
  const resetUrl = `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(values.token)}`;

  const content = `
    <h2 style="margin:0 0 16px 0; font-size:20px; color:#222; font-weight:700;">
      Reset Your Password
    </h2>

    <p style="font-size:15px; line-height:1.6; color:#555; margin-bottom:20px;">
      We received a request to reset the password for your Shabbos Rent account. Click the button below to choose a new password:
    </p>

    <div style="text-align:center; margin:28px 0;">
      <a href="${resetUrl}"
         style="
           background:${PRIMARY_COLOR};
           color:#ffffff;
           text-decoration:none;
           padding:14px 32px;
           border-radius:8px;
           font-size:15px;
           font-weight:600;
           display:inline-block;
           box-shadow: 0 4px 12px ${PRIMARY_COLOR}44;">
         Reset Password
      </a>
    </div>

    <p style="font-size:13px; color:#777; line-height:1.6; margin-top:20px;">
      If the button above does not work, copy and paste this link into your browser:
      <br>
      <a href="${resetUrl}" style="color:${PRIMARY_COLOR}; word-break:break-all;">${resetUrl}</a>
    </p>

    <p style="font-size:12px; color:#888; margin-top:20px; border-top:1px solid #f0f0f0; padding-top:15px;">
      This link is valid for <strong>15 minutes</strong>. If you didn’t request a password reset, you can safely ignore this email.
    </p>
  `;

  return {
    to: values.email,
    subject: "Reset Your Password - Shabbos Rent",
    html: baseTemplate(content),
  };
};

const forgetPasswordWorkshop = (values: { email: string; token: string }) => {
  const baseUrl = config.frontend_url || "https://shabbos-rent-website.vercel.app";
  const resetUrl = `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(values.token)}`;

  const content = `
    <h2 style="margin:0 0 16px 0; font-size:20px; color:#222; font-weight:700;">
      Reset Your Password
    </h2>

    <p style="font-size:15px; line-height:1.6; color:#555; margin-bottom:20px;">
      Click the button below to securely reset your password for Shabbos Rent:
    </p>

    <div style="text-align:center; margin:28px 0;">
      <a href="${resetUrl}"
         style="
           background:${PRIMARY_COLOR};
           color:#ffffff;
           text-decoration:none;
           padding:14px 32px;
           border-radius:8px;
           font-size:15px;
           font-weight:600;
           display:inline-block;
           box-shadow: 0 4px 12px ${PRIMARY_COLOR}44;">
         Reset Password
      </a>
    </div>

    <p style="font-size:13px; color:#777; line-height:1.6; margin-top:20px;">
      Direct Link: <a href="${resetUrl}" style="color:${PRIMARY_COLOR}; word-break:break-all;">${resetUrl}</a>
    </p>

    <p style="font-size:12px; color:#888; margin-top:20px;">
      This link will expire in 15 minutes.
    </p>
  `;

  return {
    to: values.email,
    subject: "Reset Your Password - Shabbos Rent",
    html: baseTemplate(content),
  };
};

// ==========================
// 📧 CONTACT ADMIN TEMPLATE
// ==========================
const contactAdmin = (values: IContact) => {
  const content = `
    <h2 style="margin:0 0 20px 0; font-size:20px; color:#222;">
      New Contact Form Submission
    </h2>

    <div style="background:#f9f9f9; padding:20px; border-radius:8px; border-left:4px solid ${PRIMARY_COLOR};">
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Full Name:</strong> ${values.fullName}
      </p>
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Address:</strong> ${values.address}
      </p>
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Email:</strong> ${values.email}
      </p>
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Phone Number:</strong> ${values.phoneNumber}
      </p>
      <p style="margin:0; font-size:14px; color:#555;">
        <strong>Message:</strong><br>
        <span style="display:inline-block; margin-top:5px; line-height:1.6;">
          ${values.message}
        </span>
      </p>
    </div>

    <p style="font-size:13px; color:#999; margin-top:25px;">
      This email was sent from the Shabbos Rent website contact form.
    </p>
  `;

  return {
    to: config.email.user, // Sent to admin
    subject: `New Contact Message from ${values.fullName} - Shabbos Rent`,
    html: baseTemplate(content),
  };
};

// ==========================
// 📧 WORKSHOP CONTACT TEMPLATE
// ==========================
const workshopContactAdmin = (values: IWorkshopContact) => {
  const content = `
    <h2 style="margin:0 0 20px 0; font-size:20px; color:#222;">
      New Workshop Contact Submission
    </h2>

    <div style="background:#f9f9f9; padding:20px; border-radius:8px; border-left:4px solid ${PRIMARY_COLOR};">
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Company Name:</strong> ${values.companyName}
      </p>
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Full Name:</strong> ${values.fullName}
      </p>
      <p style="margin:0 0 10px 0; font-size:14px; color:#555;">
        <strong>Phone:</strong> ${values.phone}
      </p>
      <p style="margin:0; font-size:14px; color:#555;">
        <strong>Additional Information:</strong><br>
        <span style="display:inline-block; margin-top:5px; line-height:1.6;">
          ${values.additionalInfo || "N/A"}
        </span>
      </p>
    </div>

    <p style="font-size:13px; color:#999; margin-top:25px;">
      This email was sent from the Shabbos Rent workshop contact form.
    </p>
  `;

  return {
    to: config.email.user, // Sent to admin
    subject: `New Workshop Contact from ${values.companyName} - Shabbos Rent`,
    html: baseTemplate(content),
  };
};

export const emailTemplate = {
  createAccount,
  resetPassword,
  forgetPassword,
  forgetPasswordWorkshop,
  contactAdmin,
  workshopContactAdmin,
};
