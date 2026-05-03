import { describe, it, expect } from "vitest";
import { DomainError } from "../domain-error";

describe("DomainError", () => {
  it("stores the error code", () => {
    const err = new DomainError("cannotTransition");
    expect(err.code).toBe("cannotTransition");
  });

  it("stores optional params", () => {
    const err = new DomainError("cannotTransition", {
      from: "draft",
      to: "paid",
    });
    expect(err.params).toEqual({ from: "draft", to: "paid" });
  });

  it("params default to undefined when omitted", () => {
    const err = new DomainError("onlyDraftCanBeDeleted");
    expect(err.params).toBeUndefined();
  });

  it("uses englishMessage as .message when provided", () => {
    const err = new DomainError(
      "cannotTransition",
      { from: "draft", to: "paid" },
      'Cannot transition from "draft" to "paid"',
    );
    expect(err.message).toBe('Cannot transition from "draft" to "paid"');
  });

  it("falls back to code as .message when no englishMessage", () => {
    const err = new DomainError("cannotApproveConditionNotAssessed");
    expect(err.message).toBe("cannotApproveConditionNotAssessed");
  });

  it("name is DomainError", () => {
    const err = new DomainError("cannotTransition");
    expect(err.name).toBe("DomainError");
  });

  it("is an instance of Error", () => {
    const err = new DomainError("cannotTransition");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of DomainError", () => {
    const err = new DomainError("cannotTransition");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("plain Error is NOT an instance of DomainError", () => {
    const err = new Error("something failed");
    expect(err).not.toBeInstanceOf(DomainError);
  });
});
