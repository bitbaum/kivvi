import { z } from "zod";

type WithoutDefaults<Shape extends z.ZodRawShape> = {
  [K in keyof Shape]: Shape[K] extends z.ZodDefault<infer Inner> ? Inner : Shape[K];
};

/**
 * The update schema for a create schema: every field optional, and no
 * defaults.
 *
 * `createSchema.partial()` is not enough on zod 4. zod 3 skipped a `.default()`
 * once the field was wrapped in an optional, so `{}` parsed to `{}`. zod 4
 * applies it, so `updateProductSchema.parse({ name })` would come back with
 * `shopVisible: false`, `currency: "CHF"` and `unit: "piece"`, and the update
 * would quietly reset every defaulted column the caller left out. Defaults
 * belong to the create path; an update writes only what it was sent.
 */
export function updateSchemaOf<Shape extends z.ZodRawShape>(
  createSchema: z.ZodObject<Shape>,
): z.ZodObject<{ [K in keyof Shape]: z.ZodOptional<WithoutDefaults<Shape>[K]> }> {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(createSchema.shape)) {
    shape[key] =
      field instanceof z.ZodDefault ? (field.unwrap() as z.ZodType) : (field as z.ZodType);
  }
  return createSchema.extend(shape).partial() as never;
}
