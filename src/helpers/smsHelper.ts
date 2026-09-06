import twilio from "twilio";
import config from "../config/index.js";

const getClient = () => {
  const sid = config.twilio.account_sid;
  const token = config.twilio.auth_token;
  if (!sid || !token) {
    throw new Error("Twilio credentials are not configured");
  }
  return twilio(sid, token);
};

interface ISendSmsPayload {
  to: string; // E.164 format, e.g. "+972501234567"
  body: string;
}

const sendSms = async (payload: ISendSmsPayload): Promise<void> => {
  const from = config.twilio.phone_number;
  if (!from) {
    throw new Error("Twilio sender phone number is not configured");
  }

  const client = getClient();
  await client.messages.create({
    to: payload.to,
    from,
    body: payload.body,
  });
};

export const smsHelper = {
  sendSms,
};
