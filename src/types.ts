export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isMfaEnabled: boolean;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  balance: number; // KES SMS Balance
  plan: 'FREE_TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
  billingCycle: 'monthly' | 'yearly';
}

export interface Contact {
  id: string;
  tenantId?: string;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  department?: string;
  position?: string;
  location?: string;
  gender?: string;
  dateOfBirth?: string;
  tags: string[];
  listIds?: string[];
  groupIds?: string[];
  notes?: string;
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  resolution?: 'MERGE' | 'SKIP' | 'OVERWRITE';
}

export interface ContactList {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  type: 'LIST' | 'GROUP' | 'SEGMENT';
  category?: 'Customers' | 'Staff' | 'VIP Clients' | 'Suppliers' | 'Students' | 'Parents' | 'Marketing Subscribers' | 'Custom';
  contactIds?: string[];
  segmentFilter?: {
    tag?: string;
    location?: string;
    department?: string;
    minSavings?: number;
  };
  contactCount: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  tenantId?: string;
  name: string;
  status: 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  channels: ('SMS' | 'WHATSAPP' | 'EMAIL')[];
  audienceType: 'LIST' | 'GROUP' | 'SEGMENT' | 'ALL_CONTACTS';
  audienceId?: string;
  audienceIds?: string[];
  audienceName?: string;
  smsTemplate?: string;
  whatsappTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  scheduledAt?: string;
  batchSize?: number;
  batchDelayMs?: number;
  totalRecipients: number;
  processedCount?: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  bouncedCount: number;
  readCount: number;
  cost: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageLog {
  id: string;
  recipient: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
  provider: string;
  cost: number;
  timestamp: string;
  failoverReason?: string;
}

export interface WebhookLog {
  id: string;
  url: string;
  event: string;
  status: number;
  response: string;
  timestamp: string;
}

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: 'BIRTHDAY' | 'SIGNUP' | 'RENEWAL' | 'MANUAL';
  status: 'ACTIVE' | 'DRAFT';
  steps: {
    id: string;
    type: 'SEND_SMS' | 'SEND_EMAIL' | 'SEND_WHATSAPP' | 'DELAY';
    config: Record<string, any>;
  }[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  ipAddress: string;
  timestamp: string;
}

export interface WhatsAppMessage {
  id: string;
  tenantId?: string;
  campaignId?: string;
  contactId?: string;
  whatsappMessageId?: string;
  recipient: string;
  messageContent: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  mediaUrl?: string;
  templateName?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  providerResponse?: any;
  errorDetails?: string;
  timestamp: string;
  direction?: 'INBOUND' | 'OUTBOUND';
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: any[];
}

export interface WhatsAppConfig {
  provider: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId: string;
  accessTokenSet?: boolean;
  accessTokenPreview?: string;
  isConfigured: boolean;
  webhookVerifyTokenSet: boolean;
  appSecretSet: boolean;
}
