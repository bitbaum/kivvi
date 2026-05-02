"use server";

import { db } from "@/lib/db";
import {
  createProject,
  updateProject,
  createProjectSchema,
  updateProjectSchema,
} from "@kivvi/core";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

export const createProjectAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createProject(db, companyId, parsed.data);
  },
  revalidate: ["/projects"],
  errorMessage: () =>
    getTranslations("projects").then((t) => t("errorFailedToCreate")),
  minRole: "member",
});

export const updateProjectAction = createAction<
  { projectId: string; input: unknown },
  unknown
>({
  handler: async ({ projectId, input }, { companyId, db }) => {
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateProject(db, companyId, projectId, parsed.data);
  },
  revalidate: ["/projects", "/projects/[id]"],
  errorMessage: () =>
    getTranslations("projects").then((t) => t("errorFailedToUpdate")),
  minRole: "member",
});
