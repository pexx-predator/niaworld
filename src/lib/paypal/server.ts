import "server-only";

type PayPalEnvironment = "sandbox" | "live";

type PayPalRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

function getPayPalConfig() {
  const environment = process.env.PAYPAL_ENVIRONMENT;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (environment !== "sandbox" && environment !== "live") {
    throw new Error("PAYPAL_ENVIRONMENT must be sandbox or live.");
  }

  if (!clientId || !clientSecret) {
    throw new Error("PayPal server credentials are not configured.");
  }

  return {
    clientId,
    clientSecret,
    baseUrl:
      environment === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  };
}

export class PayPalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PayPalApiError";
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `PayPal request failed with status ${response.status}.`;

    throw new PayPalApiError(message, response.status, data);
  }

  return data as T;
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseUrl } = getPayPalConfig();

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const data = await readResponse<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>(response);

  if (!data.access_token) {
    throw new Error("PayPal did not return an access token.");
  }

  return data.access_token;
}

export async function paypalRequest<T>(
  path: string,
  options: PayPalRequestOptions = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Invalid PayPal API path.");
  }

  const { baseUrl } = getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  return readResponse<T>(response);
}
