import { prisma } from "../../../helpers/prisma.js";
import { emailQueue, isQueueAvailable } from "../../../helpers/bullQueue.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import config from "../../../config/index.js";
import { ICreateContact } from "./contact.interface.js";

const createContact = async (payload: ICreateContact) => {
  const result = await prisma.contact.create({
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      subject: payload.subject,
      message: payload.message,
    },
  });

  const sendDirectAdminEmail = () => {
    const adminEmail = config.admin.email || config.email.user || "admin@example.com";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>New Contact Us Submission</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Phone:</strong> ${payload.phone || "N/A"}</p>
        <p><strong>Subject:</strong> ${payload.subject || "No Subject"}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
          ${payload.message}
        </div>
      </div>
    `;
    emailHelper
      .sendEmail({
        to: adminEmail,
        subject: `[Contact Us] ${payload.subject || "New Message"} from ${payload.name}`,
        html,
      })
      .catch((err) => console.error("Direct fallback email send error:", err));
  };

  if (isQueueAvailable() && emailQueue) {
    try {
      await emailQueue.add("sendContactAdminEmail", payload);
    } catch (queueErr) {
      sendDirectAdminEmail();
    }
  } else {
    sendDirectAdminEmail();
  }

  return result;
};

const getAllContacts = async () => {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
  });
  return contacts;
};

export const ContactServices = {
  createContact,
  getAllContacts,
};
