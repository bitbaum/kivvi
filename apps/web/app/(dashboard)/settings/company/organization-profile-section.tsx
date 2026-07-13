"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import {
  acceptJoinRequestAction,
  createVacancyAction,
  saveOrganizationProfileAction,
  updateJoinRequestStatusAction,
  updateVacancyStatusAction,
} from "@/app/actions/participation";
import { cn } from "@/lib/utils";
import type { OrganizationProfile, Vacancy } from "@kivvi/database";
import { CopyButton } from "@/components/copy-button";

interface Props {
  companyName: string;
  initialProfile: OrganizationProfile | null;
  vacancies: Vacancy[];
  joinRequests: Array<{
    id: string;
    status: "pending" | "accepted" | "declined" | "withdrawn";
    message: string | null;
    createdAt: Date;
    userName: string | null;
    userEmail: string;
    vacancyTitle: string | null;
  }>;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function OrganizationProfileSection({
  companyName,
  initialProfile,
  vacancies,
  joinRequests,
}: Props) {
  const t = useTranslations("settings.organizationProfile");
  const tv = useTranslations("settings.vacancies");
  const tj = useTranslations("settings.joinRequests");
  const tc = useTranslations("common");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [slug, setSlug] = useState(
    initialProfile?.publicSlug ?? toSlug(companyName),
  );

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    setSuccess("");
    setLatestInviteUrl("");
    startTransition(async () => {
      const result = await saveOrganizationProfileAction({
        publicSlug: slug,
        publicName: formData.get("publicName"),
        shortDescription: formData.get("shortDescription") || null,
        category: formData.get("category") || null,
        location: formData.get("location") || null,
        website: formData.get("website") || null,
        isPublic: formData.get("isPublic") === "on",
        acceptingApplications: formData.get("acceptingApplications") === "on",
      });
      if (result.success) {
        setSuccess(t("saved"));
      } else {
        setError(result.error || t("saveError"));
      }
    });
  }

  function handleVacancySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError("");
    setSuccess("");
    setLatestInviteUrl("");
    startTransition(async () => {
      const result = await createVacancyAction({
        title: formData.get("title"),
        type: formData.get("type"),
        locationMode: formData.get("locationMode"),
        workload: formData.get("workload") || null,
        skills: parseTags(formData.get("skills")),
        status: formData.get("status"),
      });
      if (result.success) {
        setSuccess(tv("saved"));
        form.reset();
      } else {
        setError(result.error || tv("saveError"));
      }
    });
  }

  function handleStatus(
    vacancyId: string,
    status: "draft" | "published" | "closed",
  ) {
    setError("");
    setSuccess("");
    setLatestInviteUrl("");
    startTransition(async () => {
      const result = await updateVacancyStatusAction({ vacancyId, status });
      if (result.success) {
        setSuccess(tv("statusSaved"));
      } else {
        setError(result.error || tv("statusError"));
      }
    });
  }

  function handleAcceptRequest(requestId: string) {
    setError("");
    setSuccess("");
    setLatestInviteUrl("");
    startTransition(async () => {
      const result = await acceptJoinRequestAction({ requestId });
      if (result.success) {
        setSuccess(tj("accepted"));
        setLatestInviteUrl(result.data?.inviteUrl ?? "");
      } else {
        setError(result.error || tj("acceptError"));
      }
    });
  }

  function handleDeclineRequest(requestId: string) {
    setError("");
    setSuccess("");
    setLatestInviteUrl("");
    startTransition(async () => {
      const result = await updateJoinRequestStatusAction({
        requestId,
        status: "declined",
      });
      if (result.success) {
        setSuccess(tj("declined"));
      } else {
        setError(result.error || tj("statusError"));
      }
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-card">
        <div className="flex items-start gap-3 border-b p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("desc")}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5 p-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-success/5 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p>{success}</p>
                {latestInviteUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-success/20 bg-background px-2 py-1 text-foreground">
                    <span className="truncate text-xs">{latestInviteUrl}</span>
                    <CopyButton
                      value={latestInviteUrl}
                      label={tj("copyInviteLink")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              {t("publicName")}
              <FormInput
                name="publicName"
                defaultValue={initialProfile?.publicName ?? companyName}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              {t("publicSlug")}
              <FormInput
                name="publicSlug"
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              {t("category")}
              <FormInput
                name="category"
                defaultValue={initialProfile?.category ?? ""}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              {t("location")}
              <FormInput
                name="location"
                defaultValue={initialProfile?.location ?? ""}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              {t("website")}
              <FormInput
                name="website"
                type="url"
                defaultValue={initialProfile?.website ?? ""}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              {t("shortDescription")}
              <FormTextarea
                name="shortDescription"
                defaultValue={initialProfile?.shortDescription ?? ""}
                maxLength={500}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                name="isPublic"
                defaultChecked={initialProfile?.isPublic ?? false}
              />
              {t("isPublic")}
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                name="acceptingApplications"
                defaultChecked={initialProfile?.acceptingApplications ?? false}
              />
              {t("acceptingApplications")}
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("saveChanges")}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">{tv("title")}</h2>
          <p className="text-sm text-muted-foreground">{tv("desc")}</p>
        </div>
        <div className="divide-y">
          {vacancies.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{tv("empty")}</p>
          ) : (
            vacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{vacancy.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tv(`type.${vacancy.type}`)} ·{" "}
                    {tv(`locationMode.${vacancy.locationMode}`)} ·{" "}
                    {tv(`status.${vacancy.status}`)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["draft", "published", "closed"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatus(vacancy.id, status)}
                      disabled={isPending || vacancy.status === status}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50",
                        vacancy.status === status && "bg-muted",
                      )}
                    >
                      {tv(`status.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={handleVacancySubmit}
          className="grid gap-4 border-t p-5 sm:grid-cols-2"
        >
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            {tv("newTitle")}
            <FormInput name="title" required />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {tv("typeLabel")}
            <FormSelect name="type" defaultValue="volunteer">
              {[
                "employee",
                "volunteer",
                "internship",
                "contractor",
                "board",
                "other",
              ].map((type) => (
                <option key={type} value={type}>
                  {tv(`type.${type}`)}
                </option>
              ))}
            </FormSelect>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {tv("locationModeLabel")}
            <FormSelect name="locationMode" defaultValue="onsite">
              {["onsite", "hybrid", "remote"].map((mode) => (
                <option key={mode} value={mode}>
                  {tv(`locationMode.${mode}`)}
                </option>
              ))}
            </FormSelect>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {tv("workload")}
            <FormInput name="workload" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {tv("statusLabel")}
            <FormSelect name="status" defaultValue="draft">
              {["draft", "published"].map((status) => (
                <option key={status} value={status}>
                  {tv(`status.${status}`)}
                </option>
              ))}
            </FormSelect>
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            {tv("skills")}
            <FormInput name="skills" />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              <Plus className="h-4 w-4" />
              {tv("add")}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">{tj("title")}</h2>
          <p className="text-sm text-muted-foreground">{tj("desc")}</p>
        </div>
        <div className="divide-y">
          {joinRequests.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{tj("empty")}</p>
          ) : (
            joinRequests.map((request) => (
              <div key={request.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {request.userName || request.userEmail}
                      </p>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        {tj(`status.${request.status}`)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.userEmail}
                      {request.vacancyTitle ? ` · ${request.vacancyTitle}` : ""}
                    </p>
                    {request.message && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {request.message}
                      </p>
                    )}
                  </div>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        {tj("accept")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDeclineRequest(request.id)}
                      >
                        {tj("decline")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
