import { describe, expect, it } from "vitest";
import {
  mailIntegrationSchema,
  maskSecret,
  mergeMailIntegration,
  mergeNextcloudIntegration,
  nextcloudIntegrationSchema,
  normalizeFolderPath,
  summarizeIntegrationStatus,
} from "../domain/integrations";

describe("integration settings", () => {
  it("requires HTTPS for Nextcloud", () => {
    expect(
      nextcloudIntegrationSchema.safeParse({
        baseUrl: "http://cloud.example.ch",
        username: "user",
        appPassword: "secret",
        folderPath: "/Kivvi",
        enabled: true,
      }).success,
    ).toBe(false);
  });

  it("normalizes Nextcloud folder paths", () => {
    expect(normalizeFolderPath("Kivvi/Customers/")).toBe("/Kivvi/Customers");
    expect(normalizeFolderPath("/")).toBe("/Kivvi");
  });

  it("preserves existing masked Nextcloud secret", () => {
    const merged = mergeNextcloudIntegration(
      {
        baseUrl: "https://cloud.example.ch",
        username: "revamp",
        appPassword: "existing-secret",
        folderPath: "/Kivvi",
        enabled: true,
      },
      {
        baseUrl: "https://cloud.example.ch",
        username: "revamp",
        appPassword: maskSecret("existing-secret"),
        folderPath: "Files",
        enabled: true,
      },
    );

    expect(merged.appPassword).toBe("existing-secret");
    expect(merged.folderPath).toBe("/Files");
  });

  it("validates IMAP ports", () => {
    expect(
      mailIntegrationSchema.safeParse({
        host: "imap.example.ch",
        port: 993,
        username: "mail@example.ch",
        password: "secret",
        mailbox: "INBOX",
        useTls: true,
        enabled: true,
      }).success,
    ).toBe(true);

    expect(
      mailIntegrationSchema.safeParse({
        host: "imap.example.ch",
        port: 70000,
        username: "mail@example.ch",
        password: "secret",
      }).success,
    ).toBe(false);
  });

  it("preserves existing masked mailbox password", () => {
    const merged = mergeMailIntegration(
      {
        host: "imap.example.ch",
        port: 993,
        username: "mail@example.ch",
        password: "existing-secret",
        mailbox: "INBOX",
        useTls: true,
        enabled: true,
      },
      {
        host: "imap.example.ch",
        port: 993,
        username: "mail@example.ch",
        password: maskSecret("existing-secret"),
        mailbox: "Requests",
        useTls: true,
        enabled: true,
      },
    );

    expect(merged.password).toBe("existing-secret");
    expect(merged.mailbox).toBe("Requests");
  });

  it("summarizes connector state", () => {
    expect(summarizeIntegrationStatus(undefined)).toBe("not_configured");
    expect(summarizeIntegrationStatus({ enabled: false })).toBe("disabled");
    expect(summarizeIntegrationStatus({ enabled: true })).toBe("untested");
    expect(
      summarizeIntegrationStatus({ enabled: true, lastStatus: "ok" }),
    ).toBe("ok");
    expect(
      summarizeIntegrationStatus({ enabled: true, lastStatus: "error" }),
    ).toBe("error");
  });
});
