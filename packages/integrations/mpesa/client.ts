/**
 * M-Pesa Daraja API Client
 * 
 * Direct integration with Safaricom Daraja API (no middleman).
 * Handles STK Push, callbacks, and payment verification.
 */

export interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment?: 'sandbox' | 'production';
  callbackUrl: string;
}

export interface STKPushParams {
  phone: string; // Format: 254712345678
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

export interface MPesaCallback {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  callbackMetadata?: {
    amount?: number;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phoneNumber?: string;
  };
}

/**
 * M-Pesa Daraja API Client
 */
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
    
    this.baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OAuth failed: ${data.errorMessage || 'Unknown error'}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 min for safety

    return this.accessToken;
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const str = this.shortcode + this.passkey + timestamp;
    return Buffer.from(str).toString('base64');
  }

  /**
   * Get current timestamp in Daraja format
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Initiate STK Push (Lipa Na M-Pesa Online)
   */
  async stkPush(params: STKPushParams): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      // Ensure phone is in correct format (254...)
      const phone = params.phone.startsWith('254') 
        ? params.phone 
        : params.phone.replace(/^0/, '254');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.floor(params.amount), // Must be integer
        PartyA: phone,
        PartyB: this.shortcode,
        PhoneNumber: phone,
        CallBackURL: this.callbackUrl,
        AccountReference: params.accountReference.substring(0, 12), // Max 12 chars
        TransactionDesc: params.transactionDesc.substring(0, 13) // Max 13 chars
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.ResponseCode !== '0') {
        return {
          success: false,
          error: data.errorMessage || data.ResponseDescription || 'STK Push failed'
        };
      }

      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query STK Push status
   */
  async queryStkStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  }

  /**
   * Parse M-Pesa callback
   */
  parseCallback(callbackData: any): MPesaCallback {
    const body = callbackData.Body?.stkCallback || callbackData;

    const callback: MPesaCallback = {
      merchantRequestId: body.MerchantRequestID,
      checkoutRequestId: body.CheckoutRequestID,
      resultCode: body.ResultCode,
      resultDesc: body.ResultDesc
    };

    // Extract metadata if payment was successful
    if (body.ResultCode === 0 && body.CallbackMetadata) {
      const items = body.CallbackMetadata.Item || [];
      const metadata: any = {};

      for (const item of items) {
        if (item.Name === 'Amount') {
          metadata.amount = item.Value;
        } else if (item.Name === 'MpesaReceiptNumber') {
          metadata.mpesaReceiptNumber = item.Value;
        } else if (item.Name === 'TransactionDate') {
          metadata.transactionDate = item.Value;
        } else if (item.Name === 'PhoneNumber') {
          metadata.phoneNumber = item.Value;
        }
      }

      callback.callbackMetadata = metadata;
    }

    return callback;
  }

  /**
   * Validate callback is from Safaricom (basic check)
   */
  validateCallback(callbackData: any): boolean {
    // Check required fields exist
    const body = callbackData.Body?.stkCallback || callbackData;
    return !!(body.MerchantRequestID && body.CheckoutRequestID && body.ResultCode !== undefined);
  }
}

/**
 * Factory function
 */
export function createMPesaClient(config: MPesaConfig): MPesaClient {
  return new MPesaClient(config);
}
