import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { listDocuments } from "@kivvi/core";
import { getDb } from "./utils";

const searchRepairOrdersSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Search query for repair order number, customer name, or notes"),
  status: z
    .enum([
      "draft",
      "sent",
      "confirmed",
      "delivered",
      "paid",
      "partially_paid",
      "cancelled",
    ])
    .optional()
    .describe("Filter by repair order status"),
  dateFrom: z
    .string()
    .optional()
    .describe("Filter repair orders created from this date (ISO 8601)"),
  dateTo: z
    .string()
    .optional()
    .describe("Filter repair orders created until this date (ISO 8601)"),
  limit: z.number().default(10).describe("Maximum number of results to return"),
});

export const searchRepairOrdersTool: Tool = {
  name: "search_repair_orders",
  description: `Search for repair orders in the system. Can filter by status (draft, confirmed, delivered, paid, cancelled), date range, or search by customer name / repair order number. Returns a list of matching repair orders with their expected completion date.`,
  parameters: searchRepairOrdersSchema,
  requiredPermissions: ["invoice:read"],
  execute: async (
    params: z.infer<typeof searchRepairOrdersSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);

      const result = await listDocuments(db, context.companyId, {
        type: "repair_order",
        status: params.status,
        search: params.query,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        pageSize: params.limit,
      });

      let filteredData = result.data;
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        filteredData = result.data.filter((doc) => {
          return (
            doc.number.toLowerCase().includes(queryLower) ||
            doc.contact?.name?.toLowerCase().includes(queryLower) ||
            doc.notes?.toLowerCase().includes(queryLower)
          );
        });
      }

      const repairList = filteredData.map((doc) => ({
        id: doc.id,
        number: doc.number,
        customer: doc.contact?.name || "Unknown",
        status: doc.status,
        issueDate: doc.issueDate.toISOString().split("T")[0],
        expectedCompletion: doc.deliveryDate
          ? doc.deliveryDate.toISOString().split("T")[0]
          : null,
        total: `${doc.currency} ${Number(doc.total || "0").toFixed(2)}`,
        notes: doc.notes || null,
      }));

      if (repairList.length === 0) {
        return {
          success: true,
          message: "No repair orders found matching your criteria.",
          data: { repairOrders: [], count: 0 },
          actions: [
            {
              label: "New Repair Order",
              action: "navigate",
              params: { url: "/repairs/new" },
            },
          ],
        };
      }

      const openCount = filteredData.filter(
        (doc) => !["paid", "cancelled", "delivered"].includes(doc.status),
      ).length;

      return {
        success: true,
        message: `Found ${repairList.length} repair order(s). ${openCount} still open.`,
        data: {
          repairOrders: repairList,
          count: repairList.length,
          openCount,
        },
        actions: [
          {
            label: "View All Repairs",
            action: "navigate",
            params: { url: "/repairs" },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search repair orders: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
