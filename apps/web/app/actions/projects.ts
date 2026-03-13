"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createProject,
  updateProject,
  createProjectSchema,
  updateProjectSchema,
} from "@kivvi/core";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { createAction } from "./action-factory";

export const createProjectAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createProject(db, companyId, parsed.data);
  },
  revalidate: ["/projects"],
  errorMessage: "Failed to create project",
  minRole: "member",
});

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid input",
      };
    }
    const project = await updateProject(db, companyId, projectId, parsed.data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: project };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update project"),
    };
  }
}
