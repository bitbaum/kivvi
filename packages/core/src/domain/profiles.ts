import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  users,
  AVAILABILITY_TYPE_VALUES,
  type AvailabilityType,
  type Database,
} from "@kivvi/database";

const tagList = z.array(z.string().trim().min(1).max(60)).max(20).default([]);

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  location: z.string().trim().max(120).optional().nullable(),
  languages: tagList,
  skills: tagList,
  availabilityType: z.enum(AVAILABILITY_TYPE_VALUES).optional().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export async function updateUserProfile(
  db: Database,
  userId: string,
  input: UpdateUserProfileInput,
) {
  const parsed = updateUserProfileSchema.parse(input);
  const [user] = await db
    .update(users)
    .set({
      name: parsed.name,
      email: parsed.email.toLowerCase().trim(),
      location: parsed.location || null,
      languages: parsed.languages,
      skills: parsed.skills,
      availabilityType: (parsed.availabilityType as AvailabilityType) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}
