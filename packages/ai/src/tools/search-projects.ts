import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { listProjects } from "@kivvi/core";
import { getDb } from "./utils";

const searchProjectsSchema = z.object({
  query: z.string().optional().describe("Search query for project name or number"),
  status: z
    .enum(["active", "completed", "on_hold", "cancelled"])
    .optional()
    .describe("Filter by project status"),
  limit: z.number().default(10).describe("Maximum number of results to return"),
});

export const searchProjectsTool: Tool = {
  name: "search_projects",
  description: `Search for projects in the system. Can filter by status or search by name/number. Returns a list of projects with their status, budget, and associated contact.`,
  parameters: searchProjectsSchema,
  requiredPermissions: ["project:read"],
  execute: async (
    params: z.infer<typeof searchProjectsSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);
      const currency = context.defaultCurrency;

      const result = await listProjects(db, context.companyId, {
        search: params.query,
        status: params.status,
        pageSize: params.limit,
      });

      const projectList = result.data.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        contactName: p.contactName || null,
        budget: p.budget ? `${currency} ${new Decimal(p.budget).toFixed(2)}` : null,
        startDate: p.startDate || null,
        endDate: p.endDate || null,
      }));

      if (projectList.length === 0) {
        return {
          success: true,
          message: "No projects found matching your criteria.",
          data: { projects: [], count: 0 },
        };
      }

      return {
        success: true,
        message: `Found ${projectList.length} project(s).`,
        data: {
          projects: projectList,
          count: projectList.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search projects: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
