/**
 * The assistant's field list and the domain schema describe the same form. If
 * they drift, the model is told a field accepts 200 characters while the
 * validator rejects at 100 — and the failure surfaces as "the AI filled it in
 * and then saving failed", which reads as a model problem and is not one.
 *
 * Rather than trust two hand-maintained lists to stay in step, assert it.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { CONTACT_FORM } from "../ai-forms";
import { createContactSchema } from "@kivvi/core/src/domain/contacts";
import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";

/**
 * Read the schema through zod's public JSON Schema export rather than its
 * `_def` internals, which changed shape between zod 3 and 4. `io: "input"` is
 * what a caller (the model) must send.
 */
interface JsonField {
  type?: string;
  maxLength?: number;
  maximum?: number;
  anyOf?: JsonField[];
}

const jsonSchema = z.toJSONSchema(createContactSchema, {
  io: "input",
  unrepresentable: "any",
}) as { properties?: Record<string, JsonField> };

/** A nullable field is `anyOf: [T, null]`; the bounds live on T. */
function valueBranch(field: JsonField): JsonField {
  return field.anyOf?.find((branch) => branch.type !== "null") ?? field;
}

describe("CONTACT_FORM mirrors the contact domain schema", () => {
  const shape = jsonSchema.properties ?? {};

  it("declares only fields the schema actually accepts", () => {
    const schemaFields = Object.keys(shape);
    expect(schemaFields.length).toBeGreaterThan(0);

    const unknownFields = CONTACT_FORM.fields
      .map((f) => f.name)
      .filter((name) => !schemaFields.includes(name));

    // A field the schema does not accept is one the model can fill and the
    // server will then silently drop on save.
    expect(unknownFields).toEqual([]);
  });

  it("uses the same bounds as the validator", () => {
    const mismatches: string[] = [];
    let compared = 0;

    for (const field of CONTACT_FORM.fields) {
      const entry = shape[field.name];
      if (!entry) continue;

      const value = valueBranch(entry);
      // A string's max is a LENGTH; a number's max is a VALUE. Comparing the
      // two would be a category error — paymentTermsDays caps at 365 days, not
      // 365 characters.
      const isNumeric = value.type === "number" || value.type === "integer";
      const schemaMax = isNumeric ? value.maximum : value.maxLength;
      if (typeof schemaMax !== "number") continue;
      compared++;

      const declared = isNumeric ? field.max : field.maxLength;
      const kind = isNumeric ? "max" : "maxLength";

      if (declared !== schemaMax) {
        mismatches.push(
          `${field.name}: form ${kind} is ${declared ?? "none"}, schema says ${schemaMax}`,
        );
      }
    }

    // Guards the reader above: if it stopped finding bounds, this test would pass vacuously.
    expect(compared).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  it("offers exactly the contact types the enum defines", () => {
    const typeField = CONTACT_FORM.fields.find((f) => f.name === "type");
    expect(typeField?.options?.map((o) => o.value)).toEqual([...CONTACT_TYPE_VALUES]);
  });

  it("never lets the model write an identifier or ownership column", () => {
    // Belt and braces: these must not appear at all, excluded or otherwise.
    const forbidden = ["id", "companyId", "createdAt", "updatedAt", "deletedAt"];
    const leaked = CONTACT_FORM.fields
      .map((f) => f.name)
      .filter((name) => forbidden.includes(name));

    expect(leaked).toEqual([]);
  });
});
