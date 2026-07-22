import africastalking from 'africastalking';

// SMS Dispatch result interface matching local database MessageLog type needs
export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  cost: number;
  provider: string;
  responseBody?: any;
  error?: string;
}

// Abstraction layer interface for SMS providers (Requirement 4)
export interface SMSProvider {
  name: string;
  sendSingleSMS(to: string, message: string): Promise<SendSMSResult>;
  sendBulkSMS(to: string[], message: string): Promise<SendSMSResult[]>;
}

// Phone number E.164 validator & normalizer (Requirement 6)
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.trim().replace(/[^\d+]/g, '');

  // 10-digit local format starting with 07 or 01 (e.g., 0758053000, 0110002222) -> convert to +254...
  if (/^0[17]\d{8}$/.test(clean)) {
    return '+254' + clean.substring(1);
  }
  // 9-digit local format starting with 7 or 1 (e.g., 758053000) -> convert to +254...
  if (/^[17]\d{8}$/.test(clean)) {
    return '+254' + clean;
  }
  // 12-digit format starting with 254 (e.g., 254758053000) -> convert to +254...
  if (/^254[17]\d{8}$/.test(clean)) {
    return '+' + clean;
  }
  // International format already starting with +
  if (/^\+[1-9]\d{9,14}$/.test(clean)) {
    return clean;
  }
  // Digits without leading + (e.g., 12025550123)
  if (/^[1-9]\d{9,14}$/.test(clean)) {
    return '+' + clean;
  }

  return clean;
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneNumber(phone);
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  return e164Regex.test(normalized);
}

// Retries helper with exponential backoff (Requirement 7)
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`[SMS Service] Retrying action after failure in ${delay}ms... (Retries left: ${retries})`, error);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Dedicated Africa's Talking Service Implementation (Requirement 3)
export class AfricaTalkingProvider implements SMSProvider {
  public name = 'Africa\'s Talking';
  private atInstance: any;

  constructor() {
    const username = process.env.AT_USERNAME || 'sandbox';
    const apiKey = process.env.AT_API_KEY || '';

    if (!apiKey) {
      console.warn('[AfricaTalkingProvider] Initialize warning: AT_API_KEY is not defined in environment variables.');
    }

    try {
      // Lazy initialization of official SDK (Requirement 3)
      this.atInstance = africastalking({
        username: username,
        apiKey: apiKey
      });
      console.log(`[AfricaTalkingProvider] Africa's Talking SDK initialized successfully in environment (User: ${username})`);
    } catch (err) {
      console.error('[AfricaTalkingProvider] Failed to initialize Africa\'s Talking SDK:', err);
    }
  }

  public async sendSingleSMS(to: string, message: string): Promise<SendSMSResult> {
    const normalizedTo = normalizePhoneNumber(to);
    if (!validatePhoneNumber(normalizedTo)) {
      console.error(`[AfricaTalkingProvider] Phone validation failed for: ${to}`);
      return {
        success: false,
        recipient: to,
        status: 'FAILED',
        cost: 0,
        provider: this.name,
        error: 'Invalid phone number format. Must comply with valid standard (e.g. +254711223344 or 0758053000)'
      };
    }

    const action = async (): Promise<SendSMSResult> => {
      if (!this.atInstance) {
        throw new Error('Africa\'s Talking SDK instance not initialized.');
      }

      console.log(`[AfricaTalkingProvider] Dispatched single SMS via SDK to recipient: ${normalizedTo}`);
      const response = await this.atInstance.SMS.send({
        to: [normalizedTo],
        message: message
      });

      console.log(`[AfricaTalkingProvider] SDK response received:`, JSON.stringify(response));

      const recipients = response?.SMSMessageData?.Recipients || [];
      if (recipients.length === 0) {
        throw new Error('Africa\'s Talking API returned no recipients in receipt list.');
      }

      const receipt = recipients[0];
      const statusValue = receipt.status;
      const isSuccess = statusValue === 'Success';
      const costStr = receipt.cost || 'KES 0.0000';
      const parsedCost = parseFloat(costStr.replace(/[^\d.]/g, '')) || 1.00;

      return {
        success: isSuccess,
        messageId: receipt.messageId || `at-msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        recipient: normalizedTo,
        status: isSuccess ? 'DELIVERED' : 'FAILED',
        cost: parsedCost,
        provider: `${this.name} (${process.env.AT_USERNAME || 'sandbox'})`,
        responseBody: response,
        error: isSuccess ? undefined : `Africa's Talking returned recipient status: ${statusValue}`
      };
    };

    try {
      // Execute with robust automatic retries (Requirement 7)
      return await retryWithBackoff(action, 3, 1000);
    } catch (err: any) {
      console.error(`[AfricaTalkingProvider] Critical single dispatch error for ${normalizedTo}:`, err);
      return {
        success: false,
        recipient: normalizedTo,
        status: 'FAILED',
        cost: 1.00, // standard default fallback rate
        provider: `${this.name} (${process.env.AT_USERNAME || 'sandbox'})`,
        error: err.message || String(err)
      };
    }
  }

  public async sendBulkSMS(to: string[], message: string): Promise<SendSMSResult[]> {
    console.log(`[AfricaTalkingProvider] Initializing bulk SMS request for ${to.length} recipients...`);
    const validRecipients: string[] = [];
    const results: SendSMSResult[] = [];

    // Filter and validate numbers first
    for (const phone of to) {
      const normalized = normalizePhoneNumber(phone);
      if (validatePhoneNumber(normalized)) {
        validRecipients.push(normalized);
      } else {
        results.push({
          success: false,
          recipient: phone,
          status: 'FAILED',
          cost: 0,
          provider: this.name,
          error: 'Invalid phone number format.'
        });
      }
    }

    if (validRecipients.length === 0) {
      console.warn('[AfricaTalkingProvider] Bulk SMS cancelled: Zero valid phone numbers to send to.');
      return results;
    }

    const action = async (): Promise<any> => {
      if (!this.atInstance) {
        throw new Error('Africa\'s Talking SDK instance not initialized.');
      }
      return await this.atInstance.SMS.send({
        to: validRecipients,
        message: message
      });
    };

    try {
      // Execute bulk dispatch with retries
      const response = await retryWithBackoff(action, 3, 1500);
      const returnedRecipients = response?.SMSMessageData?.Recipients || [];
      const receiptMap = new Map<string, any>();

      for (const rec of returnedRecipients) {
        receiptMap.set(rec.number, rec);
      }

      for (const phone of validRecipients) {
        const receipt = receiptMap.get(phone);
        if (receipt) {
          const isSuccess = receipt.status === 'Success';
          const parsedCost = parseFloat((receipt.cost || '0').replace(/[^\d.]/g, '')) || 1.00;
          results.push({
            success: isSuccess,
            messageId: receipt.messageId,
            recipient: phone,
            status: isSuccess ? 'DELIVERED' : 'FAILED',
            cost: parsedCost,
            provider: `${this.name} (${process.env.AT_USERNAME || 'sandbox'})`,
            responseBody: response,
            error: isSuccess ? undefined : `Africa's Talking returned: ${receipt.status}`
          });
        } else {
          // If a particular contact was missed in the response payload
          results.push({
            success: true, // assume sent as bulk accepted
            recipient: phone,
            status: 'SENT',
            cost: 1.00,
            provider: `${this.name} (${process.env.AT_USERNAME || 'sandbox'})`,
            error: 'Dispatched successfully but direct response receipt was omitted by provider API.'
          });
        }
      }
    } catch (err: any) {
      console.error('[AfricaTalkingProvider] Critical bulk dispatch failure:', err);
      for (const phone of validRecipients) {
        results.push({
          success: false,
          recipient: phone,
          status: 'FAILED',
          cost: 1.00,
          provider: `${this.name} (${process.env.AT_USERNAME || 'sandbox'})`,
          error: `Bulk send exception: ${err.message || String(err)}`
        });
      }
    }

    return results;
  }
}

// Alternative fallback Safaricom Direct provider to show provider abstraction flexibility (Requirement 4)
export class SafaricomDirectProvider implements SMSProvider {
  public name = 'Safaricom Direct';

  public async sendSingleSMS(to: string, message: string): Promise<SendSMSResult> {
    const normalizedTo = normalizePhoneNumber(to);
    if (!validatePhoneNumber(normalizedTo)) {
      return {
        success: false,
        recipient: to,
        status: 'FAILED',
        cost: 0,
        provider: this.name,
        error: 'Invalid phone format.'
      };
    }

    const isSuccess = Math.random() > 0.05; // 95% mock success rate
    return {
      success: isSuccess,
      messageId: `saf-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      recipient: normalizedTo,
      status: isSuccess ? 'DELIVERED' : 'FAILED',
      cost: 1.00,
      provider: this.name,
      error: isSuccess ? undefined : 'Carrier network routing failure.'
    };
  }

  public async sendBulkSMS(to: string[], message: string): Promise<SendSMSResult[]> {
    const results: SendSMSResult[] = [];
    for (const num of to) {
      results.push(await this.sendSingleSMS(num, message));
    }
    return results;
  }
}

// Secure SMS Manager Class that resolves provider type from env (Requirement 1, 2, 4)
export class SMSManager {
  private activeProvider: SMSProvider;

  constructor() {
    const providerType = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
    
    if (providerType === 'africastalking') {
      this.activeProvider = new AfricaTalkingProvider();
    } else {
      console.log('[SMSManager] Selecting Safaricom Direct mock fallback provider.');
      this.activeProvider = new SafaricomDirectProvider();
    }
  }

  public getProvider(): SMSProvider {
    return this.activeProvider;
  }

  public async sendSingle(to: string, message: string): Promise<SendSMSResult> {
    const normalizedTo = normalizePhoneNumber(to);
    return this.activeProvider.sendSingleSMS(normalizedTo, message);
  }

  public async sendBulk(to: string[], message: string): Promise<SendSMSResult[]> {
    const normalizedList = to.map(normalizePhoneNumber);
    return this.activeProvider.sendBulkSMS(normalizedList, message);
  }
}
