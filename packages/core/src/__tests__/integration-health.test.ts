import { describe, expect, it } from "vitest";
import { classifyIntegrationHealth } from "../domain/integration-health";

describe("classifyIntegrationHealth", () => {
  it("requires active API tokens and webhook endpoints", () => {
    expect(
      classifyIntegrationHealth({
        activeApiTokens: 0,
        activeWebhookEndpoints: 1,
        pendingWebhookRetries: 0,
        failedWebhookDeliveries: 0,
        pendingIdempotencyKeys: 0,
      }),
    ).toBe("error");

    expect(
      classifyIntegrationHealth({
        activeApiTokens: 1,
        activeWebhookEndpoints: 0,
        pendingWebhookRetries: 0,
        failedWebhookDeliveries: 0,
        pendingIdempotencyKeys: 0,
      }),
    ).toBe("error");
  });

  it("treats abandoned deliveries as errors", () => {
    expect(
      classifyIntegrationHealth({
        activeApiTokens: 1,
        activeWebhookEndpoints: 1,
        pendingWebhookRetries: 0,
        failedWebhookDeliveries: 1,
        pendingIdempotencyKeys: 0,
      }),
    ).toBe("error");
  });

  it("warns when retry or replay work is pending", () => {
    expect(
      classifyIntegrationHealth({
        activeApiTokens: 1,
        activeWebhookEndpoints: 1,
        pendingWebhookRetries: 2,
        failedWebhookDeliveries: 0,
        pendingIdempotencyKeys: 0,
      }),
    ).toBe("warning");

    expect(
      classifyIntegrationHealth({
        activeApiTokens: 1,
        activeWebhookEndpoints: 1,
        pendingWebhookRetries: 0,
        failedWebhookDeliveries: 0,
        pendingIdempotencyKeys: 1,
      }),
    ).toBe("warning");
  });

  it("is healthy when wiring is present and no recovery work is pending", () => {
    expect(
      classifyIntegrationHealth({
        activeApiTokens: 1,
        activeWebhookEndpoints: 1,
        pendingWebhookRetries: 0,
        failedWebhookDeliveries: 0,
        pendingIdempotencyKeys: 0,
      }),
    ).toBe("healthy");
  });
});
