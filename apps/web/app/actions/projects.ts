'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createProject,
  updateProject,
  createProjectSchema,
  updateProjectSchema,
} from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const project = await createProject(db, companyId, parsed.data);
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create project') };
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const project = await updateProject(db, companyId, projectId, parsed.data);
    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: project };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update project') };
  }
}
