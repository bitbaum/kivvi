"use client";

import { Mail, Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import type { PendingInvitation } from "@kivvi/core/src/domain/invitations";
import type { MembershipRole } from "@kivvi/database";

const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-warning/10 text-warning",
  admin: "bg-info/10 text-info",
  member: "bg-neutral/10 text-neutral",
  viewer: "bg-neutral/10 text-neutral",
};

function RoleBadge({ role, label }: { role: MembershipRole; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {label}
    </span>
  );
}

interface TeamInvitationsListProps {
  invites: PendingInvitation[];
  onRevoke: (invitationId: string) => void;
}

export function TeamInvitationsList({
  invites,
  onRevoke,
}: TeamInvitationsListProps) {
  const t = useTranslations("team");
  const tc = useTranslations("common");

  if (invites.length === 0) return null;

  return (
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
            <RoleBadge
              role={invite.role}
              label={tc(`roleLabel.${invite.role}`)}
            />
            <button
              onClick={() => onRevoke(invite.id)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={t("revokeInvitation")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
