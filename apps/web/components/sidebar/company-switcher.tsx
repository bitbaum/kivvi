"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { Building2, ChevronsUpDown, Check, Plus } from "lucide-react";
import {
  getMyMembershipsAction,
  switchCompanyAction,
  createCompanyAction,
} from "@/app/actions/memberships";
import { Button } from "@/components/ui/button";
import type { MembershipInfo } from "@kivvi/core/src/domain/memberships";

function CreateCompanyForm({
  onCreated,
  onCancel,
  tc,
}: {
  onCreated: () => void;
  onCancel: () => void;
  tc: (key: string) => string;
}) {
  const { update: updateSession } = useSession();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setCreating(true);
    const result = await createCompanyAction({ companyName: trimmed });
    if (result.success) {
      await updateSession();
      onCreated();
      window.location.href = "/onboarding";
    }
    setCreating(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-2"
    >
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={tc("organizationName")}
        disabled={creating}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={creating || name.trim().length < 2}
          className="flex-1"
        >
          {creating ? tc("creatingOrganization") : tc("create")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
        >
          ✕
        </Button>
      </div>
    </form>
  );
}

interface CompanySwitcherProps {
  tc: (key: string) => string;
}

export function CompanySwitcher({ tc }: CompanySwitcherProps) {
  const { data: session, update: updateSession } = useSession();
  const [memberships, setMemberships] = useState<MembershipInfo[]>([]);
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    async function loadMemberships() {
      const result = await getMyMembershipsAction();
      if (result.success && result.data) {
        setMemberships(result.data);
      }
    }
    if (session?.user?.id) loadMemberships();
  }, [session?.user?.id]);

  const handleSwitchCompany = useCallback(
    async (companyId: string) => {
      if (companyId === session?.user?.companyId) {
        setCompanySwitcherOpen(false);
        return;
      }
      setSwitching(true);
      const result = await switchCompanyAction(companyId);
      if (result.success) {
        await updateSession();
        setCompanySwitcherOpen(false);
        window.location.href = "/dashboard";
      }
      setSwitching(false);
    },
    [session?.user?.companyId, updateSession],
  );

  if (memberships.length > 1) {
    return (
      <div className="relative">
        <button
          onClick={() => setCompanySwitcherOpen(!companySwitcherOpen)}
          disabled={switching}
          className="flex w-full items-center gap-3 rounded-lg bg-muted p-3 text-left hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={tc("aria.switchCompany")}
          aria-expanded={companySwitcherOpen}
        >
          <Building2
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">
              {session?.user?.companyName || tc("myCompany")}
            </p>
            <p className="text-xs text-muted-foreground">
              {tc(`roleLabel.${session?.user?.role || "member"}`)}
            </p>
          </div>
          <ChevronsUpDown
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
        {companySwitcherOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setCompanySwitcherOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-popover p-1 shadow-md">
              {memberships.map((m) => (
                <button
                  key={m.companyId}
                  onClick={() => handleSwitchCompany(m.companyId)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <Building2
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{m.companyName}</span>
                  <span className="text-xs text-muted-foreground">
                    {tc(`roleLabel.${m.role}`)}
                  </span>
                  {m.companyId === session?.user?.companyId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              <div className="my-1 border-t" />
              {showCreateForm ? (
                <div className="px-1">
                  <CreateCompanyForm
                    tc={tc}
                    onCreated={() => {
                      setCompanySwitcherOpen(false);
                      setShowCreateForm(false);
                    }}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{tc("createOrganization")}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/settings/company"
        className="flex w-full items-center gap-3 rounded-lg bg-muted p-3 text-left hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={tc("aria.companySettings")}
      >
        <Building2
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="flex-1 truncate">
          <p className="text-sm font-medium">
            {session?.user?.companyName || tc("myCompany")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tc(`roleLabel.${session?.user?.role || "member"}`)}
          </p>
        </div>
      </Link>
      {showCreateForm ? (
        <div className="mt-2">
          <CreateCompanyForm
            tc={tc}
            onCreated={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setShowCreateForm(true)}
          className="mt-1 w-full justify-start px-3 py-1.5 text-xs text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{tc("createOrganization")}</span>
        </Button>
      )}
    </div>
  );
}
