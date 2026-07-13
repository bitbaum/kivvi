import type { TalerIntegrationInput } from "@kivvi/core/src/domain/integrations";

const TALER_TIMEOUT_MS = 10000;

export interface TalerCreateOrderInput {
  orderId: string;
  amount: string;
  currency: string;
  summary: string;
  fulfillmentUrl?: string;
  fulfillmentMessage: string;
  payDeadline?: Date;
  products?: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
  }>;
}

export interface TalerOrderStatus {
  order_status: "unpaid" | "claimed" | "paid";
  taler_pay_uri?: string;
  order_status_url?: string;
  pay_deadline?: TalerTimestamp;
  last_payment?: TalerTimestamp;
  refunded?: boolean;
  refund_amount?: string;
  [key: string]: unknown;
}

interface TalerTimestamp {
  t_ms: number | "never";
}

interface TalerPostOrderResponse {
  order_id: string;
  pay_deadline?: TalerTimestamp;
  token?: string;
}

function instancePrefix(instance?: string) {
  const normalized = (instance || "admin").trim();
  if (!normalized || normalized === "admin") return "";
  return `/instances/${encodeURIComponent(normalized)}`;
}

function privateUrl(config: TalerIntegrationInput, path: string) {
  return `${config.merchantBackendUrl}${instancePrefix(config.instance)}/private${path}`;
}

function timestamp(date: Date): TalerTimestamp {
  return { t_ms: date.getTime() };
}

function amount(currency: string, value: string) {
  return `${currency.toUpperCase()}:${Number(value).toFixed(2)}`;
}

function parseErrorBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const error = body as { hint?: string; detail?: string; code?: string };
  return error.hint || error.detail || error.code || "";
}

async function requestTaler<T>(
  config: TalerIntegrationInput,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TALER_TIMEOUT_MS);

  try {
    const response = await fetch(privateUrl(config, path), {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer secret-token:${config.accessToken}`,
        ...init.headers,
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const suffix = parseErrorBody(body);
      throw new Error(
        `GNU Taler returned HTTP ${response.status}${suffix ? `: ${suffix}` : ""}`,
      );
    }

    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testTalerConnection(config: TalerIntegrationInput) {
  await requestTaler<{ orders?: unknown[] }>(config, "/orders?limit=1");
}

export async function createTalerOrder(
  config: TalerIntegrationInput,
  input: TalerCreateOrderInput,
) {
  const response = await requestTaler<TalerPostOrderResponse>(
    config,
    "/orders",
    {
      method: "POST",
      body: JSON.stringify({
        order: {
          version: 0,
          order_id: input.orderId,
          amount: amount(input.currency, input.amount),
          summary: input.summary,
          fulfillment_url: input.fulfillmentUrl,
          fulfillment_message: input.fulfillmentMessage,
          pay_deadline: input.payDeadline
            ? timestamp(input.payDeadline)
            : timestamp(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          products: input.products?.map((product) => ({
            description: product.description,
            quantity: product.quantity,
            unit: "piece",
            price: amount(input.currency, product.unitPrice),
          })),
          extra: {
            kivvi_document_id: input.orderId,
          },
        },
        create_token: true,
      }),
    },
  );

  const status = await getTalerOrderStatus(config, response.order_id);
  return { response, status };
}

export async function getTalerOrderStatus(
  config: TalerIntegrationInput,
  orderId: string,
) {
  return requestTaler<TalerOrderStatus>(
    config,
    `/orders/${encodeURIComponent(orderId)}`,
  );
}

export function talerTimestampToDate(value?: TalerTimestamp | null) {
  if (!value || value.t_ms === "never") return null;
  return new Date(value.t_ms);
}
