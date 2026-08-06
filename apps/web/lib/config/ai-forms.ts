/**
 * SSOT for every form the assistant is allowed to fill or change.
 *
 * A form appears here once. The API route reads this list to decide what the
 * model may write, and the form component reads the same specs — so a field
 * cannot exist for the model and not for the UI, or the other way round.
 *
 * Before this, each AI-assisted form carried its own hand-written prompt that
 * re-listed the fields (see app/actions/ai-extract.ts). Two lists of the same
 * thing drift: add a column and the prompt keeps describing the old form.
 *
 * Option lists are imported from the enums that already define them. Never
 * retype an enum here. Length limits mirror `createContactSchema` in
 * packages/core/src/domain/contacts.ts — and lib/config/__tests__ asserts they
 * still match, so the two cannot silently diverge.
 */

import { defineFields, type FormTarget } from "@fleet/ai-forms";
import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";

export const CONTACT_FORM: FormTarget = {
  key: "contact",
  name: "Contact",
  fields: defineFields([
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: CONTACT_TYPE_VALUES.map((value) => ({ value })),
      // The form opens on "customer" as a template default, not as something
      // the user chose — so a fill is allowed to change it. A refine always
      // may. Without this, "our supplier Meier AG" would fill every field
      // except the one that says they are a supplier.
      overridable: true,
    },
    {
      name: "name",
      label: "Company or display name",
      type: "text",
      maxLength: 200,
      hint: "The business name for a company. Leave empty for a private person — the app derives it from first and last name.",
    },
    { name: "firstName", label: "First name", type: "text", maxLength: 100 },
    { name: "lastName", label: "Last name", type: "text", maxLength: 100 },
    { name: "email", label: "Email", type: "email", maxLength: 200 },
    { name: "phone", label: "Phone", type: "text", maxLength: 30 },
    { name: "mobile", label: "Mobile", type: "text", maxLength: 30 },
    { name: "website", label: "Website", type: "url", maxLength: 200 },
    {
      name: "address",
      label: "Street address",
      type: "text",
      maxLength: 500,
      hint: "Street and number only. Postal code and city are separate fields.",
    },
    { name: "postalCode", label: "Postal code", type: "text", maxLength: 20 },
    { name: "city", label: "City", type: "text", maxLength: 100 },
    {
      name: "country",
      label: "Country",
      type: "text",
      maxLength: 5,
      hint: "ISO 3166-1 alpha-2 code, e.g. CH, DE, FR — never a country name.",
    },
    {
      name: "vatNumber",
      label: "VAT number",
      type: "text",
      maxLength: 30,
      hint: "Swiss numbers look like CHE-123.456.789 MWST.",
    },
    { name: "iban", label: "IBAN", type: "text", maxLength: 34 },
    { name: "bic", label: "BIC", type: "text", maxLength: 11 },
    {
      name: "paymentTermsDays",
      label: "Payment terms (days)",
      type: "number",
      min: 0,
      max: 365,
    },
    { name: "creditLimit", label: "Credit limit", type: "text" },
    {
      name: "language",
      label: "Correspondence language",
      type: "text",
      maxLength: 5,
      hint: "Locale code such as de, fr, en.",
    },
    { name: "notes", label: "Notes", type: "textarea", maxLength: 5000 },
    { name: "dunningBlock", label: "Block dunning", type: "boolean" },
  ]),
  instructions: [
    "Swiss addresses put the postal code before the city: '8004 Zürich' means postalCode 8004, city Zürich.",
    "Phone numbers keep the format the user wrote them in. Do not reformat a number that is already readable.",
    "Only set an email or website if one was actually given — never invent one from the company name.",
    "A person's name goes in firstName and lastName, not in name. A company's goes in name.",
  ],
};

/** Every form the assistant may touch. The client can only name these keys. */
export const AI_FORMS: readonly FormTarget[] = [CONTACT_FORM];
