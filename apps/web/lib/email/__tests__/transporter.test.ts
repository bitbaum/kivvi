/**
 * The SMTP fallback in `getTransporter()` is a bare `nodemailer.createTransport`
 * cast to `MailTransport`. Nothing type-checks that cast against a nodemailer
 * major, so a release that changed `sendMail`/`verify` would fail only in
 * production, the next time Resend is unconfigured.
 *
 * These tests drive the real nodemailer SMTP client against a minimal SMTP
 * server on 127.0.0.1. They pin what the call sites rely on: `verify()`
 * resolves, and `sendMail()` performs AUTH and delivers the envelope, headers
 * and an attachment, then resolves with a messageId.
 */
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@bitbaum/mail-kit", () => ({
  isMailConfigured: () => false,
  sendMail: vi.fn(),
  mailHealth: vi.fn(),
  fromAddress: () => undefined,
  conventionalFrom: (name: string) => `${name.toLowerCase()}@example.invalid`,
}));

interface Received {
  auth: string[];
  mailFrom: string[];
  rcptTo: string[];
  data: string[];
}

const received: Received = { auth: [], mailFrom: [], rcptTo: [], data: [] };

/** Just enough RFC 5321 for nodemailer's client: EHLO, AUTH PLAIN, MAIL, RCPT, DATA, RSET, QUIT. */
function startSmtpServer(): Promise<net.Server> {
  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let message = "";
    socket.write("220 localhost test SMTP\r\n");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (inData) {
        const end = buffer.indexOf("\r\n.\r\n");
        if (end === -1) return;
        message += buffer.slice(0, end);
        buffer = buffer.slice(end + 5);
        inData = false;
        received.data.push(message);
        message = "";
        socket.write("250 2.0.0 queued as TEST\r\n");
      }
      let newline: number;
      while (!inData && (newline = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        const verb = line.split(" ")[0]?.toUpperCase();
        if (verb === "EHLO" || verb === "HELO") {
          socket.write("250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
        } else if (verb === "AUTH") {
          received.auth.push(line);
          socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (verb === "MAIL") {
          received.mailFrom.push(line);
          socket.write("250 2.1.0 OK\r\n");
        } else if (verb === "RCPT") {
          received.rcptTo.push(line);
          socket.write("250 2.1.5 OK\r\n");
        } else if (verb === "DATA") {
          inData = true;
          // nodemailer waits for 354 before writing the body, so it arrives in a later chunk.
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (verb === "RSET" || verb === "NOOP") {
          socket.write("250 OK\r\n");
        } else if (verb === "QUIT") {
          socket.end("221 Bye\r\n");
        } else if (line.length > 0) {
          socket.write("502 Command not implemented\r\n");
        }
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

let server: net.Server;

beforeAll(async () => {
  server = await startSmtpServer();
  const { port } = server.address() as net.AddressInfo;
  process.env.EMAIL_HOST = "127.0.0.1";
  process.env.EMAIL_PORT = String(port);
  process.env.EMAIL_SECURE = "false";
  process.env.EMAIL_USER = "smtp-user";
  process.env.EMAIL_PASS = "smtp-pass";
  process.env.EMAIL_FROM = "sender@example.invalid";
  vi.resetModules();
});

afterAll(async () => {
  for (const key of [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_SECURE",
    "EMAIL_USER",
    "EMAIL_PASS",
    "EMAIL_FROM",
  ]) {
    delete process.env[key];
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("getTransporter (SMTP fallback)", () => {
  it("verifies the connection", async () => {
    const { testEmailConfig } = await import("../transporter");
    await expect(testEmailConfig()).resolves.toEqual({ success: true });
    expect(received.auth.at(-1)).toMatch(/^AUTH PLAIN /);
  });

  it("sends a message with cc, reply-to and an attachment", async () => {
    const { getTransporter, getFromEmail } = await import("../transporter");
    expect(getFromEmail()).toBe("sender@example.invalid");

    const info = await getTransporter().sendMail({
      from: `"Kivvi" <${getFromEmail()}>`,
      to: "customer@example.invalid",
      cc: "accounting@example.invalid",
      replyTo: "support@example.invalid",
      subject: "Rechnung RE-2026-0001",
      html: "<p>Guten Tag</p>",
      text: "Guten Tag",
      attachments: [
        {
          filename: "RE-2026-0001.pdf",
          content: Buffer.from("%PDF-1.4"),
          contentType: "application/pdf",
        },
      ],
    });

    expect(info.messageId).toMatch(/^<.+@.+>$/);
    expect(received.mailFrom.at(-1)).toContain("<sender@example.invalid>");
    expect(received.rcptTo).toEqual(
      expect.arrayContaining([
        expect.stringContaining("<customer@example.invalid>"),
        expect.stringContaining("<accounting@example.invalid>"),
      ]),
    );
    const raw = received.data.at(-1) ?? "";
    expect(raw).toContain("Subject: Rechnung RE-2026-0001");
    expect(raw).toContain("Reply-To: support@example.invalid");
    expect(raw).toContain("Cc: accounting@example.invalid");
    expect(raw).toMatch(/filename="?RE-2026-0001\.pdf"?/);
    expect(raw).toContain(Buffer.from("%PDF-1.4").toString("base64"));
  });
});
