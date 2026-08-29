import { describe, it, expect } from "vitest";
import { getDefaultTools, getToolsForPermissions } from "../tools/index";
import type { Tool } from "../types";

const VALID_PERMISSIONS = [
  "invoice:read",
  "invoice:write",
  "invoice:delete",
  "contact:read",
  "contact:write",
  "product:read",
  "product:write",
  "banking:read",
  "banking:write",
  "accounting:read",
  "accounting:write",
  "project:read",
  "project:write",
  "settings:read",
  "settings:write",
] as const;

describe("getDefaultTools", () => {
  const tools = getDefaultTools();

  it("returns a non-empty array", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("every tool has required shape", () => {
    for (const tool of tools) {
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.execute).toBe("function");
      expect(Array.isArray(tool.requiredPermissions)).toBe(true);
    }
  });

  it("has no duplicate tool names", () => {
    const names = tools.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("all requiredPermissions are valid Permission values", () => {
    for (const tool of tools) {
      for (const perm of tool.requiredPermissions) {
        expect(VALID_PERMISSIONS).toContain(perm);
      }
    }
  });

  it("tool names use snake_case", () => {
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("includes key inventory tools", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_inventory");
    expect(names).toContain("get_item_details");
    expect(names).toContain("update_item_status");
    expect(names).toContain("update_item_condition");
    expect(names).toContain("update_inventory_item");
    expect(names).toContain("bulk_update_item_status");
    expect(names).toContain("intake_inventory_item");
    expect(names).toContain("return_inventory_item");
    expect(names).toContain("record_repair");
    expect(names).toContain("record_repair_part");
    expect(names).toContain("record_checklist");
    expect(names).toContain("record_data_erasure");
  });

  it("includes key pricing tools", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("get_price_lists");
    expect(names).toContain("create_price_list");
    expect(names).toContain("create_price_rule");
    expect(names).toContain("resolve_product_price");
  });
});

describe("getToolsForPermissions", () => {
  it("returns empty array when no permissions", () => {
    const tools = getToolsForPermissions([]);
    expect(tools).toHaveLength(0);
  });

  it("returns only tools whose permissions are all satisfied", () => {
    const tools = getToolsForPermissions(["product:read"]);
    for (const tool of tools) {
      expect(tool.requiredPermissions.every((p) => p === "product:read")).toBe(true);
    }
  });

  it("product:write includes product:read tools too when both provided", () => {
    const readOnly = getToolsForPermissions(["product:read"]);
    const readWrite = getToolsForPermissions(["product:read", "product:write"]);
    expect(readWrite.length).toBeGreaterThan(readOnly.length);
  });

  it("full permissions returns all tools", () => {
    const all = getDefaultTools();
    const allPerms = [...VALID_PERMISSIONS];
    const filtered = getToolsForPermissions(allPerms);
    expect(filtered).toHaveLength(all.length);
  });

  it("inventory write tools require product:write", () => {
    const withWrite = getToolsForPermissions(["product:read", "product:write"]);
    const withoutWrite = getToolsForPermissions(["product:read"]);
    const writeNames = withWrite.map((t) => t.name);
    const readNames = withoutWrite.map((t) => t.name);

    expect(writeNames).toContain("update_item_status");
    expect(readNames).not.toContain("update_item_status");

    expect(writeNames).toContain("bulk_update_item_status");
    expect(readNames).not.toContain("bulk_update_item_status");
  });
});

describe("tool structure: descriptions are substantive", () => {
  it("all descriptions are at least 20 characters", () => {
    const tools = getDefaultTools();
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThanOrEqual(20);
    }
  });
});

function findTool(name: string): Tool {
  const tool = getDefaultTools().find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("tool lookup helper", () => {
  it("findTool throws for unknown name", () => {
    expect(() => findTool("nonexistent_tool")).toThrow();
  });
});
