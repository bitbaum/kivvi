import { z } from "zod";

export const nextcloudIntegrationSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "Nextcloud URL must use HTTPS.",
    }),
  username: z.string().trim().min(1, "Username is required."),
  appPassword: z.string().min(1, "App password is required."),
  folderPath: z
    .string()
    .trim()
    .default("/Kivvi")
    .transform((value) => normalizeFolderPath(value || "/Kivvi")),
  enabled: z.boolean().default(true),
});

export const mailIntegrationSchema = z.object({
  host: z.string().trim().min(1, "IMAP host is required."),
  port: z.coerce.number().int().min(1).max(65535).default(993),
  username: z.string().trim().min(1, "Mailbox username is required."),
  password: z.string().min(1, "Mailbox password is required."),
  mailbox: z.string().trim().default("INBOX"),
  useTls: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export type NextcloudIntegrationInput = z.infer<
  typeof nextcloudIntegrationSchema
>;
export type MailIntegrationInput = z.infer<typeof mailIntegrationSchema>;

export type StoredNextcloudIntegration = Partial<
  Omit<NextcloudIntegrationInput, "appPassword">
> & {
  appPassword?: string;
  lastTestedAt?: string;
  lastStatus?: "ok" | "error";
  lastError?: string;
};

export type StoredMailIntegration = Partial<
  Omit<MailIntegrationInput, "password">
> & {
  password?: string;
  lastTestedAt?: string;
  lastStatus?: "ok" | "error";
  lastError?: string;
};

export function normalizeFolderPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/Kivvi";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function maskSecret(secret?: string): string {
  if (!secret) return "";
  return "••••••••";
}

export function mergeNextcloudIntegration(
  existing: StoredNextcloudIntegration | undefined,
  input: NextcloudIntegrationInput,
): StoredNextcloudIntegration {
  return {
    ...existing,
    ...input,
    appPassword:
      input.appPassword === maskSecret(existing?.appPassword)
        ? existing?.appPassword
        : input.appPassword,
    folderPath: normalizeFolderPath(input.folderPath),
    lastError: undefined,
  };
}

export function mergeMailIntegration(
  existing: StoredMailIntegration | undefined,
  input: MailIntegrationInput,
): StoredMailIntegration {
  return {
    ...existing,
    ...input,
    password:
      input.password === maskSecret(existing?.password)
        ? existing?.password
        : input.password,
    lastError: undefined,
  };
}

export function summarizeIntegrationStatus(
  integration:
    | { enabled?: boolean; lastStatus?: "ok" | "error"; lastError?: string }
    | undefined,
): "not_configured" | "disabled" | "ok" | "error" | "untested" {
  if (!integration) return "not_configured";
  if (!integration.enabled) return "disabled";
  if (integration.lastStatus === "ok") return "ok";
  if (integration.lastStatus === "error") return "error";
  return "untested";
}
