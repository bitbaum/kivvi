import { z } from "zod";

/**
 * JSON Schema for a tool's parameters, as both the Anthropic `input_schema`
 * and the OpenAI-compatible `function.parameters` expect it.
 *
 * Each provider used to walk zod internals by hand: one through `instanceof`,
 * the other through zod 3's `_def.typeName`. zod 4 has no `typeName`, so the
 * second walker fell through to `{ type: "string" }` for every tool, and the
 * model received no parameters at all. zod 4 converts natively, and handles
 * the constraints (min/max, enums, literals, defaults) that the hand-written
 * walkers dropped.
 *
 * `io: "input"` describes what the model must send, before defaults or
 * transforms run. `unrepresentable: "any"` stops a date or a custom check from
 * throwing; it becomes an unconstrained field, and `parse()` still validates
 * the call.
 */
export function toolParametersJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  return jsonSchema;
}
