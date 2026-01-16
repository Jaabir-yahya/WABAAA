export interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment?: "sandbox" | "production";
  callbackUrl: string;
}

export interface STKPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 15000;
const RETRY_DELAYS_MS = [0, 800, 1600];

function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export class MPesaClient {
  private consumerKey: string;
  private consumerSecret: string;
  private shortcode: string;
  private passkey: string;
  private baseUrl: string;
  private callbackUrl: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: MPesaConfig) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.shortcode = config.shortcode;
    this.passkey = config.passkey;
    this.callbackUrl = config.callbackUrl;

    this.baseUrl = config.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private async fetchJson(
    url: string,
    init: RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      const data = await response.json();
      return { response, data };
    } finally {
      clearTimeout(id);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = base64Encode(`${this.consumerKey}:${this.consumerSecret}`);
    const { response, data } = await this.fetchJson(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`OAuth failed: ${data.errorMessage || "Unknown error"}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    return this.accessToken;
  }

  private getTimestamp(): string {
    const eatTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const year = eatTime.getUTCFullYear();
    const month = String(eatTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(eatTime.getUTCDate()).padStart(2, "0");
    const hour = String(eatTime.getUTCHours()).padStart(2, "0");
    const minute = String(eatTime.getUTCMinutes()).padStart(2, "0");
    const second = String(eatTime.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(timestamp: string): string {
    return base64Encode(`${this.shortcode}${this.passkey}${timestamp}`);
  }

  async stkPush(params: STKPushParams): Promise<STKPushResponse> {
    for (const delay of RETRY_DELAYS_MS) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const accessToken = await this.getAccessToken();
        const timestamp = this.getTimestamp();
        const password = this.generatePassword(timestamp);

        const payload = {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.floor(params.amount),
          PartyA: params.phone,
          PartyB: this.shortcode,
          PhoneNumber: params.phone,
          CallBackURL: this.callbackUrl,
          AccountReference: params.accountReference.substring(0, 12),
          TransactionDesc: params.transactionDesc.substring(0, 13),
        };

        const { response, data } = await this.fetchJson(
          `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok || data.ResponseCode !== "0") {
          return {
            success: false,
            error: data.errorMessage || data.ResponseDescription || "STK Push failed",
          };
        }

        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      } catch (error) {
        if (delay === RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "STK Push failed",
          };
        }
      }
    }

    return { success: false, error: "STK Push failed" };
  }
}

export function createMPesaClient(config: MPesaConfig): MPesaClient {
  return new MPesaClient(config);
}

