import type { ExecutionContext, ToolResult } from "./types";

/** Tools that mutate data — these are logged to the audit trail */
const WRITE_TOOLS: Record<string, { actionType: string; entityType: string }> =
  {
    create_document: { actionType: "create", entityType: "document" },
    update_document_status: { actionType: "update", entityType: "document" },
    convert_document: { actionType: "create", entityType: "document" },
    record_payment: { actionType: "create", entityType: "payment" },
    create_contact: { actionType: "create", entityType: "contact" },
    update_contact: { actionType: "update", entityType: "contact" },
    create_product: { actionType: "create", entityType: "product" },
    update_product: { actionType: "update", entityType: "product" },
    create_journal_entry: { actionType: "create", entityType: "journal_entry" },
    record_stock_movement: {
      actionType: "create",
      entityType: "stock_movement",
    },
    process_dunning: { actionType: "create", entityType: "dunning" },
    reconcile_transaction: {
      actionType: "update",
      entityType: "bank_transaction",
    },
  };

/**
 * Log AI tool executions that mutate data to the aiActionAudit table.
 * Read-only tools (searches, reports) are not logged.
 */
export async function auditToolExecution(
  toolName: string,
  args: Record<string, unknown>,
  result: ToolResult,
  context: ExecutionContext,
): Promise<void> {
  const toolMeta = WRITE_TOOLS[toolName];
  if (!toolMeta) return; // Read-only tool, no audit needed

  try {
    const { aiActionAudit } = await import("@kivvi/database");
    const db = context.db as any;

    await db.insert(aiActionAudit).values({
      conversationId: context.conversationId,
      userId: context.userId,
      toolName,
      actionType: toolMeta.actionType,
      entityType: toolMeta.entityType,
      entityId:
        result.data && typeof result.data === "object" && "id" in result.data
          ? (result.data as { id: string }).id
          : null,
      afterState: result.success ? result.data : null,
    });
  } catch {
    // Audit failure should never break the tool execution flow
  }
}
