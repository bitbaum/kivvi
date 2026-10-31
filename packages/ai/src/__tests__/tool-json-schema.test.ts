/**
 * Every provider sends tool parameters as JSON Schema. The OpenAI-compatible
 * provider used to build it from zod 3's `_def.typeName`; on zod 4 that field
 * is gone and every tool silently became `{ type: "string" }`, so the model
 * was offered tools with no parameters. These tests hold the conversion to
 * the shape the APIs need, for every registered tool.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getDefaultTools } from "../tools/index";
import { toolParametersJsonSchema } from "../providers/tool-schema";

describe("toolParametersJsonSchema", () => {
  it.each(getDefaultTools().map((tool) => [tool.name, tool] as const))(
    "%s converts to an object schema",
    (_name, tool) => {
      const schema = toolParametersJsonSchema(tool.parameters);
      expect(schema.type).toBe("object");
      expect(schema).toHaveProperty("properties");
      expect(schema).not.toHaveProperty("$schema");
    },
  );

  it("marks required fields, and leaves optional and defaulted ones out", () => {
    const schema = toolParametersJsonSchema(
      z.object({
        status: z.enum(["testing", "ready_for_sale"]).describe("New status"),
        ids: z.array(z.string()).min(2),
        note: z.string().optional(),
        limit: z.number().int().default(20),
      }),
    );
    expect(schema.required).toEqual(["status", "ids"]);
    expect(schema.properties).toMatchObject({
      status: { type: "string", enum: ["testing", "ready_for_sale"], description: "New status" },
      ids: { type: "array", items: { type: "string" }, minItems: 2 },
      note: { type: "string" },
      limit: { type: "integer", default: 20 },
    });
  });
});
