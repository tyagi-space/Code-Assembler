import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export async function sendEmail(payload: MailPayload): Promise<boolean> {
  const config = getMailerConfig();
  if (!config) {
    console.warn("SMTP config missing. Skipping email notification.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });

  return true;
}

export async function sendAdminDecisionEmail(params: {
  to: string;
  username: string;
  approved: boolean;
}) {
  const subject = params.approved
    ? "Admin Registration Approved"
    : "Admin Registration Rejected";
  const text = params.approved
    ? `Hi ${params.username}, your admin registration request has been approved. You can now log in as admin.`
    : `Hi ${params.username}, your admin registration request was rejected by an administrator.`;

  return sendEmail({ to: params.to, subject, text });
}
