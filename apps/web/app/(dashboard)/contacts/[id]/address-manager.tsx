"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContactAddressAction,
  updateContactAddressAction,
  deleteContactAddressAction,
} from "@/app/actions/contacts";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import type { ContactAddress } from "@kivvi/database";

interface AddressManagerProps {
  contactId: string;
  addresses: ContactAddress[];
}

const ADDRESS_TYPES = ["billing", "shipping", "other"] as const;

export function AddressManager({ contactId, addresses }: AddressManagerProps) {
  const router = useRouter();
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const input = {
      type: formData.get("type") as "billing" | "shipping" | "other",
      name: (formData.get("name") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || "CH",
      isDefault: formData.get("isDefault") === "on",
    };

    const result = editingId
      ? await updateContactAddressAction(contactId, editingId, input)
      : await createContactAddressAction(contactId, input);

    setIsSubmitting(false);

    if (result.success) {
      setShowForm(false);
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    const result = await deleteContactAddressAction(contactId, addressId);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    }
  }

  function startEdit(addr: ContactAddress) {
    setEditingId(addr.id);
    setShowForm(true);
  }

  const editingAddr = editingId
    ? addresses.find((a) => a.id === editingId)
    : null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="font-semibold">{t("addresses")}</h2>
        {!showForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addAddress")}
          </button>
        )}
      </div>

      {/* Address list */}
      {addresses.length > 0 && !showForm && (
        <div className="divide-y">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                    {t(`addressType_${addr.type}`)}
                  </span>
                  {addr.isDefault && (
                    <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                      {t("defaultAddress")}
                    </span>
                  )}
                  {addr.name && (
                    <span className="text-sm font-medium">{addr.name}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {addr.address && <p>{addr.address}</p>}
                  {(addr.postalCode || addr.city) && (
                    <p>
                      {addr.postalCode} {addr.city}
                    </p>
                  )}
                  {addr.country && <p>{addr.country}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(addr)}
                  className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="rounded-lg p-2 hover:bg-destructive/10 text-destructive transition-colors"
                >
                  {deletingId === addr.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {addresses.length === 0 && !showForm && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t("noAddresses")}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addr-type"
                className="mb-1.5 block text-sm font-medium"
              >
                {tc("type")}
              </label>
              <FormSelect
                id="addr-type"
                name="type"
                defaultValue={editingAddr?.type || "billing"}
              >
                {ADDRESS_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {t(`addressType_${at}`)}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div>
              <label
                htmlFor="addr-name"
                className="mb-1.5 block text-sm font-medium"
              >
                {tc("name")}
              </label>
              <FormInput
                id="addr-name"
                name="name"
                defaultValue={editingAddr?.name || ""}
                maxLength={200}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="addr-address"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("addressLine")}
            </label>
            <FormInput
              id="addr-address"
              name="address"
              defaultValue={editingAddr?.address || ""}
              maxLength={500}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="addr-postalCode"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("postalCode")}
              </label>
              <FormInput
                id="addr-postalCode"
                name="postalCode"
                defaultValue={editingAddr?.postalCode || ""}
                maxLength={20}
              />
            </div>
            <div>
              <label
                htmlFor="addr-city"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("city")}
              </label>
              <FormInput
                id="addr-city"
                name="city"
                defaultValue={editingAddr?.city || ""}
                maxLength={100}
              />
            </div>
            <div>
              <label
                htmlFor="addr-country"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("country")}
              </label>
              <FormInput
                id="addr-country"
                name="country"
                defaultValue={editingAddr?.country || "CH"}
                maxLength={2}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addr-isDefault"
              name="isDefault"
              defaultChecked={editingAddr?.isDefault ?? false}
              className="rounded border-input"
            />
            <label htmlFor="addr-isDefault" className="text-sm">
              {t("setAsDefault")}
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? tc("save") : t("addAddress")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
