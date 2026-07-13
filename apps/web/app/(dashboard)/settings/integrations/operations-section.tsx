"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  testMailIntegrationAction,
  testNextcloudIntegrationAction,
  syncMailIntegrationAction,
  syncNextcloudIntegrationAction,
  testTalerIntegrationAction,
  updateMailIntegrationAction,
  updateNextcloudIntegrationAction,
  updateTalerIntegrationAction,
} from "@/app/actions/integrations";
import type {
  MailIntegrationInput,
  NextcloudIntegrationInput,
  TalerIntegrationInput,
} from "@kivvi/core/src/domain/integrations";

type Status = "not_configured" | "disabled" | "ok" | "error" | "untested";

interface OperationsSectionProps {
  nextcloud: Partial<NextcloudIntegrationInput> & {
    lastStatus?: "ok" | "error";
    lastError?: string;
    lastTestedAt?: string;
  };
  nextcloudStatus: Status;
  mail: Partial<MailIntegrationInput> & {
    lastStatus?: "ok" | "error";
    lastError?: string;
    lastTestedAt?: string;
  };
  mailStatus: Status;
  taler: Partial<TalerIntegrationInput> & {
    lastStatus?: "ok" | "error";
    lastError?: string;
    lastTestedAt?: string;
  };
  talerStatus: Status;
}

function statusClass(status: Status) {
  if (status === "ok") return "text-success";
  if (status === "error") return "text-destructive";
  if (status === "disabled") return "text-muted-foreground";
  return "text-warning";
}

export function OperationsSection({
  nextcloud,
  nextcloudStatus,
  mail,
  mailStatus,
  taler,
  talerStatus,
}: OperationsSectionProps) {
  const t = useTranslations("settings.integrations.operations");
  const tCommon = useTranslations("common");
  const [nextcloudForm, setNextcloudForm] = useState<NextcloudIntegrationInput>(
    {
      baseUrl: nextcloud.baseUrl || "",
      username: nextcloud.username || "",
      appPassword: nextcloud.appPassword || "",
      folderPath: nextcloud.folderPath || "/Kivvi",
      enabled: nextcloud.enabled ?? true,
    },
  );
  const [mailForm, setMailForm] = useState<MailIntegrationInput>({
    host: mail.host || "",
    port: mail.port || 993,
    username: mail.username || "",
    password: mail.password || "",
    mailbox: mail.mailbox || "INBOX",
    useTls: mail.useTls ?? true,
    enabled: mail.enabled ?? true,
  });
  const [talerForm, setTalerForm] = useState<TalerIntegrationInput>({
    merchantBackendUrl: taler.merchantBackendUrl || "",
    instance: taler.instance || "admin",
    accessToken: taler.accessToken || "",
    enabled: taler.enabled ?? true,
  });
  const [nextcloudMessage, setNextcloudMessage] = useState<string | null>(null);
  const [mailMessage, setMailMessage] = useState<string | null>(null);
  const [talerMessage, setTalerMessage] = useState<string | null>(null);
  const [nextcloudConfigured, setNextcloudConfigured] = useState(
    nextcloudStatus !== "not_configured",
  );
  const [mailConfigured, setMailConfigured] = useState(
    mailStatus !== "not_configured",
  );
  const [talerConfigured, setTalerConfigured] = useState(
    talerStatus !== "not_configured",
  );
  const [isSavingNextcloud, saveNextcloudTransition] = useTransition();
  const [isTestingNextcloud, testNextcloudTransition] = useTransition();
  const [isSyncingNextcloud, syncNextcloudTransition] = useTransition();
  const [isSavingMail, saveMailTransition] = useTransition();
  const [isTestingMail, testMailTransition] = useTransition();
  const [isSyncingMail, syncMailTransition] = useTransition();
  const [isSavingTaler, saveTalerTransition] = useTransition();
  const [isTestingTaler, testTalerTransition] = useTransition();

  function saveNextcloud() {
    setNextcloudMessage(null);
    saveNextcloudTransition(async () => {
      const result = await updateNextcloudIntegrationAction(nextcloudForm);
      if (result.success) setNextcloudConfigured(true);
      setNextcloudMessage(
        result.success ? t("saved") : result.error || t("saveFailed"),
      );
    });
  }

  function testNextcloud() {
    setNextcloudMessage(null);
    testNextcloudTransition(async () => {
      const result = await testNextcloudIntegrationAction();
      setNextcloudMessage(
        result.success
          ? t("connectionOk")
          : result.error || t("connectionFailed"),
      );
    });
  }

  function syncNextcloud() {
    setNextcloudMessage(null);
    syncNextcloudTransition(async () => {
      const result = await syncNextcloudIntegrationAction();
      setNextcloudMessage(
        result.success
          ? t("syncImported", { count: result.data?.imported ?? 0 })
          : result.error || t("syncFailed"),
      );
    });
  }

  function saveMail() {
    setMailMessage(null);
    saveMailTransition(async () => {
      const result = await updateMailIntegrationAction(mailForm);
      if (result.success) setMailConfigured(true);
      setMailMessage(
        result.success ? t("saved") : result.error || t("saveFailed"),
      );
    });
  }

  function testMail() {
    setMailMessage(null);
    testMailTransition(async () => {
      const result = await testMailIntegrationAction();
      setMailMessage(
        result.success
          ? t("connectionOk")
          : result.error || t("connectionFailed"),
      );
    });
  }

  function syncMail() {
    setMailMessage(null);
    syncMailTransition(async () => {
      const result = await syncMailIntegrationAction();
      setMailMessage(
        result.success
          ? t("syncImported", { count: result.data?.imported ?? 0 })
          : result.error || t("syncFailed"),
      );
    });
  }

  function saveTaler() {
    setTalerMessage(null);
    saveTalerTransition(async () => {
      const result = await updateTalerIntegrationAction(talerForm);
      if (result.success) setTalerConfigured(true);
      setTalerMessage(
        result.success ? t("saved") : result.error || t("saveFailed"),
      );
    });
  }

  function testTaler() {
    setTalerMessage(null);
    testTalerTransition(async () => {
      const result = await testTalerIntegrationAction();
      setTalerMessage(
        result.success
          ? t("connectionOk")
          : result.error || t("connectionFailed"),
      );
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">{t("nextcloudTitle")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("nextcloudDescription")}
            </p>
          </div>
          <span
            className={`text-sm font-medium ${statusClass(nextcloudStatus)}`}
          >
            {t(`status.${nextcloudStatus}`)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("baseUrl")}</span>
            <input
              value={nextcloudForm.baseUrl}
              onChange={(event) =>
                setNextcloudForm((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              placeholder="https://cloud.example.ch"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("username")}</span>
            <input
              value={nextcloudForm.username}
              onChange={(event) =>
                setNextcloudForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("appPassword")}</span>
            <input
              type="password"
              value={nextcloudForm.appPassword}
              onChange={(event) =>
                setNextcloudForm((current) => ({
                  ...current,
                  appPassword: event.target.value,
                }))
              }
              onFocus={() => {
                if (nextcloudForm.appPassword === "••••••••") {
                  setNextcloudForm((current) => ({
                    ...current,
                    appPassword: "",
                  }));
                }
              }}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("folderPath")}</span>
            <input
              value={nextcloudForm.folderPath}
              onChange={(event) =>
                setNextcloudForm((current) => ({
                  ...current,
                  folderPath: event.target.value,
                }))
              }
              placeholder="/Kivvi"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nextcloudForm.enabled}
            onChange={(event) =>
              setNextcloudForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          {t("enabled")}
        </label>

        {(nextcloud.lastError || nextcloudMessage) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {nextcloudMessage || nextcloud.lastError}
          </p>
        )}
        {!nextcloudConfigured && !nextcloudMessage && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("saveBeforeTesting")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveNextcloud} disabled={isSavingNextcloud}>
            {isSavingNextcloud ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSavingNextcloud ? tCommon("saving") : tCommon("save")}
          </Button>
          {nextcloudConfigured && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={testNextcloud}
                disabled={isTestingNextcloud}
              >
                {isTestingNextcloud && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("testConnection")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={syncNextcloud}
                disabled={isSyncingNextcloud}
              >
                {isSyncingNextcloud && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("scanNow")}
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">{t("talerTitle")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("talerDescription")}
            </p>
          </div>
          <span className={`text-sm font-medium ${statusClass(talerStatus)}`}>
            {t(`status.${talerStatus}`)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">{t("talerBackendUrl")}</span>
            <input
              value={talerForm.merchantBackendUrl}
              onChange={(event) =>
                setTalerForm((current) => ({
                  ...current,
                  merchantBackendUrl: event.target.value,
                }))
              }
              placeholder="https://merchant.example.ch"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("talerInstance")}</span>
            <input
              value={talerForm.instance}
              onChange={(event) =>
                setTalerForm((current) => ({
                  ...current,
                  instance: event.target.value,
                }))
              }
              placeholder="admin"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("talerAccessToken")}</span>
            <input
              type="password"
              value={talerForm.accessToken}
              onChange={(event) =>
                setTalerForm((current) => ({
                  ...current,
                  accessToken: event.target.value,
                }))
              }
              onFocus={() => {
                if (talerForm.accessToken === "••••••••") {
                  setTalerForm((current) => ({ ...current, accessToken: "" }));
                }
              }}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={talerForm.enabled}
            onChange={(event) =>
              setTalerForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          {t("enabled")}
        </label>

        {(taler.lastError || talerMessage) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {talerMessage || taler.lastError}
          </p>
        )}
        {!talerConfigured && !talerMessage && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("talerTokenHint")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveTaler} disabled={isSavingTaler}>
            {isSavingTaler ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSavingTaler ? tCommon("saving") : tCommon("save")}
          </Button>
          {talerConfigured && (
            <Button
              type="button"
              variant="secondary"
              onClick={testTaler}
              disabled={isTestingTaler}
            >
              {isTestingTaler && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("testConnection")}
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">{t("mailTitle")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("mailDescription")}
            </p>
          </div>
          <span className={`text-sm font-medium ${statusClass(mailStatus)}`}>
            {t(`status.${mailStatus}`)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("imapHost")}</span>
            <input
              value={mailForm.host}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  host: event.target.value,
                }))
              }
              placeholder="imap.example.ch"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("port")}</span>
            <input
              type="number"
              value={mailForm.port}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  port: Number(event.target.value),
                }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("username")}</span>
            <input
              value={mailForm.username}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("password")}</span>
            <input
              type="password"
              value={mailForm.password}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              onFocus={() => {
                if (mailForm.password === "••••••••") {
                  setMailForm((current) => ({ ...current, password: "" }));
                }
              }}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("mailbox")}</span>
            <input
              value={mailForm.mailbox}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  mailbox: event.target.value,
                }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mailForm.useTls}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  useTls: event.target.checked,
                }))
              }
            />
            {t("useTls")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mailForm.enabled}
              onChange={(event) =>
                setMailForm((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
            />
            {t("enabled")}
          </label>
        </div>

        {(mail.lastError || mailMessage) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {mailMessage || mail.lastError}
          </p>
        )}
        {!mailConfigured && !mailMessage && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("saveBeforeTesting")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveMail} disabled={isSavingMail}>
            {isSavingMail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSavingMail ? tCommon("saving") : tCommon("save")}
          </Button>
          {mailConfigured && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={testMail}
                disabled={isTestingMail}
              >
                {isTestingMail && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("testConnection")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={syncMail}
                disabled={isSyncingMail}
              >
                {isSyncingMail && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("scanNow")}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
