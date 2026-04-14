"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Mail,
  Loader2,
  Trash2,
  ChevronDown,
  UserPlus,
  Clock,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import {
  getTeamMembersAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "@/app/actions/memberships";
import {
  inviteMemberAction,
  getInvitationsAction,
  revokeInvitationAction,
} from "@/app/actions/invitations";
import type { CompanyMember } from "@kivvi/core/src/domain/memberships";
import type { PendingInvitation } from "@kivvi/core/src/domain/invitations";
import type { MembershipRole } from "@kivvi/database";
import { useSession } from "next-auth/react";

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-warning/10 text-warning",
  admin: "bg-info/10 text-info",
  member: "bg-neutral/10 text-neutral",
  viewer: "bg-neutral/10 text-neutral",
};

function RoleBadge({ role }: { role: MembershipRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function TeamPage() {
  const t = useTranslations("team");
  const { data: session } = useSession();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    const [membersResult, invitesResult] = await Promise.all([
      getTeamMembersAction(),
      getInvitationsAction(),
    ]);
    if (membersResult.success && membersResult.data)
      setMembers(membersResult.data);
    if (invitesResult.success && invitesResult.data)
      setInvites(invitesResult.data);
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
      role: inviteRole,
    });
    if (result.success) {
      setSuccessMessage(t("invitationSent"));
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

  const handleRoleChange = async (userId: string, newRole: MembershipRole) => {
    const result = await updateMemberRoleAction({ userId, role: newRole });
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
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            {t("invite")}
          </button>
        }
      />

      {/* Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg bg-success/5 p-3 text-sm text-success">
          {successMessage}
          <button onClick={() => setSuccessMessage("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">{t("inviteMember")}</h2>
          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="invite-email"
                className="mb-1 block text-sm font-medium"
              >
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
            <div className="w-full sm:w-40">
              <label
                htmlFor="invite-role"
                className="mb-1 block text-sm font-medium"
              >
                {t("role")}
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as MembershipRole)
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="member">{ROLE_LABELS.member}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
                <option value="viewer">{ROLE_LABELS.viewer}</option>
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
            <div key={member.userId} className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {(member.name || member.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.name || member.email}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {member.email}
                </p>
              </div>
              <RoleBadge role={member.role} />
              {/* Role change + remove for owners/admins */}
              {session?.user?.id !== member.userId && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(
                        member.userId,
                        e.target.value as MembershipRole,
                      )
                    }
                    className="rounded-lg border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="owner">{ROLE_LABELS.owner}</option>
                    <option value="admin">{ROLE_LABELS.admin}</option>
                    <option value="member">{ROLE_LABELS.member}</option>
                    <option value="viewer">{ROLE_LABELS.viewer}</option>
                  </select>
                  <button
                    onClick={() =>
                      handleRemoveMember(member.userId, member.name)
                    }
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

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">
              {t("pendingInvitations")} ({invites.length})
            </h2>
          </div>
          <div className="divide-y">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("expiresOn", {
                      date: new Date(invite.expiresAt).toLocaleDateString(
                        DEFAULT_LOCALE,
                      ),
                    })}
                  </p>
                </div>
                <RoleBadge role={invite.role} />
                <button
                  onClick={() => handleRevokeInvite(invite.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={t("revokeInvitation")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
