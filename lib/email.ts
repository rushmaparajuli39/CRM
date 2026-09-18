import nodemailer from "nodemailer";

// A separate credential from Supabase's own Auth SMTP settings — those
// only govern Supabase Auth's own emails (password resets, invites), not
// anything this app sends itself. Reuses the same Gmail account + App
// Password by convention, but that's just what's in the env vars below,
// not a hard dependency on Gmail specifically.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !pass) {
    throw new Error(
      "Email isn't configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string | string[];
  subject: string;
  text: string;
}) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
  });
}
