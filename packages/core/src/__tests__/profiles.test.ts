import { describe, expect, it } from "vitest";
import { updateUserProfileSchema } from "../domain/profiles";

describe("user profile validation", () => {
  it("accepts personal participation metadata", () => {
    const result = updateUserProfileSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.org",
      location: "Zurich",
      languages: ["de", "en"],
      skills: ["repair", "accounting"],
      availabilityType: "volunteer",
    });

    expect(result.success).toBe(true);
  });

  it("rejects too many skills", () => {
    const result = updateUserProfileSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.org",
      languages: [],
      skills: Array.from({ length: 21 }, (_, index) => `skill-${index}`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid availability types", () => {
    const result = updateUserProfileSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.org",
      languages: [],
      skills: [],
      availabilityType: "superhero",
    });

    expect(result.success).toBe(false);
  });
});
