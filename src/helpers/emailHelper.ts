import config from "../config/index.js" ;
import nodemailer from "nodemailer";

export type ISendEmail = {
  to: string;
  subject: string;
  html: string;
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
  connectionTimeout: 8000, // 8s max connection timeout
  greetingTimeout: 5000,   // 5s max greeting timeout
  socketTimeout: 10000,    // 10s max socket timeout
  logger: false,
  debug: false,
});

const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: config.email.from || config.email.user,
      to: values.to,
      subject: values.subject,
      html: values.html,
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
