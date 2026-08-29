"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";
import {
  createContactAddressAction,
  updateContactAddressAction,
  deleteContactAddressAction,
} from "@/app/actions/contacts";
import { toast } from "sonner";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import type { ContactAddress } from "@kivvi/database";
import { ADDRESS_TYPE_VALUES } from "@kivvi/database/src/enums";

interface AddressManagerProps {
  contactId: string;
  addresses: ContactAddress[];
}

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
      country: (formData.get("country") as string) || DEFAULT_COUNTRY,
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
    } else {
      toast.error(result.error ?? tc("error"));
    }
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    const result = await deleteContactAddressAction(contactId, addressId);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error ?? tc("error"));
    }
  }

  function startEdit(addr: ContactAddress) {
    setEditingId(addr.id);
    setShowForm(true);
  }

  const editingAddr = editingId ? addresses.find((a) => a.id === editingId) : null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="font-semibold">{t("addresses")}</h2>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addAddress")}
          </Button>
        )}
      </div>

      {/* Address list */}
      {addresses.length > 0 && !showForm && (
        <div className="divide-y">
          {addresses.map((addr) => (
            <div key={addr.id} className="p-4 flex items-start justify-between gap-4">
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
                  {addr.name && <span className="text-sm font-medium">{addr.name}</span>}
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
                <Button variant="ghost" size="icon" onClick={() => startEdit(addr)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {deletingId === addr.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {addresses.length === 0 && !showForm && (
        <div className="p-6 text-center text-sm text-muted-foreground">{t("noAddresses")}</div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="addr-type" className="mb-1.5 block text-sm font-medium">
                {tc("type")}
              </label>
              <FormSelect id="addr-type" name="type" defaultValue={editingAddr?.type || "billing"}>
                {ADDRESS_TYPE_VALUES.map((at) => (
                  <option key={at} value={at}>
                    {t(`addressType_${at}`)}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div>
              <label htmlFor="addr-name" className="mb-1.5 block text-sm font-medium">
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
            <label htmlFor="addr-address" className="mb-1.5 block text-sm font-medium">
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
              <label htmlFor="addr-postalCode" className="mb-1.5 block text-sm font-medium">
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
              <label htmlFor="addr-city" className="mb-1.5 block text-sm font-medium">
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
              <label htmlFor="addr-country" className="mb-1.5 block text-sm font-medium">
                {t("country")}
              </label>
              <FormInput
                id="addr-country"
                name="country"
                defaultValue={editingAddr?.country || DEFAULT_COUNTRY}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? tc("save") : t("addAddress")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
