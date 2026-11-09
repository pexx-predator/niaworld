
import "server-only";

type MpesaEnvironment = "sandbox" | "production";

interface MpesaTokenResponse {
  access_token?: string;
  expires_in?: string;
  errorMessage?: string;
}

function getMpesaConfiguration() {
  const environment = process.env.MPESA_ENVIRONMENT || "sandbox";

  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("Invalid M-Pesa environment configuration.");
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa API credentials are not configured.");
  }

  const baseUrl =
    environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  return {
    environment: environment as MpesaEnvironment,
    consumerKey,
    consumerSecret,
    baseUrl,
  };
}

export async function getMpesaAccessToken(): Promise<string> {
  const config = getMpesaConfiguration();

  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64");

  let response: Response;

  try {
    response = await fetch(
      `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new Error("Unable to connect to the M-Pesa authentication service.");
  }

  const result = (await response.json().catch(() => null)) as
    | MpesaTokenResponse
    | null;

  if (!response.ok || !result?.access_token) {
    throw new Error("M-Pesa authentication failed. Check the API credentials.");
  }

  return result.access_token;
}
