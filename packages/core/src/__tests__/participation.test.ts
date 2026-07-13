import { describe, expect, it } from "vitest";
import {
  joinRequestSchema,
  organizationProfileSchema,
  vacancySchema,
} from "../domain/participation";

describe("organization profile validation", () => {
  it("keeps organizations private unless explicitly published", () => {
    const result = organizationProfileSchema.safeParse({
      publicSlug: "revamp-it",
      publicName: "revamp-it",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(false);
      expect(result.data.acceptingApplications).toBe(false);
    }
  });

  it("rejects unsafe public slugs", () => {
    const result = organizationProfileSchema.safeParse({
      publicSlug: "Revamp IT!",
      publicName: "revamp-it",
    });

    expect(result.success).toBe(false);
  });
});

describe("vacancy validation", () => {
  it("defaults new vacancies to draft", () => {
    const result = vacancySchema.safeParse({
      title: "Repair volunteer",
      type: "volunteer",
      locationMode: "onsite",
      skills: ["hardware"],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("draft");
  });

  it("accepts publish and close statuses", () => {
    expect(
      vacancySchema.safeParse({
        title: "Technician",
        type: "employee",
        locationMode: "hybrid",
        status: "published",
      }).success,
    ).toBe(true);
    expect(
      vacancySchema.safeParse({
        title: "Technician",
        type: "employee",
        locationMode: "hybrid",
        status: "closed",
      }).success,
    ).toBe(true);
  });
});

describe("join request validation", () => {
  it("accepts an optional vacancy application message", () => {
    const result = joinRequestSchema.safeParse({
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      vacancyId: "550e8400-e29b-41d4-a716-446655440001",
      message: "I can help on Saturdays.",
    });

    expect(result.success).toBe(true);
  });
});
