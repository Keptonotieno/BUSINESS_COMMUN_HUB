import crypto from 'crypto';
import { normalizePhoneNumber, validatePhoneNumber } from './smsService';

export interface SendWhatsAppOptions {
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
  templateConfig?: any;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  mediaUrl?: string;
  caption?: string;
  campaignId?: string;
  contactId?: string;
}

export interface PayloadComparisonResult {
  isMatch: boolean;
  mismatches: string[];
  details: string;
}

export function comparePayloadWithTemplateConfig(payload: any, templateConfig?: any): PayloadComparisonResult {
  if (!payload || payload.type !== 'template' || !payload.template) {
    return { isMatch: true, mismatches: [], details: 'Not a template payload' };
  }

  const mismatches: string[] = [];

  if (!templateConfig) {
    return {
      isMatch: true,
      mismatches: [],
      details: `No local template configuration provided for comparison. Dispatching template '${payload.template?.name}'.`
    };
  }

  // 1. Exact template name comparison
  if (payload.template.name !== templateConfig.name) {
    mismatches.push(`Template name mismatch: payload specifies '${payload.template.name}', but WhatsApp Manager template configuration name is '${templateConfig.name}'`);
  }

  // 2. Language code comparison
  const payloadLang = payload.template.language?.code || payload.template.language;
  const configLang = typeof templateConfig.language === 'string' ? templateConfig.language : (templateConfig.language?.code || 'en_US');
  if (payloadLang !== configLang) {
    mismatches.push(`Language code mismatch: payload specifies '${payloadLang}', but template configuration specifies '${configLang}'`);
  }

  // 3. Components & variables comparison
  const configComponents = templateConfig.components || [];
  const bodyComponent = configComponents.find((c: any) => (c.type || '').toUpperCase() === 'BODY');

  if (bodyComponent && bodyComponent.text) {
    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g) || [];
    const expectedVarCount = new Set(matches).size;

    const payloadComponents = payload.template.components || [];
    const payloadBodyComp = payloadComponents.find((c: any) => (c.type || '').toLowerCase() === 'body');
    const actualParamCount = payloadBodyComp?.parameters?.length || 0;

    if (expectedVarCount > 0 && actualParamCount !== expectedVarCount) {
      mismatches.push(`Body parameter count mismatch: Template text in WhatsApp Manager contains ${expectedVarCount} variable placeholder(s) (${Array.from(new Set(matches)).join(', ')}), but outgoing payload provided ${actualParamCount} component parameter(s)`);
    }
  }

  // 4. Header format comparison
  const headerComponent = configComponents.find((c: any) => (c.type || '').toUpperCase() === 'HEADER');
  if (headerComponent) {
    const format = (headerComponent.format || 'TEXT').toUpperCase();
    if (format !== 'TEXT') {
      const payloadComponents = payload.template.components || [];
      const payloadHeaderComp = payloadComponents.find((c: any) => (c.type || '').toLowerCase() === 'header');
      if (!payloadHeaderComp) {
        mismatches.push(`Header format mismatch: Template in WhatsApp Manager specifies a '${format}' header component, but outgoing payload does not include a header parameter component`);
      }
    }
  }

  return {
    isMatch: mismatches.length === 0,
    mismatches,
    details: mismatches.length === 0
      ? `Outgoing payload strictly matches WhatsApp Manager template configuration for '${templateConfig.name}' (${configLang}).`
      : `Detected ${mismatches.length} mismatch(es) between outgoing payload and WhatsApp Manager template config: ${mismatches.join('; ')}`
  };
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  cost: number;
  provider: string;
  rawResponse?: any;
  payloadComparison?: PayloadComparisonResult;
  error?: string;
  errorCode?: number;
}

export interface MetaApiCallLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  action: 'SEND_MESSAGE' | 'GET_TEMPLATES' | 'SIMULATED_SEND';
  requestHeaders: Record<string, string>;
  requestPayload: any;
  payloadComparison?: PayloadComparisonResult;
  responseStatus: number;
  responseOk: boolean;
  responseBody: any;
  durationMs: number;
  error?: string;
}

export interface FetchTemplatesResult {
  templates: any[];
  error?: string;
  rawError?: any;
}

export interface DiagnosticCheckItem {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  message: string;
  details?: string;
}

export interface WhatsAppDiagnosticResult {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL_ERROR';
  credentials: {
    hasAccessToken: boolean;
    accessTokenMasked: string;
    hasPhoneNumberId: boolean;
    phoneNumberId: string;
    hasBusinessAccountId: boolean;
    businessAccountId: string;
    hasAppId: boolean;
    hasAppSecret: boolean;
  };
  checks: DiagnosticCheckItem[];
  phoneApiPing?: {
    status: number;
    ok: boolean;
    durationMs: number;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
    error?: any;
  };
  wabaTemplatesPing?: {
    status: number;
    ok: boolean;
    durationMs: number;
    totalTemplatesFetched?: number;
    activeTemplatesCount?: number;
    error?: any;
  };
  recommendations: string[];
}

export interface IWhatsAppProvider {
  name: string;
  sendSingleMessage(to: string, message: string, options?: SendWhatsAppOptions): Promise<SendWhatsAppResult>;
  sendBulkMessages(recipients: string[], message: string, options?: SendWhatsAppOptions): Promise<SendWhatsAppResult[]>;
  getTemplates(): Promise<FetchTemplatesResult>;
  runDiagnostics(): Promise<WhatsAppDiagnosticResult>;
  getApiCallLogs(): MetaApiCallLog[];
  clearApiCallLogs(): void;
}

export class MetaCloudWhatsAppProvider implements IWhatsAppProvider {
  public name = 'Meta WhatsApp Cloud API';
  private apiCallLogs: MetaApiCallLog[] = [];

  public getApiCallLogs(): MetaApiCallLog[] {
    return [...this.apiCallLogs];
  }

  public clearApiCallLogs(): void {
    this.apiCallLogs = [];
  }

  private logApiCall(log: MetaApiCallLog): void {
    this.apiCallLogs.unshift(log);
    if (this.apiCallLogs.length > 250) {
      this.apiCallLogs = this.apiCallLogs.slice(0, 250);
    }
  }

  private get config() {
    return {
      provider: process.env.WHATSAPP_PROVIDER || 'meta',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      verifyToken: process.env.META_VERIFY_TOKEN || 'safaricom_sacco_meta_verify_token_2026',
    };
  }

  public getConfigInfo() {
    const c = this.config;
    return {
      provider: c.provider,
      phoneNumberId: c.phoneNumberId,
      businessAccountId: c.businessAccountId,
      appId: c.appId,
      accessTokenSet: Boolean(c.accessToken),
      accessTokenPreview: c.accessToken ? `${c.accessToken.substring(0, 8)}...${c.accessToken.substring(c.accessToken.length - 6)}` : '',
      isConfigured: Boolean(c.accessToken && c.phoneNumberId),
      webhookVerifyTokenSet: Boolean(c.verifyToken),
      appSecretSet: Boolean(c.appSecret)
    };
  }

  public updateConfig(newConfig: {
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
  }) {
    if (newConfig.accessToken !== undefined) process.env.WHATSAPP_ACCESS_TOKEN = newConfig.accessToken;
    if (newConfig.phoneNumberId !== undefined) process.env.WHATSAPP_PHONE_NUMBER_ID = newConfig.phoneNumberId;
    if (newConfig.businessAccountId !== undefined) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = newConfig.businessAccountId;
    if (newConfig.appId !== undefined) process.env.META_APP_ID = newConfig.appId;
    if (newConfig.appSecret !== undefined) process.env.META_APP_SECRET = newConfig.appSecret;
    if (newConfig.verifyToken !== undefined) process.env.META_VERIFY_TOKEN = newConfig.verifyToken;
    console.log('[WhatsAppService] Updated Meta Cloud API credentials dynamically at runtime.');
    return this.getConfigInfo();
  }

  // Parse Meta Graph API Error codes for user-friendly error messages
  private parseMetaError(errorObj: any): { message: string; code?: number } {
    if (!errorObj) return { message: 'Unknown Meta API Error' };
    const code = errorObj.code;
    const type = errorObj.type;
    const subcode = errorObj.error_subcode;
    const details = typeof errorObj.error_data === 'string'
      ? errorObj.error_data
      : (errorObj.error_data?.details || errorObj.error_user_msg || (typeof errorObj.error_data === 'object' ? JSON.stringify(errorObj.error_data) : ''));
    const rawMsg = errorObj.message || details || 'Meta API returned error';

    if (type === 'OAuthException' || code === 190 || subcode === 463 || subcode === 467 || subcode === 490) {
      const extraDetails = details && details !== rawMsg ? ` Details: ${details}` : '';
      return {
        message: `Meta OAuth Error (${code || 190}): ${rawMsg}.${extraDetails} Please update your Meta WhatsApp Access Token, Phone Number ID, or Business Account ID in Settings.`,
        code: code || 190
      };
    }
    if (code === 100 || code === 131008) {
      return { message: `Meta Invalid Parameter Error (${code}): ${rawMsg}${details ? ` — ${details}` : ''}`, code };
    }
    if (code === 131026) {
      return { message: 'Undeliverable: Recipient phone number is not registered on WhatsApp or blocked.', code };
    }
    if (code === 132001) {
      return { message: 'Unapproved or missing Meta WhatsApp Template.', code };
    }
    if (code === 130429 || code === 80007) {
      return { message: 'Meta Cloud API Rate limit exceeded. Message queued for automatic retry.', code };
    }
    if (code === 10 || code === 200) {
      return { message: `Permission error (${code}): ${rawMsg}. App does not have WhatsApp Business Messaging permissions.`, code };
    }

    return { message: `Meta Error (${code || type || 'API'}): ${rawMsg}${details ? ` — ${details}` : ''}`, code };
  }

  public async sendSingleMessage(to: string, message: string, options?: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const normalizedTo = normalizePhoneNumber(to);
    if (!validatePhoneNumber(normalizedTo)) {
      return {
        success: false,
        recipient: to,
        status: 'FAILED',
        cost: 0,
        provider: this.name,
        error: `Invalid phone format: "${to}". Must comply with valid format (e.g., +254711223344 or 0758053000)`
      };
    }

    const recipientDigits = normalizedTo.replace(/[^\d]/g, '');
    const { accessToken, phoneNumberId, businessAccountId } = this.config;

    // Fallback simulation mode if credentials are incomplete
    if (!accessToken || !phoneNumberId) {
      console.warn(`[WhatsAppService] Meta credentials missing. Falling back to simulated dispatch for ${normalizedTo}`);
      const simRes = {
        success: true,
        messageId: `wa-sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipient: normalizedTo,
        status: 'DELIVERED' as const,
        cost: 2.50,
        provider: `${this.name} (Simulated Sandbox)`,
        rawResponse: { simulated: true, recipient: normalizedTo, timestamp: new Date().toISOString() }
      };
      this.logApiCall({
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        method: 'POST',
        endpoint: `https://graph.facebook.com/v19.0/${phoneNumberId || 'SIMULATED_PHONE_ID'}/messages`,
        action: 'SIMULATED_SEND',
        requestHeaders: { 'Authorization': 'Bearer SIMULATED_TOKEN', 'Content-Type': 'application/json' },
        requestPayload: { to: recipientDigits, text: message, options },
        responseStatus: 200,
        responseOk: true,
        responseBody: simRes.rawResponse,
        durationMs: 45
      });
      return simRes;
    }

    const startTime = Date.now();
    const endpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
    };

    if (options?.templateName) {
      payload.type = 'template';
      payload.template = {
        name: options.templateName,
        language: { code: options.templateLanguage || 'en_US' },
        components: options.templateComponents || []
      };
    } else if (options?.mediaUrl && options?.mediaType) {
      payload.type = options.mediaType;
      payload[options.mediaType] = {
        link: options.mediaUrl,
        caption: options.caption || message || undefined
      };
    } else {
      payload.type = 'text';
      payload.text = {
        preview_url: false,
        body: message
      };
    }

    // Compare outgoing payload against WhatsApp Manager template config
    const comparison = comparePayloadWithTemplateConfig(payload, options?.templateConfig);

    // Explicit Pre-Send Logging
    console.log(`==================== [WHATSAPP OUTGOING REQUEST LOG] ====================`);
    if (options?.templateName) {
      console.log(`[WhatsApp Template Name]: "${options.templateName}"`);
      console.log(`[WhatsApp Language Code]: "${options.templateLanguage || 'en_US'}"`);
    } else {
      console.log(`[WhatsApp Message Mode]: Free-form / Media message`);
    }
    console.log(`[WhatsApp Target Endpoint]: ${endpoint}`);
    console.log(`[WhatsApp Payload Verification]: ${comparison.details}`);
    if (!comparison.isMatch) {
      console.warn(`[WhatsApp Payload Mismatches]:`, comparison.mismatches);
    }
    console.log(`[WhatsApp Full Request Payload]:\n${JSON.stringify(payload, null, 2)}`);
    console.log(`==========================================================================`);

    const maskedAuth = accessToken ? `Bearer ${accessToken.substring(0, 8)}...${accessToken.slice(-4)}` : 'Bearer None';
    const requestHeaders = {
      'Authorization': maskedAuth,
      'Content-Type': 'application/json'
    };

    try {
      console.log(`[WhatsAppService] Dispatching Meta Cloud API request to +${recipientDigits}...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const durationMs = Date.now() - startTime;
      const responseData = await response.json();

      if (response.ok && responseData.messages && responseData.messages.length > 0) {
        const msgId = responseData.messages[0].id;
        console.log(`[WhatsAppService] Meta API Dispatch Success! Message ID: ${msgId}`);
        
        this.logApiCall({
          id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          method: 'POST',
          endpoint,
          action: 'SEND_MESSAGE',
          requestHeaders,
          requestPayload: payload,
          payloadComparison: comparison,
          responseStatus: response.status,
          responseOk: true,
          responseBody: responseData,
          durationMs
        });

        return {
          success: true,
          messageId: msgId,
          recipient: normalizedTo,
          status: 'DELIVERED',
          cost: 2.50, // KES 2.50 per WhatsApp Business conversation
          provider: this.name,
          rawResponse: responseData,
          payloadComparison: comparison
        };
      } else {
        const parsed = this.parseMetaError(responseData?.error);
        console.error(`[WhatsAppService] Meta API Failure:`, responseData);

        this.logApiCall({
          id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          method: 'POST',
          endpoint,
          action: 'SEND_MESSAGE',
          requestHeaders,
          requestPayload: payload,
          payloadComparison: comparison,
          responseStatus: response.status,
          responseOk: false,
          responseBody: responseData,
          durationMs,
          error: parsed.message
        });

        return {
          success: false,
          messageId: `wa-failed-${Date.now()}`,
          recipient: normalizedTo,
          status: 'FAILED',
          cost: 0,
          provider: this.name,
          rawResponse: responseData,
          payloadComparison: comparison,
          error: parsed.message,
          errorCode: parsed.code
        };
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[WhatsAppService] Network exception sending WhatsApp message:`, err);

      this.logApiCall({
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        method: 'POST',
        endpoint,
        action: 'SEND_MESSAGE',
        requestHeaders,
        requestPayload: payload,
        payloadComparison: comparison,
        responseStatus: 0,
        responseOk: false,
        responseBody: { error: err.message || 'Network Exception' },
        durationMs,
        error: err.message || 'Meta Cloud API Network failure'
      });

      return {
        success: false,
        recipient: normalizedTo,
        status: 'FAILED',
        cost: 0,
        provider: this.name,
        payloadComparison: comparison,
        error: err.message || 'Meta Cloud API Network failure'
      };
    }
  }

  public async sendBulkMessages(recipients: string[], message: string, options?: SendWhatsAppOptions): Promise<SendWhatsAppResult[]> {
    const results: SendWhatsAppResult[] = [];
    for (const recipient of recipients) {
      const res = await this.sendSingleMessage(recipient, message, options);
      results.push(res);
      // Small delay between calls to respect Meta rate limits safely
      await new Promise(r => setTimeout(r, 50));
    }
    return results;
  }

  public async getTemplates(): Promise<FetchTemplatesResult> {
    const { accessToken, businessAccountId } = this.config;
    if (!accessToken || !businessAccountId) {
      console.warn('[WhatsAppService] Meta credentials missing for template fetch.');
      return {
        templates: [],
        error: 'Meta WhatsApp Access Token or WABA Account ID missing. Please configure credentials in Settings.'
      };
    }

    const startTime = Date.now();
    const endpoint = `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?limit=100`;
    const maskedAuth = accessToken ? `Bearer ${accessToken.substring(0, 8)}...${accessToken.slice(-4)}` : 'Bearer None';
    const requestHeaders = { 'Authorization': maskedAuth };

    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const durationMs = Date.now() - startTime;
      const data = await response.json();

      const parsedError = !response.ok && data.error ? this.parseMetaError(data.error) : null;

      this.logApiCall({
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        method: 'GET',
        endpoint,
        action: 'GET_TEMPLATES',
        requestHeaders,
        requestPayload: { limit: 100 },
        responseStatus: response.status,
        responseOk: response.ok,
        responseBody: data,
        durationMs,
        error: parsedError ? parsedError.message : (response.ok ? undefined : 'Error fetching templates')
      });

      if (response.ok && Array.isArray(data.data)) {
        console.log(`[WhatsAppService] Successfully fetched ${data.data.length} live Meta templates from WABA ID ${businessAccountId}`);
        return { templates: data.data };
      } else {
        console.error('[WhatsAppService] Meta Cloud API returned error fetching message_templates:', data.error || data);
        return {
          templates: [],
          error: parsedError ? parsedError.message : (data.error?.message || 'Meta Cloud API returned error fetching templates'),
          rawError: data.error
        };
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error('[WhatsAppService] Error fetching Meta templates:', err);
      this.logApiCall({
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        method: 'GET',
        endpoint,
        action: 'GET_TEMPLATES',
        requestHeaders,
        requestPayload: { limit: 100 },
        responseStatus: 0,
        responseOk: false,
        responseBody: { error: err.message },
        durationMs,
        error: err.message
      });
      return { templates: [], error: err.message || 'Network error fetching Meta templates' };
    }
  }

  // Security HMAC SHA-256 Webhook signature validation (Req 10)
  public verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    const secret = this.config.appSecret;
    if (!secret) {
      // If secret is not set in dev, bypass or issue warning
      console.warn('[WhatsAppService] META_APP_SECRET not set, signature check bypassed in dev mode.');
      return true;
    }
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expectedHash = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', secret);
    const computedHash = hmac.update(rawBody).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  // Diagnostic Ping & Connectivity Test
  public async runDiagnostics(): Promise<WhatsAppDiagnosticResult> {
    const { accessToken, phoneNumberId, businessAccountId, appId, appSecret } = this.config;

    const maskedToken = accessToken
      ? `${accessToken.substring(0, 8)}...${accessToken.slice(-4)}`
      : 'NOT_CONFIGURED';

    const checks: DiagnosticCheckItem[] = [];
    const recommendations: string[] = [];

    // 1. Local Credentials Configuration Checks
    if (!accessToken) {
      checks.push({
        name: 'Access Token Configuration',
        status: 'FAIL',
        message: 'Meta WhatsApp Access Token is missing.',
        details: 'Requests to Meta Graph API cannot be authenticated without a valid access token.'
      });
      recommendations.push('Enter a valid Meta Access Token in WhatsApp Settings.');
    } else {
      checks.push({
        name: 'Access Token Configuration',
        status: 'PASS',
        message: `Access Token is present (${maskedToken}).`
      });
    }

    if (!phoneNumberId) {
      checks.push({
        name: 'Phone Number ID Configuration',
        status: 'FAIL',
        message: 'Phone Number ID is missing.',
        details: 'Required to route outbound message dispatches via Meta Cloud API.'
      });
      recommendations.push('Configure your Phone Number ID in WhatsApp Settings.');
    } else {
      checks.push({
        name: 'Phone Number ID Configuration',
        status: 'PASS',
        message: `Phone Number ID is configured (${phoneNumberId}).`
      });
    }

    if (!businessAccountId) {
      checks.push({
        name: 'WhatsApp Business Account ID Configuration',
        status: 'FAIL',
        message: 'Business Account ID (WABA ID) is missing.',
        details: 'Required to fetch approved message templates directly from Meta Graph API.'
      });
      recommendations.push('Configure your Business Account ID (WABA ID) in WhatsApp Settings.');
    } else {
      checks.push({
        name: 'WhatsApp Business Account ID Configuration',
        status: 'PASS',
        message: `Business Account ID is configured (${businessAccountId}).`
      });
    }

    let phoneApiPing: WhatsAppDiagnosticResult['phoneApiPing'] = undefined;
    let wabaTemplatesPing: WhatsAppDiagnosticResult['wabaTemplatesPing'] = undefined;

    // 2. Ping Meta Phone Number API Endpoint
    if (accessToken && phoneNumberId) {
      const pingStart = Date.now();
      const phoneEndpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`;
      try {
        const resp = await fetch(phoneEndpoint, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const durationMs = Date.now() - pingStart;
        const data = await resp.json();

        if (resp.ok) {
          phoneApiPing = {
            status: resp.status,
            ok: true,
            durationMs,
            displayPhoneNumber: data.display_phone_number,
            verifiedName: data.verified_name,
            qualityRating: data.quality_rating
          };
          checks.push({
            name: 'Meta Phone Number API Ping',
            status: 'PASS',
            message: `Meta Phone Number Endpoint reachable (HTTP ${resp.status} in ${durationMs}ms)`,
            details: `Display Number: ${data.display_phone_number || 'N/A'} | Verified Name: "${data.verified_name || 'N/A'}" | Quality Rating: ${data.quality_rating || 'UNKNOWN'}`
          });
        } else {
          const parsedErr = this.parseMetaError(data.error);
          phoneApiPing = {
            status: resp.status,
            ok: false,
            durationMs,
            error: data.error
          };
          checks.push({
            name: 'Meta Phone Number API Ping',
            status: 'FAIL',
            message: `Phone Number API query rejected (HTTP ${resp.status})`,
            details: parsedErr.message
          });

          if (data.error?.code === 190 || data.error?.type === 'OAuthException') {
            recommendations.push('Your Meta Access Token is invalid or expired. Generate a new System User token in Meta Business Manager and update Settings.');
          } else if (data.error?.code === 100) {
            recommendations.push(`Phone Number ID '${phoneNumberId}' was not found or is inaccessible with this Access Token.`);
          }
        }
      } catch (err: any) {
        phoneApiPing = {
          status: 0,
          ok: false,
          durationMs: Date.now() - pingStart,
          error: err.message
        };
        checks.push({
          name: 'Meta Phone Number API Ping',
          status: 'FAIL',
          message: 'Network error pinging Phone Number API endpoint',
          details: err.message
        });
      }
    }

    // 3. Ping Meta WABA Message Templates API Endpoint
    if (accessToken && businessAccountId) {
      const pingStart = Date.now();
      const tmplEndpoint = `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?limit=100`;
      try {
        const resp = await fetch(tmplEndpoint, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const durationMs = Date.now() - pingStart;
        const data = await resp.json();

        if (resp.ok && Array.isArray(data.data)) {
          const rawList = data.data;
          const activeList = rawList.filter((t: any) => {
            const status = String(t.status || '').toUpperCase();
            return (status === 'ACTIVE' || status === 'APPROVED') &&
                   !['IN_REVIEW', 'REJECTED', 'PAUSED', 'DISABLED'].includes(status);
          });

          wabaTemplatesPing = {
            status: resp.status,
            ok: true,
            durationMs,
            totalTemplatesFetched: rawList.length,
            activeTemplatesCount: activeList.length
          };

          if (activeList.length > 0) {
            checks.push({
              name: 'Meta Message Templates API Ping',
              status: 'PASS',
              message: `Fetched ${activeList.length} ACTIVE template(s) out of ${rawList.length} total from Meta WABA Account (${durationMs}ms)`,
              details: `Active Templates: ${activeList.map((t: any) => t.name).join(', ')}`
            });
          } else if (rawList.length > 0) {
            checks.push({
              name: 'Meta Message Templates API Ping',
              status: 'WARN',
              message: `Fetched ${rawList.length} template(s) from Meta WABA Account, but 0 are currently ACTIVE or APPROVED.`,
              details: `Templates status: ${rawList.map((t: any) => `${t.name} (${t.status})`).join(', ')}`
            });
            recommendations.push('Message templates must be in ACTIVE status in Meta WhatsApp Manager before they can be sent.');
          } else {
            checks.push({
              name: 'Meta Message Templates API Ping',
              status: 'WARN',
              message: `Connected to WABA Account ${businessAccountId}, but 0 templates exist in Meta Business Manager.`,
              details: 'No templates have been created in Meta WhatsApp Business Manager for this account yet.'
            });
            recommendations.push('Create new templates under Account Tools > Message Templates in Meta WhatsApp Manager.');
          }
        } else {
          const parsedErr = this.parseMetaError(data.error);
          wabaTemplatesPing = {
            status: resp.status,
            ok: false,
            durationMs,
            error: data.error
          };
          checks.push({
            name: 'Meta Message Templates API Ping',
            status: 'FAIL',
            message: `WABA Templates query rejected by Meta (HTTP ${resp.status})`,
            details: parsedErr.message
          });

          if (data.error?.code === 190 || data.error?.type === 'OAuthException') {
            recommendations.push('Meta Graph API returned OAuthException (Token Expired or Invalid).');
          } else if (data.error?.code === 100 || data.error?.subcode === 33) {
            recommendations.push(`Business Account ID '${businessAccountId}' was not found or is not linked to your Meta Developer App.`);
          }
        }
      } catch (err: any) {
        wabaTemplatesPing = {
          status: 0,
          ok: false,
          durationMs: Date.now() - pingStart,
          error: err.message
        };
        checks.push({
          name: 'Meta Message Templates API Ping',
          status: 'FAIL',
          message: 'Network error pinging Meta WABA Templates endpoint',
          details: err.message
        });
      }
    }

    const hasFail = checks.some(c => c.status === 'FAIL');
    const hasWarn = checks.some(c => c.status === 'WARN');
    const overallStatus = hasFail ? 'CRITICAL_ERROR' : (hasWarn ? 'WARNING' : 'HEALTHY');

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      credentials: {
        hasAccessToken: !!accessToken,
        accessTokenMasked: maskedToken,
        hasPhoneNumberId: !!phoneNumberId,
        phoneNumberId: phoneNumberId || 'NOT_CONFIGURED',
        hasBusinessAccountId: !!businessAccountId,
        businessAccountId: businessAccountId || 'NOT_CONFIGURED',
        hasAppId: !!appId,
        hasAppSecret: !!appSecret
      },
      checks,
      phoneApiPing,
      wabaTemplatesPing,
      recommendations
    };
  }
}

export const whatsappService = new MetaCloudWhatsAppProvider();
