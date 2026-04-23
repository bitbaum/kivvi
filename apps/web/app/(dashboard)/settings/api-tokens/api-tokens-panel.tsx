"use client";

import { useState } from "react";
import {
  Key,
  Plus,
  Loader2,
  Copy,
  Check,
  Trash2,
  Ban,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  createApiTokenAction,
  revokeApiTokenAction,
  deleteApiTokenAction,
} from "@/app/actions/api-tokens";

interface Token {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export function ApiTokensPanel({ initialTokens }: { initialTokens: Token[] }) {
  const t = useTranslations("settings.apiTokens");
  const tc = useTranslations("common");
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [isCreating, setIsCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!newTokenName.trim()) return;
    setIsCreating(true);

    const result = await createApiTokenAction({ name: newTokenName.trim() });
    if (result.success && result.data) {
      setCreatedToken(result.data.rawToken);
      setTokens((prev) => [
        {
          id: result.data!.id,
          name: newTokenName.trim(),
          tokenPrefix: result.data!.prefix,
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setNewTokenName("");
      toast.success(t("tokenCreated"));
    } else {
      toast.error(result.error || tc("error"));
    }
    setIsCreating(false);
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm(t("confirmRevoke"))) return;
    const result = await revokeApiTokenAction(tokenId);
    if (result.success) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, isActive: false } : t)),
      );
      toast.success(t("revoked"));
    } else {
      toast.error(result.error || tc("error"));
    }
  }

  async function handleDelete(tokenId: string) {
    if (!confirm(t("confirmDelete"))) return;
    const result = await deleteApiTokenAction(tokenId);
    if (result.success) {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      toast.success(t("deleted"));
    } else {
      toast.error(result.error || tc("error"));
    }
  }

  function handleCopy() {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Created token display */}
      {createdToken && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-6">
          <h3 className="mb-2 font-semibold text-success">
            {t("tokenCreatedDesc")}
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-4 py-2 font-mono text-sm dark:bg-black/20">
              {createdToken}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? t("copied") : t("copyToken")}
            </button>
          </div>
          <button
            onClick={() => setCreatedToken(null)}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("close")}
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm ? (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">
                {t("tokenName")}
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder={t("tokenNamePlaceholder")}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newTokenName.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createToken")}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTokenName("");
              }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("createToken")}
        </button>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("noTokens")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noTokensDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{token.name}</span>
                  <StatusBadge
                    variant={token.isActive ? "active" : "inactive"}
                    label={token.isActive ? t("active") : t("inactive")}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{token.tokenPrefix}</span>
                  <span>
                    {t("created")}: {formatDate(token.createdAt)}
                  </span>
                  <span>
                    {t("lastUsed")}:{" "}
                    {token.lastUsedAt
                      ? formatDate(token.lastUsedAt)
                      : t("never")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {token.isActive && (
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/5"
                  >
                    <Ban className="h-3 w-3" />
                    {t("revoke")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(token.id)}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API Documentation card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Code2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{t("apiDocs")}</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("apiDocsDesc")}</p>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("endpoints")}</p>
          <div className="space-y-1 font-mono text-xs text-muted-foreground">
            <p>{t("endpointContacts")}</p>
            <p>GET/PUT/DELETE /api/v1/contacts/:id</p>
            <p>{t("endpointDocuments")}</p>
            <p>GET/PUT/DELETE /api/v1/documents/:id</p>
            <p>{t("endpointProducts")}</p>
            <p>GET/PUT/DELETE /api/v1/products/:id</p>
          </div>
        </div>
      </div>
    </div>
  );
}
