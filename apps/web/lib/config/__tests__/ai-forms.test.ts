/**
 * The assistant's field list and the domain schema describe the same form. If
 * they drift, the model is told a field accepts 200 characters while the
 * validator rejects at 100 — and the failure surfaces as "the AI filled it in
 * and then saving failed", which reads as a model problem and is not one.
 *
 * Rather than trust two hand-maintained lists to stay in step, assert it.
 */

import { describe, it, expect } from "vitest";
import type { ZodTypeAny } from "zod";
import { CONTACT_FORM } from "../ai-forms";
import { createContactSchema } from "@kivvi/core/src/domain/contacts";
import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";

/**
 * Zod keeps its metadata on `_def`, which is deliberately not public API. This
 * is the smallest shape this test needs; reaching for it here is the price of
 * checking the schema instead of restating it.
 */
interface ZodInternals {
  _def?: {
    typeName?: string;
    innerType?: ZodTypeAny;
    schema?: ZodTypeAny;
    shape?: () => Record<string, ZodTypeAny>;
    checks?: Array<{ kind: string; value?: number }>;
  };
}

const internals = (schema: unknown): ZodInternals["_def"] =>
  (schema as ZodInternals)?._def;

/** Peel optional/nullable/effects wrappers until the underlying type shows. */
function unwrap(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;
  for (let i = 0; i < 10; i++) {
    const def = internals(current);
    const inner = def?.innerType ?? def?.schema;
    if (!inner) return current;
    current = inner;
  }
  return current;
}

function shapeOf(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  const def = internals(schema);
  if (def?.shape) return def.shape();
  if (def?.schema) return shapeOf(def.schema);
  return {};
}

describe("CONTACT_FORM mirrors the contact domain schema", () => {
  const shape = shapeOf(createContactSchema);

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

    for (const field of CONTACT_FORM.fields) {
      const entry = shape[field.name];
      if (!entry) continue;

      const def = internals(unwrap(entry));
      const schemaMax = def?.checks?.find((c) => c.kind === "max")?.value;
      if (typeof schemaMax !== "number") continue;

      // A string's max is a LENGTH; a number's max is a VALUE. Comparing the
      // two would be a category error — paymentTermsDays caps at 365 days, not
      // 365 characters.
      const isNumeric = def?.typeName === "ZodNumber";
      const declared = isNumeric ? field.max : field.maxLength;
      const kind = isNumeric ? "max" : "maxLength";

      if (declared !== schemaMax) {
        mismatches.push(
          `${field.name}: form ${kind} is ${declared ?? "none"}, schema says ${schemaMax}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("offers exactly the contact types the enum defines", () => {
    const typeField = CONTACT_FORM.fields.find((f) => f.name === "type");
    expect(typeField?.options?.map((o) => o.value)).toEqual([
      ...CONTACT_TYPE_VALUES,
    ]);
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
