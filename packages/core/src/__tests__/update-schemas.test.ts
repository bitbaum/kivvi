/**
 * An update writes only the fields it was sent. zod 4 applies a field's
 * `.default()` even inside `.partial()`, so a bare `createSchema.partial()`
 * would turn `{ name }` into `{ name, shopVisible: false, currency: "CHF", … }`
 * and reset every defaulted column on every edit. `updateSchemaOf` strips the
 * defaults; these tests pin that for every update schema in the domain.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { updateSchemaOf } from "../utils/update-schema";
import { updateAccountSchema } from "../domain/accounting";
import { updateAddressSchema, updateContactSchema } from "../domain/contacts";
import { updateCostCenterSchema } from "../domain/cost-centers";
import { updateInventoryItemSchema } from "../domain/inventory-items";
import { updatePriceListSchema, updatePriceRuleSchema } from "../domain/pricing";
import { updateProductSchema } from "../domain/products";
import { updateProjectSchema } from "../domain/projects";

const UPDATE_SCHEMAS: Record<string, z.ZodType> = {
  updateAccountSchema,
  updateAddressSchema,
  updateContactSchema,
  updateCostCenterSchema,
  updateInventoryItemSchema,
  updatePriceListSchema,
  updatePriceRuleSchema,
  updateProductSchema,
  updateProjectSchema,
};

describe("update schemas", () => {
  it.each(Object.entries(UPDATE_SCHEMAS))(
    "%s parses an empty update to an empty object",
    (_name, schema) => {
      expect(schema.parse({})).toEqual({});
    },
  );

  it("keeps the fields it was sent, and only those", () => {
    expect(updateProductSchema.parse({ shopVisible: true })).toEqual({ shopVisible: true });
    expect(updateInventoryItemSchema.parse({ notes: "Akku ersetzt" })).toEqual({
      notes: "Akku ersetzt",
    });
  });
});

describe("updateSchemaOf", () => {
  const create = z.object({
    title: z.string().min(1),
    status: z.enum(["draft", "active"]).default("draft"),
  });

  it("leaves the create schema's defaults in place", () => {
    expect(create.parse({ title: "x" })).toEqual({ title: "x", status: "draft" });
  });

  it("still validates the fields it is sent", () => {
    const update = updateSchemaOf(create);
    expect(update.safeParse({ status: "archived" }).success).toBe(false);
    expect(update.safeParse({ title: "" }).success).toBe(false);
    expect(update.parse({ status: "active" })).toEqual({ status: "active" });
  });
});
