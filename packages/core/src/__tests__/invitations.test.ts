import { describe, it, expect } from "vitest";
import { createInvitationSchema } from "../domain/invitations";

describe("createInvitationSchema", () => {
  it("accepts valid email with default role", () => {
    const result = createInvitationSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("member");
    }
  });

  it("accepts valid email with admin role", () => {
    const result = createInvitationSchema.safeParse({
      email: "user@example.com",
      role: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("admin");
    }
  });

  it("accepts viewer role", () => {
    const result = createInvitationSchema.safeParse({
      email: "user@example.com",
      role: "viewer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("viewer");
    }
  });

  it("rejects owner role (cannot invite as owner)", () => {
    const result = createInvitationSchema.safeParse({
      email: "user@example.com",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createInvitationSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = createInvitationSchema.safeParse({
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = createInvitationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createInvitationSchema.safeParse({
      email: "user@example.com",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});

describe("invitation expiry logic", () => {
  const INVITATION_EXPIRY_DAYS = 7;

  function isExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }

  function createExpiryDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  it("invitation with future expiry is not expired", () => {
    const expiresAt = createExpiryDate(INVITATION_EXPIRY_DAYS);
    expect(isExpired(expiresAt)).toBe(false);
  });

  it("invitation with past expiry is expired", () => {
    const expiresAt = createExpiryDate(-1);
    expect(isExpired(expiresAt)).toBe(true);
  });

  it("invitation expiry is 7 days from creation", () => {
    const created = new Date();
    const expires = createExpiryDate(INVITATION_EXPIRY_DAYS);
    const diffMs = expires.getTime() - created.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(INVITATION_EXPIRY_DAYS);
  });

  it("invitation expired 1 second ago is expired", () => {
    const expiresAt = new Date(Date.now() - 1000);
    expect(isExpired(expiresAt)).toBe(true);
  });
});

describe("email normalization", () => {
  // Mirrors the normalization in createInvitation
  function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  it("lowercases email", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("handles mixed case and whitespace", () => {
    expect(normalizeEmail("  User@EXAMPLE.com  ")).toBe("user@example.com");
  });

  it("handles already normalized email", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });
});

describe("invitation status transitions", () => {
  const VALID_STATUSES = ["pending", "accepted", "revoked", "expired"] as const;

  it("all statuses are defined", () => {
    expect(VALID_STATUSES).toContain("pending");
    expect(VALID_STATUSES).toContain("accepted");
    expect(VALID_STATUSES).toContain("revoked");
    expect(VALID_STATUSES).toContain("expired");
  });

  // Mirrors guard logic: only pending invitations can be accepted/revoked
  function canAccept(status: string): boolean {
    return status === "pending";
  }

  function canRevoke(status: string): boolean {
    return status === "pending";
  }

  it("pending invitation can be accepted", () => {
    expect(canAccept("pending")).toBe(true);
  });

  it("accepted invitation cannot be accepted again", () => {
    expect(canAccept("accepted")).toBe(false);
  });

  it("revoked invitation cannot be accepted", () => {
    expect(canAccept("revoked")).toBe(false);
  });

  it("expired invitation cannot be accepted", () => {
    expect(canAccept("expired")).toBe(false);
  });

  it("pending invitation can be revoked", () => {
    expect(canRevoke("pending")).toBe(true);
  });

  it("accepted invitation cannot be revoked", () => {
    expect(canRevoke("accepted")).toBe(false);
  });

  it("already revoked invitation cannot be revoked again", () => {
    expect(canRevoke("revoked")).toBe(false);
  });
});
