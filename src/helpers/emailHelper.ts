import dns from "node:dns";
import config from "../config/index.js";
import nodemailer from "nodemailer";

// Prevent ENETUNREACH on systems where IPv6 routes are unavailable or blocked
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

export type ISendEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const isGmail =
  config.email.host?.includes("gmail.com") ||
  config.email.user?.includes("@gmail.com");
const port = Number(config.email.port) || 587;

const transporter = nodemailer.createTransport({
  ...(isGmail
    ? { service: "gmail" }
    : {
        host: config.email.host,
        port,
        secure: port === 465,
      }),
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 8000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  logger: false,
  debug: false,
});

// Helper to convert basic HTML to clean plain text fallback
const stripHtmlToPlainText = (html: string): string => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const sendEmail = async (values: ISendEmail) => {
  try {
    const rawFrom = config.email.from || config.email.user || "shabbosrent@gmail.com";
    const formattedFrom = rawFrom.includes("<")
      ? rawFrom
      : `"Shabbos Rent" <${rawFrom}>`;

    const plainText = values.text || stripHtmlToPlainText(values.html);

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: values.to,
      replyTo: config.email.user || "shabbosrent@gmail.com",
      subject: values.subject,
      text: plainText,
      html: values.html,
      headers: {
        "X-Mailer": "Shabbos Rent Platform",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });
    return info;
  } catch (error: any) {
    console.error("[Email] Sending error:", error?.message || error);
    throw error;
  }
};

export const emailHelper = {
  sendEmail,
};
