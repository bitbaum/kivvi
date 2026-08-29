import { describe, expect, it } from "vitest";
import {
  mailIntegrationSchema,
  maskSecret,
  mergeMailIntegration,
  mergeNextcloudIntegration,
  mergeTalerIntegration,
  nextcloudIntegrationSchema,
  normalizeFolderPath,
  summarizeIntegrationStatus,
  talerIntegrationSchema,
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
    expect(summarizeIntegrationStatus({ enabled: true, lastStatus: "ok" })).toBe("ok");
    expect(summarizeIntegrationStatus({ enabled: true, lastStatus: "error" })).toBe("error");
  });

  it("requires HTTPS and a token for GNU Taler", () => {
    expect(
      talerIntegrationSchema.safeParse({
        merchantBackendUrl: "http://merchant.example.ch",
        instance: "revamp",
        accessToken: "secret",
        enabled: true,
      }).success,
    ).toBe(false);

    expect(
      talerIntegrationSchema.safeParse({
        merchantBackendUrl: "https://merchant.example.ch/",
        instance: "revamp",
        accessToken: "secret",
        enabled: true,
      }).success,
    ).toBe(true);
  });

  it("preserves existing masked GNU Taler token", () => {
    const merged = mergeTalerIntegration(
      {
        merchantBackendUrl: "https://merchant.example.ch",
        instance: "revamp",
        accessToken: "existing-secret",
        enabled: true,
      },
      {
        merchantBackendUrl: "https://merchant.example.ch/",
        instance: "revamp",
        accessToken: maskSecret("existing-secret"),
        enabled: false,
      },
    );

    expect(merged.accessToken).toBe("existing-secret");
    expect(merged.merchantBackendUrl).toBe("https://merchant.example.ch");
    expect(merged.enabled).toBe(false);
  });
});
