import config from "../config/index.js" ;
import nodemailer from "nodemailer";

export type ISendEmail = {
  to: string;
  subject: string;
  html: string;
};

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
  debug: true,
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
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

export const emailHelper = {
  sendEmail,
};
