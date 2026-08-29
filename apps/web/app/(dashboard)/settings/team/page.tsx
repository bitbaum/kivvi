"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Users, Mail, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  getTeamMembersAction,
  removeMemberAction,
  updateMemberPresetAction,
} from "@/app/actions/memberships";
import {
  inviteMemberAction,
  getInvitationsAction,
  revokeInvitationAction,
} from "@/app/actions/invitations";
import type { CompanyMember } from "@kivvi/core/src/domain/memberships";
import type { PendingInvitation } from "@kivvi/core/src/domain/invitations";
import {
  INVITABLE_PERMISSION_PRESET_VALUES,
  PERMISSION_PRESET_VALUES,
  type PermissionPresetValue as PermissionPreset,
} from "@kivvi/database/src/enums";
import { useSession } from "next-auth/react";
import { TeamInvitationsList } from "./team-invitations-list";
import { RoleBadge } from "./role-badge";

export default function TeamPage() {
  const t = useTranslations("team");
  const tc = useTranslations("common");
  const tAria = useTranslations("common.aria");
  const { data: session } = useSession();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePreset, setInvitePreset] = useState<PermissionPreset>("sales");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");

  const loadData = useCallback(async () => {
    const [membersResult, invitesResult] = await Promise.all([
      getTeamMembersAction(),
      getInvitationsAction(),
    ]);
    if (membersResult.success && membersResult.data) setMembers(membersResult.data);
    if (invitesResult.success && invitesResult.data) setInvites(invitesResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    setSuccessMessage("");

    const result = await inviteMemberAction({
      email: inviteEmail,
      permissionPreset: invitePreset,
    });
    if (result.success) {
      setSuccessMessage(t("invitationSent"));
      setLatestInviteUrl(result.data?.inviteUrl ?? "");
      setInviteEmail("");
      setShowInviteForm(false);
      await loadData();
    } else {
      setError(result.error || t("inviteFailed"));
    }
    setInviting(false);
  };

  const handleRemoveMember = async (userId: string, name: string | null) => {
    if (!confirm(t("confirmRemove", { name: name || t("thisMember") }))) return;
    const result = await removeMemberAction(userId);
    if (result.success) {
      await loadData();
    } else {
      setError(result.error || t("removeFailed"));
    }
  };

  const handlePresetChange = async (userId: string, permissionPreset: PermissionPreset) => {
    const result = await updateMemberPresetAction({ userId, permissionPreset });
    if (result.success) {
      await loadData();
    } else {
      setError(result.error || t("roleChangeFailed"));
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm(t("confirmRevoke"))) return;
    const result = await revokeInvitationAction(invitationId);
    if (result.success) {
      await loadData();
    } else {
      setError(result.error || t("revokeFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button onClick={() => setShowInviteForm(true)}>
            <UserPlus className="h-4 w-4" />
            {t("invite")}
          </Button>
        }
      />

      {/* Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label={tAria("dismiss")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-success/5 p-3 text-sm text-success">
          <div className="min-w-0">
            <p>{successMessage}</p>
            {latestInviteUrl && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-success/20 bg-background px-2 py-1 text-foreground">
                <span className="truncate text-xs">{latestInviteUrl}</span>
                <CopyButton value={latestInviteUrl} label={t("copyInviteLink")} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage("");
              setLatestInviteUrl("");
            }}
            aria-label={tAria("dismiss")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-success/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">{t("inviteMember")}</h2>
          <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">
                {t("email")}
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="invite-preset" className="mb-1 block text-sm font-medium">
                {t("permissionPreset")}
              </label>
              <select
                id="invite-preset"
                value={invitePreset}
                onChange={(e) => setInvitePreset(e.target.value as PermissionPreset)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {INVITABLE_PERMISSION_PRESET_VALUES.map((preset) => (
                  <option key={preset} value={preset}>
                    {tc(`permissionPresetLabel.${preset}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("sendInvitation")}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">
            {t("members")} ({members.length})
          </h2>
        </div>
        <div className="divide-y">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {(member.name || member.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.name || member.email}</p>
                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              </div>
              <RoleBadge
                role={member.role}
                label={tc(`permissionPresetLabel.${member.permissionPreset}`)}
              />
              {/* Role change + remove for owners/admins */}
              {session?.user?.id !== member.userId && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={member.permissionPreset}
                    onChange={(e) =>
                      handlePresetChange(member.userId, e.target.value as PermissionPreset)
                    }
                    className="rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PERMISSION_PRESET_VALUES.map((preset) => (
                      <option key={preset} value={preset}>
                        {tc(`permissionPresetLabel.${preset}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.userId, member.name)}
                    aria-label={t("removeAccess")}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title={t("removeAccess")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <TeamInvitationsList invites={invites} onRevoke={handleRevokeInvite} />
    </div>
  );
}
