import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { SMSManager, validatePhoneNumber, normalizePhoneNumber } from './src/lib/smsService.js';
import { whatsappService } from './src/lib/whatsappService.js';

// Load environment variables from .env file
dotenv.config();

// Initialize secure SMS Manager service
const smsManager = new SMSManager();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Configure JSON body parser with rawBody verification capture for Webhook HMAC Validation
app.use(express.json({
  verify: (req: any, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('webhooks')) {
      req.rawBody = buf;
    }
  }
}));

// Database file path
const DB_FILE = path.join(__dirname, 'server_db.json');

// Types definitions matching src/types.ts
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  balance: number;
  plan: 'FREE_TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
  billingCycle: 'monthly' | 'yearly';
}

interface Contact {
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
  resolution?: 'MERGE' | 'SKIP' | 'OVERWRITE';
  createdAt: string;
  updatedAt?: string;
}

interface ContactList {
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

interface Campaign {
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

interface MessageLog {
  id: string;
  recipient: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
  provider: string;
  cost: number;
  timestamp: string;
  failoverReason?: string;
}

interface WhatsAppMessage {
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

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: any[];
}

interface WebhookLog {
  id: string;
  url: string;
  event: string;
  status: number;
  response: string;
  timestamp: string;
}

interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
}

interface AutomationWorkflow {
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

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  ipAddress: string;
  timestamp: string;
}

// Seeds
const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't-safaricom-sacco',
    name: 'Safaricom Investment Sacco',
    subdomain: 'safaricomsacco',
    balance: 48950.00,
    plan: 'BUSINESS',
    billingCycle: 'yearly'
  },
  {
    id: 't-equator-retail',
    name: 'Equator Retailers Kenya',
    subdomain: 'equator',
    balance: 1250.00,
    plan: 'STARTER',
    billingCycle: 'monthly'
  },
  {
    id: 't-kilimo-trust',
    name: 'Kilimo Farmers Cooperative',
    subdomain: 'kilimotrust',
    balance: 0.00,
    plan: 'FREE_TRIAL',
    billingCycle: 'monthly'
  }
];

const SEED_CONTACT_LISTS: ContactList[] = [
  {
    id: 'list-1',
    name: 'Safaricom Sacco Premium Members',
    description: 'High net worth cooperative members with active savings above KES 100,000.',
    type: 'GROUP',
    contactIds: ['c-1', 'c-4'],
    contactCount: 1250,
    createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'list-2',
    name: 'Nairobi Metropolitan Audience',
    description: 'Dynamic segment targeting all contacts registered in Nairobi county region.',
    type: 'SEGMENT',
    segmentFilter: { tag: 'Nairobi' },
    contactCount: 4800,
    createdAt: '2026-06-05T10:00:00Z'
  },
  {
    id: 'list-3',
    name: 'Agricultural Cooperative Farmers',
    description: 'Registered farming cooperative members across Nakuru, Eldoret & Rift Valley.',
    type: 'GROUP',
    contactIds: ['c-5'],
    contactCount: 8900,
    createdAt: '2026-06-10T12:00:00Z'
  },
  {
    id: 'list-4',
    name: 'General Member Master Directory',
    description: 'Complete unsegmented list of all active Sacco account holders.',
    type: 'LIST',
    contactIds: ['c-1', 'c-2', 'c-3', 'c-4', 'c-5'],
    contactCount: 15400,
    createdAt: '2026-06-01T00:00:00Z'
  }
];

const SEED_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    phoneNumber: '+254711223344',
    email: 'micheal.kamau@sacco-member.co.ke',
    firstName: 'Michael',
    lastName: 'Kamau',
    tags: ['Premium', 'Sacco Member', 'Nairobi'],
    listIds: ['list-1', 'list-4'],
    customFields: { memberId: 'SAC-8902', savingsBalance: 'KES 420,000' },
    createdAt: '2026-06-15T09:00:00Z'
  },
  {
    id: 'c-2',
    phoneNumber: '+254722334455',
    email: 'sarah.atiento@gmail.com',
    firstName: 'Sarah',
    lastName: 'Atieno',
    tags: ['Regular', 'Sacco Member', 'Kisumu'],
    listIds: ['list-4'],
    customFields: { memberId: 'SAC-4512', savingsBalance: 'KES 89,500' },
    createdAt: '2026-06-16T11:30:00Z'
  },
  {
    id: 'c-3',
    phoneNumber: '+254733445566',
    email: 'john.ndege@yahoo.com',
    firstName: 'John',
    lastName: 'Ndege',
    tags: ['Lapsed', 'Debtor', 'Mombasa'],
    listIds: ['list-4'],
    customFields: { memberId: 'SAC-1102', savingsBalance: 'KES 2,100' },
    createdAt: '2026-06-18T14:15:00Z'
  },
  {
    id: 'c-4',
    phoneNumber: '+254755667788',
    email: 'esther.mumbi@outlook.com',
    firstName: 'Esther',
    lastName: 'Mumbi',
    tags: ['Premium', 'Nairobi'],
    listIds: ['list-1', 'list-4'],
    customFields: { memberId: 'SAC-9022', savingsBalance: 'KES 1,200,000' },
    createdAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'c-5',
    phoneNumber: '+254788990011',
    email: 'david.omondi@agritrust.or.ke',
    firstName: 'David',
    lastName: 'Omondi',
    tags: ['Farmer', 'Nakuru'],
    listIds: ['list-3', 'list-4'],
    customFields: { memberId: 'AGR-404', savingsBalance: 'KES 15,200' },
    createdAt: '2026-06-22T08:45:00Z'
  }
];

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Q3 Dividend Payout Notice',
    status: 'COMPLETED',
    channels: ['SMS', 'WHATSAPP'],
    audienceType: 'GROUP',
    audienceId: 'list-1',
    audienceName: 'Safaricom Sacco Premium Members',
    smsTemplate: 'Hello {{first_name}}, Q3 dividend payouts for Safaricom Sacco are ready. Your profile balance is {{savingsBalance}}.',
    whatsappTemplate: 'sacco_dividend_payout',
    scheduledAt: '2026-07-10T08:00:00Z',
    batchSize: 200,
    batchDelayMs: 500,
    totalRecipients: 1250,
    processedCount: 1250,
    sentCount: 1250,
    deliveredCount: 1210,
    failedCount: 40,
    bouncedCount: 0,
    readCount: 920,
    cost: 3120.00,
    createdAt: '2026-07-09T14:00:00Z'
  },
  {
    id: 'camp-2',
    name: 'Midyear Sacco Loan Promotion',
    status: 'PROCESSING',
    channels: ['SMS', 'EMAIL'],
    audienceType: 'SEGMENT',
    audienceId: 'list-2',
    audienceName: 'Nairobi Metropolitan Audience',
    smsTemplate: 'Dear {{first_name}}, expand your portfolio with our 8% interest loans. Member ID: {{memberId}}.',
    emailSubject: 'Exclusive 8% Flexible Loan Offer for Member {{memberId}}',
    emailTemplate: 'Hello {{first_name}},\n\nAs a valued Nairobi member (ID: {{memberId}}), you qualify for instant loan approvals.',
    scheduledAt: '2026-07-21T05:00:00Z',
    batchSize: 250,
    batchDelayMs: 1000,
    totalRecipients: 4800,
    processedCount: 3200,
    sentCount: 3100,
    deliveredCount: 2950,
    failedCount: 150,
    bouncedCount: 45,
    readCount: 1210,
    cost: 7200.00,
    createdAt: '2026-07-20T11:00:00Z'
  },
  {
    id: 'camp-3',
    name: 'Annual General Meeting Invitation',
    status: 'SCHEDULED',
    channels: ['EMAIL'],
    audienceType: 'GROUP',
    audienceId: 'list-3',
    audienceName: 'Agricultural Cooperative Farmers',
    emailSubject: 'Official AGM Invitation for Cooperative Farmers',
    emailTemplate: 'Dear {{first_name}},\n\nYou are invited to attend the 2026 Annual General Meeting.',
    scheduledAt: '2026-07-25T10:00:00Z',
    batchSize: 500,
    batchDelayMs: 1000,
    totalRecipients: 8900,
    processedCount: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    bouncedCount: 0,
    readCount: 0,
    cost: 0.00,
    createdAt: '2026-07-20T16:30:00Z'
  },
  {
    id: 'camp-4',
    name: 'Member Satisfaction Survey Link',
    status: 'DRAFT',
    channels: ['WHATSAPP'],
    audienceType: 'LIST',
    audienceId: 'list-4',
    audienceName: 'General Member Master Directory',
    whatsappTemplate: 'sacco_member_survey',
    batchSize: 100,
    batchDelayMs: 500,
    totalRecipients: 500,
    processedCount: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    bouncedCount: 0,
    readCount: 0,
    cost: 0.00,
    createdAt: '2026-07-21T02:15:00Z'
  }
];

const SEED_MESSAGE_LOGS: MessageLog[] = [
  {
    id: 'mlog-1',
    recipient: '+254711223344',
    channel: 'SMS',
    status: 'DELIVERED',
    provider: 'Safaricom Direct',
    cost: 1.00,
    timestamp: '2026-07-21T05:28:10Z'
  },
  {
    id: 'mlog-2',
    recipient: '+254722334455',
    channel: 'WHATSAPP',
    status: 'READ',
    provider: 'Meta Cloud API',
    cost: 2.50,
    timestamp: '2026-07-21T05:29:15Z'
  },
  {
    id: 'mlog-3',
    recipient: '+254733445566',
    channel: 'SMS',
    status: 'DELIVERED',
    provider: 'AfricasTalking (Failover)',
    cost: 1.50,
    timestamp: '2026-07-21T05:30:02Z',
    failoverReason: 'Safaricom Gateway Error 503 (Temporary Network Busy)'
  },
  {
    id: 'mlog-4',
    recipient: 'john.ndege@yahoo.com',
    channel: 'EMAIL',
    status: 'BOUNCED',
    provider: 'AWS SES',
    cost: 0.05,
    timestamp: '2026-07-21T05:31:40Z',
    failoverReason: 'Email address john.ndege@yahoo.com is invalid (Bounce Code 550)'
  },
  {
    id: 'mlog-5',
    recipient: '+254755667788',
    channel: 'SMS',
    status: 'FAILED',
    provider: 'Safaricom Direct',
    cost: 0.00,
    timestamp: '2026-07-21T05:32:00Z',
    failoverReason: 'Destination Network Absent (Subscriber Inactive)'
  }
];

const INITIAL_API_KEYS: APIKey[] = [
  {
    id: 'k-1',
    name: 'Production Portal Integration',
    keyPrefix: 'live_sk_4f89a91c',
    scopes: ['messages.write', 'delivery.read'],
    createdAt: '2026-07-01T12:00:00Z'
  },
  {
    id: 'k-2',
    name: 'Development Sandbox Key',
    keyPrefix: 'test_sk_a22e88cb',
    scopes: ['messages.write', 'delivery.read', 'contacts.write'],
    createdAt: '2026-07-15T09:45:00Z'
  }
];

const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: 'w-1',
    name: 'Member Welcome Automation',
    trigger: 'SIGNUP',
    status: 'ACTIVE',
    steps: [
      { id: 'ws-1', type: 'SEND_SMS', config: { template: 'Hello {{first_name}}, welcome to Safaricom Investment Sacco! Your account has been registered successfully.' } },
      { id: 'ws-2', type: 'DELAY', config: { value: 1, unit: 'days' } },
      { id: 'ws-3', type: 'SEND_EMAIL', config: { subject: 'Complete your Sacco Profile Registration', template: 'Hey {{first_name}}, please log in and fill your beneficiary details.' } }
    ],
    createdAt: '2026-07-05T10:00:00Z'
  },
  {
    id: 'w-2',
    name: 'Birthday Greetings Automation',
    trigger: 'BIRTHDAY',
    status: 'ACTIVE',
    steps: [
      { id: 'ws-4', type: 'SEND_WHATSAPP', config: { template: 'Happy Birthday {{first_name}}! 🎂 Safaricom Sacco values you. Enjoy your special day!' } }
    ],
    createdAt: '2026-07-08T11:00:00Z'
  },
  {
    id: 'w-3',
    name: 'Sacco Dividend Reminders',
    trigger: 'RENEWAL',
    status: 'DRAFT',
    steps: [
      { id: 'ws-5', type: 'SEND_SMS', config: { template: 'Dear {{first_name}}, your monthly savings balance is below KES 2,000 threshold. Topup to secure dividends.' } }
    ],
    createdAt: '2026-07-18T15:30:00Z'
  }
];

const SEED_WHATSAPP_MESSAGES: WhatsAppMessage[] = [
  {
    id: 'wa-msg-101',
    campaignId: 'camp-1',
    contactId: 'c-1',
    whatsappMessageId: 'wamid.HBgLMTIzMDY0MDIyMzQ2MzM0M0FCQ0RFRkdISUpL',
    recipient: '+254711223344',
    messageContent: 'Dear Michael, your Safaricom Sacco annual dividend payout of KES 420,000 has been credited.',
    templateName: 'sacco_dividend_payout',
    status: 'READ',
    providerResponse: { messaging_product: 'whatsapp', status: 'read' },
    timestamp: '2026-07-21T05:20:10Z',
    direction: 'OUTBOUND'
  },
  {
    id: 'wa-msg-102',
    campaignId: 'camp-2',
    contactId: 'c-2',
    whatsappMessageId: 'wamid.HBgLMTIzMDY0MDIyMzQ2MzM0M0xNTk9QUVJTVFU',
    recipient: '+254722334455',
    messageContent: 'Hello Sarah, please rate your satisfaction with Safaricom Sacco services by clicking the link.',
    templateName: 'sacco_member_survey',
    status: 'DELIVERED',
    providerResponse: { messaging_product: 'whatsapp', status: 'delivered' },
    timestamp: '2026-07-21T05:22:15Z',
    direction: 'OUTBOUND'
  },
  {
    id: 'wa-msg-103',
    contactId: 'c-3',
    whatsappMessageId: 'wamid.HBgLMTIzMDY0MDIyMzQ2MzM0M1pYWVdWVVRTUg',
    recipient: '+254733445566',
    messageContent: 'Thank you! When is the next Sacco AGM meeting scheduled?',
    status: 'READ',
    timestamp: '2026-07-21T05:25:00Z',
    direction: 'INBOUND'
  }
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'a-1',
    userEmail: 'keptonokoth@gmail.com',
    action: 'USER_LOGIN_SUCCESS',
    ipAddress: '197.232.145.89',
    timestamp: '2026-07-21T05:10:00-07:00'
  },
  {
    id: 'a-2',
    userEmail: 'keptonokoth@gmail.com',
    action: 'API_KEY_CREATED',
    ipAddress: '197.232.145.89',
    timestamp: '2026-07-21T05:12:15-07:00'
  }
];

// In-Memory Database state
let db: {
  tenants: Tenant[];
  contactLists: ContactList[];
  contacts: Contact[];
  campaigns: Campaign[];
  messageLogs: MessageLog[];
  whatsappMessages: WhatsAppMessage[];
  approvedWhatsAppTemplates: WhatsAppTemplate[];
  apiKeys: APIKey[];
  workflows: AutomationWorkflow[];
  webhookLogs: WebhookLog[];
  auditLogs: AuditLog[];
} = {
  tenants: INITIAL_TENANTS,
  contactLists: SEED_CONTACT_LISTS,
  contacts: SEED_CONTACTS,
  campaigns: SEED_CAMPAIGNS,
  messageLogs: SEED_MESSAGE_LOGS,
  whatsappMessages: SEED_WHATSAPP_MESSAGES,
  approvedWhatsAppTemplates: [],
  apiKeys: INITIAL_API_KEYS,
  workflows: INITIAL_WORKFLOWS,
  webhookLogs: [],
  auditLogs: SEED_AUDIT_LOGS,
};

// Load database from file
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      db = {
        ...db,
        ...loaded,
        contactLists: loaded.contactLists || SEED_CONTACT_LISTS,
        whatsappMessages: loaded.whatsappMessages || SEED_WHATSAPP_MESSAGES,
        approvedWhatsAppTemplates: [],
      };
      console.log('Database loaded successfully from server_db.json. Counts: Contacts:', db.contacts.length, 'Lists:', db.contactLists.length, 'Campaigns:', db.campaigns.length);
    } else {
      saveDB();
    }
  } catch (error) {
    console.error('Error loading server DB, seeding defaults:', error);
  }
}

// Save database to file
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing server DB:', error);
  }
}

loadDB();

// WebSocket connections list
const wsClients = new Set<WebSocket>();

// Broadcast helper
function broadcast(message: any) {
  const payload = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Helper to push a notification
function pushSystemNotification(title: string, message: string, type: 'success' | 'alert' | 'info' = 'success') {
  broadcast({
    type: 'TOAST',
    payload: {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      type,
    },
  });
}

// REST Endpoints
app.get('/api/data', (req, res) => {
  res.json(db);
});

// Update Tenant
app.post('/api/tenant/update-name', (req, res) => {
  const { name } = req.body;
  if (db.tenants.length > 0) {
    db.tenants[0].name = name;
    saveDB();
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    res.json({ success: true, tenants: db.tenants });
  } else {
    res.status(404).json({ error: 'Tenant not found' });
  }
});

// Contact Lists Endpoints
app.get('/api/contact-lists', (req, res) => {
  res.json({ success: true, contactLists: db.contactLists });
});

app.post('/api/contact-lists', (req, res) => {
  const newList: ContactList = req.body;
  db.contactLists.unshift(newList);
  saveDB();
  broadcast({ type: 'UPDATE_CONTACT_LISTS', payload: db.contactLists });
  pushSystemNotification('Audience Group Created', `Created audience group/segment "${newList.name}" with ${newList.contactCount} targets.`);
  res.json({ success: true, contactLists: db.contactLists });
});

app.delete('/api/contact-lists/:id', (req, res) => {
  const { id } = req.params;
  db.contactLists = db.contactLists.filter(l => l.id !== id);
  saveDB();
  broadcast({ type: 'UPDATE_CONTACT_LISTS', payload: db.contactLists });
  res.json({ success: true, contactLists: db.contactLists });
});

// Add Contact
app.post('/api/contacts', (req, res) => {
  const contact: Contact = req.body;
  if (contact.phoneNumber) {
    contact.phoneNumber = normalizePhoneNumber(contact.phoneNumber);
  }
  
  // Duplicate check by phone or email for tenant
  const existing = db.contacts.find(c => 
    (c.tenantId === contact.tenantId || !c.tenantId || !contact.tenantId) &&
    ((contact.phoneNumber && normalizePhoneNumber(c.phoneNumber) === contact.phoneNumber) || 
     (contact.email && c.email.toLowerCase() === contact.email.toLowerCase()))
  );

  if (existing) {
    // Merge contact
    existing.firstName = contact.firstName || existing.firstName;
    existing.lastName = contact.lastName || existing.lastName;
    existing.company = contact.company || existing.company;
    existing.department = contact.department || existing.department;
    existing.position = contact.position || existing.position;
    existing.location = contact.location || existing.location;
    existing.gender = contact.gender || existing.gender;
    existing.dateOfBirth = contact.dateOfBirth || existing.dateOfBirth;
    if (contact.tags) {
      existing.tags = Array.from(new Set([...existing.tags, ...contact.tags]));
    }
    if (contact.listIds || contact.groupIds) {
      const incomingGroups = contact.listIds || contact.groupIds || [];
      const currentGroups = existing.listIds || existing.groupIds || [];
      const merged = Array.from(new Set([...currentGroups, ...incomingGroups]));
      existing.listIds = merged;
      existing.groupIds = merged;
    }
    existing.updatedAt = new Date().toISOString();
  } else {
    if (!contact.tenantId && db.tenants.length > 0) {
      contact.tenantId = db.tenants[0].id;
    }
    if (!contact.listIds && contact.groupIds) {
      contact.listIds = contact.groupIds;
    }
    if (!contact.groupIds && contact.listIds) {
      contact.groupIds = contact.listIds;
    }
    db.contacts.unshift(contact);
  }

  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  res.json({ success: true, contacts: db.contacts });
});

// Bulk Contacts with deduplication strategy
app.post('/api/contacts/bulk', (req, res) => {
  const { contacts: incomingContacts, strategy = 'MERGE', targetGroupIds = [] }: { contacts: Contact[]; strategy?: 'MERGE' | 'SKIP' | 'OVERWRITE'; targetGroupIds?: string[] } = req.body.contacts ? req.body : { contacts: req.body };

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  incomingContacts.forEach(contact => {
    if (contact.phoneNumber) {
      contact.phoneNumber = normalizePhoneNumber(contact.phoneNumber);
    }
    const phoneNorm = (contact.phoneNumber || '').trim();
    const emailNorm = (contact.email || '').trim().toLowerCase();

    const existingIdx = db.contacts.findIndex(c => 
      (phoneNorm && normalizePhoneNumber(c.phoneNumber) === phoneNorm) ||
      (emailNorm && c.email.toLowerCase() === emailNorm)
    );

    const mergedGroups = Array.from(new Set([
      ...(contact.listIds || contact.groupIds || []),
      ...targetGroupIds
    ]));

    const effectiveStrategy = contact.resolution || strategy;

    if (existingIdx >= 0) {
      if (effectiveStrategy === 'SKIP') {
        skippedCount++;
        return;
      }

      if (effectiveStrategy === 'OVERWRITE') {
        db.contacts[existingIdx] = {
          ...contact,
          id: db.contacts[existingIdx].id,
          listIds: mergedGroups,
          groupIds: mergedGroups,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        // MERGE & UPDATE strategy
        const existing = db.contacts[existingIdx];
        existing.firstName = contact.firstName || existing.firstName;
        existing.lastName = contact.lastName || existing.lastName;
        existing.company = contact.company || existing.company;
        existing.department = contact.department || existing.department;
        existing.position = contact.position || existing.position;
        existing.location = contact.location || existing.location;
        existing.gender = contact.gender || existing.gender;
        existing.dateOfBirth = contact.dateOfBirth || existing.dateOfBirth;
        if (contact.tags) existing.tags = Array.from(new Set([...existing.tags, ...contact.tags]));
        
        const combined = Array.from(new Set([
          ...(existing.listIds || existing.groupIds || []),
          ...mergedGroups
        ]));
        existing.listIds = combined;
        existing.groupIds = combined;
        existing.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    } else {
      const newContact: Contact = {
        ...contact,
        id: contact.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        listIds: mergedGroups,
        groupIds: mergedGroups,
        createdAt: contact.createdAt || new Date().toISOString()
      };
      db.contacts.unshift(newContact);
      addedCount++;
    }
  });

  // Update contactCounts on lists
  db.contactLists.forEach(list => {
    const matching = db.contacts.filter(c => (c.listIds || c.groupIds || []).includes(list.id));
    list.contactCount = matching.length;
  });

  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  broadcast({ type: 'UPDATE_CONTACT_LISTS', payload: db.contactLists });
  pushSystemNotification('Import Completed', `Imported contacts: ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`);
  res.json({ success: true, addedCount, updatedCount, skippedCount, contacts: db.contacts });
});

// Delete Single Contact
app.delete('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  db.contacts = db.contacts.filter(c => c.id !== id);
  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  res.json({ success: true, contacts: db.contacts });
});

// Batch Delete Contacts
app.post('/api/contacts/batch-delete', (req, res) => {
  const { contactIds }: { contactIds: string[] } = req.body;
  db.contacts = db.contacts.filter(c => !contactIds.includes(c.id));
  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  pushSystemNotification('Batch Delete', `Deleted ${contactIds.length} contact records.`);
  res.json({ success: true, contacts: db.contacts });
});

// Batch Assign to Groups
app.post('/api/contacts/batch-assign-groups', (req, res) => {
  const { contactIds, groupIds }: { contactIds: string[]; groupIds: string[] } = req.body;

  db.contacts.forEach(c => {
    if (contactIds.includes(c.id)) {
      const current = new Set(c.listIds || c.groupIds || []);
      groupIds.forEach(g => current.add(g));
      const arr = Array.from(current);
      c.listIds = arr;
      c.groupIds = arr;
    }
  });

  // Re-calculate list counts
  db.contactLists.forEach(list => {
    list.contactCount = db.contacts.filter(c => (c.listIds || c.groupIds || []).includes(list.id)).length;
  });

  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  broadcast({ type: 'UPDATE_CONTACT_LISTS', payload: db.contactLists });
  pushSystemNotification('Audience Group Updated', `Assigned ${contactIds.length} contacts to target groups.`);
  res.json({ success: true, contacts: db.contacts, contactLists: db.contactLists });
});

// Batch Remove from Groups
app.post('/api/contacts/batch-remove-groups', (req, res) => {
  const { contactIds, groupIds }: { contactIds: string[]; groupIds: string[] } = req.body;

  db.contacts.forEach(c => {
    if (contactIds.includes(c.id)) {
      const current = (c.listIds || c.groupIds || []).filter(g => !groupIds.includes(g));
      c.listIds = current;
      c.groupIds = current;
    }
  });

  db.contactLists.forEach(list => {
    list.contactCount = db.contacts.filter(c => (c.listIds || c.groupIds || []).includes(list.id)).length;
  });

  saveDB();
  broadcast({ type: 'UPDATE_CONTACTS', payload: db.contacts });
  broadcast({ type: 'UPDATE_CONTACT_LISTS', payload: db.contactLists });
  res.json({ success: true, contacts: db.contacts, contactLists: db.contactLists });
});

// Add Campaign
app.post('/api/campaigns', (req, res) => {
  const campaign: Campaign = req.body;
  db.campaigns.unshift(campaign);
  saveDB();
  broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
  pushSystemNotification('Campaign Created', `Campaign "${campaign.name}" created targeting ${campaign.totalRecipients} recipients.`);

  if (campaign.status === 'PROCESSING' || campaign.status === 'QUEUED') {
    runRealtimeCampaignSimulation(campaign.id);
  }

  res.json({ success: true, campaigns: db.campaigns });
});

// Update Campaign Status (pause, resume, start, cancel)
app.post('/api/campaigns/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const campaign = db.campaigns.find(c => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const prevStatus = campaign.status;
  campaign.status = status;
  campaign.updatedAt = new Date().toISOString();
  saveDB();
  broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });

  if ((status === 'PROCESSING' || status === 'QUEUED') && prevStatus !== 'PROCESSING') {
    runRealtimeCampaignSimulation(id);
    pushSystemNotification('Campaign Dispatch Active', `Processing campaign "${campaign.name}" asynchronously across selected channels.`);
  } else if (status === 'PAUSED') {
    pushSystemNotification('Campaign Paused', `Campaign "${campaign.name}" has been paused.`, 'alert');
  } else if (status === 'CANCELLED') {
    pushSystemNotification('Campaign Cancelled', `Campaign "${campaign.name}" was cancelled.`, 'alert');
  }

  res.json({ success: true, campaigns: db.campaigns });
});

// Retry Failed Campaign Recipients
app.post('/api/campaigns/:id/retry', (req, res) => {
  const { id } = req.params;
  const campaign = db.campaigns.find(c => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const failedToRetry = campaign.failedCount;
  if (failedToRetry > 0) {
    campaign.failedCount = 0;
    campaign.status = 'PROCESSING';
    campaign.updatedAt = new Date().toISOString();
    saveDB();
    broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
    pushSystemNotification('Retry Initiated', `Retrying dispatch for ${failedToRetry} failed recipients in campaign "${campaign.name}".`);
    runRealtimeCampaignSimulation(id);
  }

  res.json({ success: true, campaigns: db.campaigns });
});

// Delete Campaign
app.delete('/api/campaigns/:id', (req, res) => {
  const { id } = req.params;
  db.campaigns = db.campaigns.filter(c => c.id !== id);
  saveDB();
  broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
  res.json({ success: true, campaigns: db.campaigns });
});

// Add API Key
app.post('/api/api-keys', (req, res) => {
  const key: APIKey = req.body;
  db.apiKeys.unshift(key);
  saveDB();
  broadcast({ type: 'UPDATE_API_KEYS', payload: db.apiKeys });
  res.json({ success: true, apiKeys: db.apiKeys });
});

// Delete API Key
app.delete('/api/api-keys/:id', (req, res) => {
  const { id } = req.params;
  db.apiKeys = db.apiKeys.filter(k => k.id !== id);
  saveDB();
  broadcast({ type: 'UPDATE_API_KEYS', payload: db.apiKeys });
  res.json({ success: true, apiKeys: db.apiKeys });
});

// Add Workflow
app.post('/api/workflows', (req, res) => {
  const wf: AutomationWorkflow = req.body;
  db.workflows.unshift(wf);
  saveDB();
  broadcast({ type: 'UPDATE_WORKFLOWS', payload: db.workflows });
  res.json({ success: true, workflows: db.workflows });
});

// Toggle Workflow Status
app.post('/api/workflows/:id/toggle', (req, res) => {
  const { id } = req.params;
  const wf = db.workflows.find(w => w.id === id);
  if (wf) {
    wf.status = wf.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    saveDB();
    broadcast({ type: 'UPDATE_WORKFLOWS', payload: db.workflows });
    res.json({ success: true, workflows: db.workflows });
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

// Delete Workflow
app.delete('/api/workflows/:id', (req, res) => {
  const { id } = req.params;
  db.workflows = db.workflows.filter(w => w.id !== id);
  saveDB();
  broadcast({ type: 'UPDATE_WORKFLOWS', payload: db.workflows });
  res.json({ success: true, workflows: db.workflows });
});

// Upgrade Subscription
app.post('/api/billing/upgrade', (req, res) => {
  const { plan } = req.body;
  if (db.tenants.length > 0) {
    db.tenants[0].plan = plan;
    saveDB();
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    pushSystemNotification('Plan Upgraded', `Tenant namespace has been upgraded to ${plan}.`);
    res.json({ success: true, tenants: db.tenants });
  } else {
    res.status(404).json({ error: 'Tenant not found' });
  }
});

// M-PESA Live Callback Simulation
app.post('/api/billing/topup', (req, res) => {
  const { amount, phone } = req.body;
  if (db.tenants.length > 0) {
    // Initiate payment flow
    pushSystemNotification('Payment Initiated', `M-PESA STK Push request dispatched to ${phone} for KES ${amount.toLocaleString()}`, 'success');

    // Simulate real-world asynchronous callback in 3 seconds
    setTimeout(() => {
      if (db.tenants.length > 0) {
        db.tenants[0].balance += Number(amount);
        
        // Log transaction
        const audit: AuditLog = {
          id: `audit-mpesa-${Date.now()}`,
          userEmail: 'keptonokoth@gmail.com',
          action: `WALLET_MPESA_TOPUP_SUCCESS: KES ${amount} completed via Safaricom Daraja API`,
          ipAddress: '197.232.145.89',
          timestamp: new Date().toISOString()
        };
        db.auditLogs.unshift(audit);

        saveDB();
        
        // Broadcast updates in real time
        broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
        broadcast({ type: 'UPDATE_AUDIT_LOGS', payload: db.auditLogs });
        pushSystemNotification('Top Up Confirmed', `M-PESA STK push of KES ${amount.toLocaleString()} received successfully. Core balance credited.`, 'success');
      }
    }, 3000);

    res.json({ success: true, message: 'STK push sent' });
  } else {
    res.status(404).json({ error: 'Tenant not found' });
  }
});

// Trigger Developer API SMS Event
app.post('/api/trigger-api-sms', async (req, res) => {
  const { to, message } = req.body;
  const normalizedTo = normalizePhoneNumber(to || '');

  // Debit cost
  const rate = 1.00;
  if (db.tenants.length > 0 && db.tenants[0].balance >= rate) {
    db.tenants[0].balance -= rate;

    const result = await smsManager.sendSingle(normalizedTo, message);

    // Append to message logs
    const newLog: MessageLog = {
      id: `mlog-api-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      recipient: normalizedTo,
      channel: 'SMS',
      status: result.status,
      provider: result.provider,
      cost: rate,
      timestamp: new Date().toISOString(),
      failoverReason: result.error
    };
    db.messageLogs.unshift(newLog);

    // Save DB and broadcast
    saveDB();
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });

    pushSystemNotification(
      result.success ? 'API SMS Dispatched' : 'API SMS Dispatch Failed',
      result.success
        ? `Delivered transactional message to ${to} via ${result.provider}.`
        : `Failed to deliver message to ${to}: ${result.error || 'API Error'}`,
      result.success ? 'success' : 'alert'
    );
    res.json({ success: result.success, log: newLog });
  } else {
    res.status(400).json({ error: 'Insufficient balance to complete SMS API dispatch.' });
  }
});

// Dedicated Test SMS Endpoint (Requirement 5)
app.post('/api/sms/test', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Recipient phone number (to) and message body (message) are required.' });
  }

  const rate = 1.00;
  if (db.tenants.length > 0 && db.tenants[0].balance < rate) {
    return res.status(400).json({ error: 'Insufficient balance to complete Test SMS dispatch.' });
  }

  // Validate and normalize number first (Requirement 6)
  const normalizedTo = normalizePhoneNumber(to);
  if (!validatePhoneNumber(normalizedTo)) {
    return res.status(400).json({ error: 'Validation failed: phone number must be valid format (e.g., +254711223344 or 0758053000).' });
  }

  if (db.tenants.length > 0) {
    db.tenants[0].balance -= rate;
  }

  try {
    const result = await smsManager.sendSingle(normalizedTo, message);

    const newLog: MessageLog = {
      id: `mlog-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      recipient: to,
      channel: 'SMS',
      status: result.status,
      provider: result.provider,
      cost: rate,
      timestamp: new Date().toISOString(),
      failoverReason: result.error
    };
    db.messageLogs.unshift(newLog);

    // Save DB and broadcast updates
    saveDB();
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });

    pushSystemNotification(
      result.success ? 'Test SMS Dispatched' : 'Test SMS Failed',
      result.success
        ? `Successfully sent test message to ${to} via ${result.provider}.`
        : `Test message to ${to} failed: ${result.error || 'Unknown carrier error'}.`,
      result.success ? 'success' : 'alert'
    );

    res.json({
      success: result.success,
      log: newLog,
      providerResponse: result.responseBody,
      error: result.error
    });
  } catch (err: any) {
    console.error('[SMS API] Test SMS dispatch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==========================================
// Meta WhatsApp Cloud API Service & Webhooks
// ==========================================

// Webhook Verification (GET /webhooks/whatsapp and GET /api/webhooks/whatsapp) - Requirement 7
const handleWhatsAppWebhookVerification = (req: express.Request, res: express.Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_VERIFY_TOKEN || 'safaricom_sacco_meta_verify_token_2026';

  console.log(`[WhatsApp Webhook Verification] Mode: ${mode}, Token: ${token}`);

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook Verification] Success! Verified with Meta Cloud API.');
    return res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp Webhook Verification] Token mismatch or invalid mode.');
    return res.status(403).json({ error: 'Webhook verification token mismatch' });
  }
};

app.get('/webhooks/whatsapp', handleWhatsAppWebhookVerification);
app.get('/api/webhooks/whatsapp', handleWhatsAppWebhookVerification);

// Webhook Processing (POST /webhooks/whatsapp and POST /api/webhooks/whatsapp) - Requirement 7 & 10
const handleWhatsAppWebhookEvent = async (req: express.Request, res: express.Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // Validate signature (Requirement 10)
  const isValidSig = whatsappService.verifyWebhookSignature(rawBody, signature);
  if (!isValidSig) {
    console.warn('[WhatsApp Webhook] Invalid HMAC signature detected.');
    return res.status(401).json({ error: 'Invalid X-Hub-Signature-256 header' });
  }

  const body = req.body;

  // Log Webhook event
  const whLog: WebhookLog = {
    id: `wh-wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    url: req.originalUrl,
    event: 'whatsapp.cloud_event',
    status: 200,
    response: JSON.stringify(body),
    timestamp: new Date().toISOString()
  };
  db.webhookLogs.unshift(whLog);

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value || {};

        // Process incoming message delivery/read/failed statuses
        if (val.statuses && Array.isArray(val.statuses)) {
          for (const st of val.statuses) {
            const waMsgId = st.id;
            const statusStr = (st.status || '').toUpperCase(); // DELIVERED, READ, FAILED, SENT
            const recipient = '+' + (st.recipient_id || '');

            let mappedStatus: WhatsAppMessage['status'] = 'SENT';
            if (statusStr === 'DELIVERED') mappedStatus = 'DELIVERED';
            else if (statusStr === 'READ') mappedStatus = 'READ';
            else if (statusStr === 'FAILED') mappedStatus = 'FAILED';

            let errorMsg = st.errors && st.errors.length > 0 ? (st.errors[0].title || st.errors[0].message) : undefined;

            // Find and update matching WhatsApp message in DB
            const target = db.whatsappMessages.find(m => m.whatsappMessageId === waMsgId || normalizePhoneNumber(m.recipient) === normalizePhoneNumber(recipient));
            if (target) {
              target.status = mappedStatus;
              if (errorMsg) target.errorDetails = errorMsg;
              target.providerResponse = st;
            }

            // Update main messageLogs
            const targetLog = db.messageLogs.find(l => l.recipient === recipient && l.channel === 'WHATSAPP');
            if (targetLog) {
              targetLog.status = mappedStatus === 'READ' ? 'READ' : mappedStatus === 'DELIVERED' ? 'DELIVERED' : mappedStatus === 'FAILED' ? 'FAILED' : 'SENT';
              if (errorMsg) targetLog.failoverReason = errorMsg;
            }

            // Update associated campaign statistics
            if (target?.campaignId) {
              const camp = db.campaigns.find(c => c.id === target.campaignId);
              if (camp) {
                if (mappedStatus === 'DELIVERED') camp.deliveredCount += 1;
                else if (mappedStatus === 'READ') {
                  camp.deliveredCount += 1;
                  camp.readCount += 1;
                } else if (mappedStatus === 'FAILED') camp.failedCount += 1;
              }
            }
          }
        }

        // Process incoming user messages (INBOUND)
        if (val.messages && Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            const senderPhone = '+' + msg.from;
            const textContent = msg.text?.body || msg.caption || `[${msg.type || 'media'} attachment]`;
            const mediaUrl = msg.image?.url || msg.document?.url || msg.video?.url || msg.audio?.url;

            const newInboundMsg: WhatsAppMessage = {
              id: `wa-in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              whatsappMessageId: msg.id,
              recipient: senderPhone,
              messageContent: textContent,
              mediaUrl: mediaUrl,
              mediaType: msg.type && ['image', 'document', 'video', 'audio'].includes(msg.type) ? msg.type : undefined,
              status: 'READ',
              timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
              direction: 'INBOUND'
            };

            db.whatsappMessages.unshift(newInboundMsg);

            // Append to main message log
            const newLog: MessageLog = {
              id: `mlog-wa-in-${Date.now()}`,
              recipient: senderPhone,
              channel: 'WHATSAPP',
              status: 'READ',
              provider: 'Meta Cloud API (Inbound)',
              cost: 0.00,
              timestamp: new Date().toISOString()
            };
            db.messageLogs.unshift(newLog);

            pushSystemNotification(
              'Incoming WhatsApp Message',
              `Received message from ${senderPhone}: "${textContent.substring(0, 45)}..."`,
              'info'
            );
          }
        }
      }
    }

    saveDB();
    broadcast({ type: 'UPDATE_WHATSAPP_MESSAGES', payload: db.whatsappMessages });
    broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });
    broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
    broadcast({ type: 'UPDATE_WEBHOOK_LOGS', payload: db.webhookLogs });
  }

  return res.status(200).json({ status: 'EVENT_RECEIVED' });
};

app.post('/webhooks/whatsapp', handleWhatsAppWebhookEvent);
app.post('/api/webhooks/whatsapp', handleWhatsAppWebhookEvent);

// Configuration endpoint (Requirement 1)
app.get('/api/whatsapp/config', (req, res) => {
  res.json(whatsappService.getConfigInfo());
});

app.post('/api/whatsapp/config', (req, res) => {
  const { accessToken, phoneNumberId, businessAccountId, appId, appSecret, verifyToken } = req.body;
  
  const updatedInfo = whatsappService.updateConfig({
    accessToken,
    phoneNumberId,
    businessAccountId,
    appId,
    appSecret,
    verifyToken
  });

  pushSystemNotification(
    'Meta Credentials Updated',
    'WhatsApp Business API credentials and access token updated successfully.',
    'success'
  );

  res.json({
    success: true,
    message: 'WhatsApp Access Token and API Configuration updated successfully.',
    config: updatedInfo
  });
});

// Helper: Detect whether recipient is inside or outside 24-hour customer service window
function checkCustomerWindow(recipientPhone: string): {
  isInsideWindow: boolean;
  lastInboundTimestamp?: string;
  hoursRemaining?: number;
} {
  const norm = normalizePhoneNumber(recipientPhone);
  const inbounds = (db.whatsappMessages || []).filter(
    m => m.direction === 'INBOUND' && normalizePhoneNumber(m.recipient) === norm
  );
  if (!inbounds || inbounds.length === 0) {
    return { isInsideWindow: false };
  }
  inbounds.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const lastInbound = inbounds[0];
  const diffMs = Date.now() - new Date(lastInbound.timestamp).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 24) {
    return {
      isInsideWindow: true,
      lastInboundTimestamp: lastInbound.timestamp,
      hoursRemaining: Number((24 - diffHours).toFixed(1))
    };
  } else {
    return {
      isInsideWindow: false,
      lastInboundTimestamp: lastInbound.timestamp,
      hoursRemaining: 0
    };
  }
}

// Helper: Validate requested template or auto-resolve approved template outside 24h window
async function validateOrResolveTemplate(requestedTemplate?: string, isOutsideWindow?: boolean): Promise<{
  valid: boolean;
  templateName?: string;
  language?: string;
  templateConfig?: any;
  autoApplied?: boolean;
  error?: string;
}> {
  const fetchResult = await whatsappService.getTemplates();
  const rawMetaTemplates = Array.isArray(fetchResult) ? fetchResult : (fetchResult.templates || []);

  if (!Array.isArray(fetchResult) && fetchResult.error) {
    return {
      valid: false,
      error: `Meta Template Fetch Error: ${fetchResult.error}`
    };
  }

  // Filter: ONLY templates returned by Meta with ACTIVE or APPROVED status
  // Exclude IN_REVIEW, REJECTED, PAUSED, DISABLED
  const activeTemplates = rawMetaTemplates.filter(t => {
    const status = String(t.status || '').toUpperCase();
    return (status === 'ACTIVE' || status === 'APPROVED') &&
           !['IN_REVIEW', 'REJECTED', 'PAUSED', 'DISABLED'].includes(status);
  });

  console.log(`[Meta Cloud API Verification]: Validating template request against ${activeTemplates.length} ACTIVE template(s) fetched directly from Meta API (0 local/hardcoded definitions).`);

  // Case 1: Template explicitly requested
  if (requestedTemplate) {
    const reqClean = requestedTemplate.trim().toLowerCase();
    const templateByName = activeTemplates.find(t => t.name && t.name.trim().toLowerCase() === reqClean);
    
    if (!templateByName) {
      const availStr = activeTemplates.map(t => `${t.name} (${t.status})`).join(', ') || 'No active templates found in connected Meta WABA Account';
      return {
        valid: false,
        error: `Meta Template Error: WhatsApp template '${requestedTemplate}' is not active or does not exist in your connected Meta WABA Account. Active templates returned by Meta Cloud API: [${availStr}].`
      };
    }

    const lang = typeof templateByName.language === 'string' ? templateByName.language : (templateByName.language?.code || 'en_US');
    return {
      valid: true,
      templateName: templateByName.name, // EXACT template name returned by Meta API
      language: lang, // EXACT language code returned by Meta API
      templateConfig: templateByName
    };
  }

  // Case 2: Outside 24h customer window and NO template requested
  if (isOutsideWindow) {
    const defaultTemplate = activeTemplates[0];

    if (!defaultTemplate) {
      return {
        valid: false,
        error: "Meta Policy Error: Recipient is outside the 24-hour customer service window, and no ACTIVE WhatsApp templates were returned by Meta Cloud API."
      };
    }

    const lang = typeof defaultTemplate.language === 'string' ? defaultTemplate.language : (defaultTemplate.language?.code || 'en_US');
    return {
      valid: true,
      templateName: defaultTemplate.name, // EXACT template name returned by Meta API
      language: lang, // EXACT language code returned by Meta API
      templateConfig: defaultTemplate,
      autoApplied: true
    };
  }

  // Case 3: Inside 24h window & no template requested
  return { valid: true };
}

// Check 24-Hour Customer Window Status Endpoint
app.get('/api/whatsapp/window-check', (req, res) => {
  const phone = (req.query.phone as string) || '';
  if (!phone) {
    return res.status(400).json({ error: 'phone query parameter is required' });
  }
  const status = checkCustomerWindow(phone);
  res.json({
    recipient: normalizePhoneNumber(phone),
    ...status,
    policyRequirement: status.isInsideWindow
      ? 'Customer service window is active. Free-form text and templates are permitted.'
      : 'Customer service window is closed. Meta messaging policy requires an approved WhatsApp template.'
  });
});

// Approved Message Templates List & Create (Dynamic Meta Cloud API Fetching)
app.get('/api/whatsapp/templates', async (req, res) => {
  const fetchResult = await whatsappService.getTemplates();
  const rawMetaTemplates = Array.isArray(fetchResult) ? fetchResult : (fetchResult.templates || []);
  const metaFetchError = !Array.isArray(fetchResult) ? fetchResult.error : undefined;

  // Filter: Only ACTIVE or APPROVED status templates returned by Meta.
  // Exclude IN_REVIEW, REJECTED, PAUSED, DISABLED.
  const activeTemplates = rawMetaTemplates.filter(t => {
    const status = String(t.status || '').toUpperCase();
    return (status === 'ACTIVE' || status === 'APPROVED') &&
           !['IN_REVIEW', 'REJECTED', 'PAUSED', 'DISABLED'].includes(status);
  });

  const excludedTemplates = rawMetaTemplates.filter(t => {
    const status = String(t.status || '').toUpperCase();
    return !((status === 'ACTIVE' || status === 'APPROVED') &&
           !['IN_REVIEW', 'REJECTED', 'PAUSED', 'DISABLED'].includes(status));
  });

  console.log(`[Meta Cloud API Verification]: Loaded ${activeTemplates.length} ACTIVE template(s) directly from Meta Graph API for WABA Account. Zero local/hardcoded template definitions exist.`);
  activeTemplates.forEach((t, i) => {
    console.log(`  └─ [Meta Active Template #${i + 1}]: name="${t.name}", language="${typeof t.language === 'string' ? t.language : (t.language?.code || 'en_US')}", category="${t.category}", status="${t.status}"`);
  });

  res.json({
    success: !metaFetchError,
    templates: activeTemplates,
    rawMetaTemplatesCount: rawMetaTemplates.length,
    activeMetaTemplatesCount: activeTemplates.length,
    excludedCount: excludedTemplates.length,
    error: metaFetchError,
    source: 'META_WHATSAPP_CLOUD_API',
    fetchedAt: new Date().toISOString()
  });
});

app.post('/api/whatsapp/templates', (req, res) => {
  res.status(400).json({
    error: 'Direct template creation must be performed in Meta WhatsApp Business Manager. Once approved by Meta, click Refresh to fetch active templates directly from Meta Cloud API.'
  });
});

app.delete('/api/whatsapp/templates/:id', (req, res) => {
  res.status(400).json({
    error: 'Template deletion must be performed directly in Meta WhatsApp Business Manager.'
  });
});

// Diagnostic check endpoint (Pings Meta Cloud API endpoints and returns connectivity & token status)
app.get('/api/whatsapp/diagnostic', async (req, res) => {
  try {
    const diagnosticData = await whatsappService.runDiagnostics();
    res.json(diagnosticData);
  } catch (err: any) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overallStatus: 'CRITICAL_ERROR',
      error: err.message || 'Internal error executing WhatsApp API diagnostic check'
    });
  }
});

// All WhatsApp Messages List (Requirement 6)
app.get('/api/whatsapp/messages', (req, res) => {
  res.json({ messages: db.whatsappMessages || [] });
});

// Meta Cloud API Call History & Raw Response Debug Logs
app.get('/api/whatsapp/api-logs', (req, res) => {
  res.json({ logs: whatsappService.getApiCallLogs() });
});

app.delete('/api/whatsapp/api-logs', (req, res) => {
  whatsappService.clearApiCallLogs();
  res.json({ success: true, logs: [] });
});

// Real-Time Analytics Endpoint (Requirement 8 - No hardcoded statistics)
app.get('/api/whatsapp/analytics', (req, res) => {
  const msgs = db.whatsappMessages || [];
  const total = msgs.length;
  const queued = msgs.filter(m => m.status === 'QUEUED').length;
  const sent = msgs.filter(m => m.status === 'SENT').length;
  const delivered = msgs.filter(m => m.status === 'DELIVERED').length;
  const read = msgs.filter(m => m.status === 'READ').length;
  const failed = msgs.filter(m => m.status === 'FAILED').length;

  const deliveredTotal = delivered + read;
  const successRate = total > 0 ? Number(((deliveredTotal / total) * 100).toFixed(1)) : 100.0;
  const readRate = deliveredTotal > 0 ? Number(((read / deliveredTotal) * 100).toFixed(1)) : 0.0;

  const activeCampaigns = db.campaigns.filter(c => c.channels.includes('WHATSAPP') && c.status === 'PROCESSING');

  res.json({
    totalMessages: total,
    queued,
    sent,
    delivered,
    read,
    failed,
    successRate,
    readRate,
    activeCampaignsCount: activeCampaigns.length,
    recentMessages: msgs.slice(0, 15)
  });
});

// Dedicated Test WhatsApp Message Endpoint (Requirement 11)
app.post('/api/whatsapp/test', async (req, res) => {
  const { to, message, templateName, mediaType, mediaUrl, caption } = req.body;

  if (!to || (!message && !templateName && !mediaUrl)) {
    return res.status(400).json({ error: 'Recipient phone number (to) and message text, template, or media URL are required.' });
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!validatePhoneNumber(normalizedTo)) {
    return res.status(400).json({ error: `Validation failed for "${to}". Must comply with valid format (e.g., +254711223344 or 0758053000).` });
  }

  // Check 24-Hour Customer Window & Template Compliance
  const windowStatus = checkCustomerWindow(normalizedTo);
  const templateResolution = await validateOrResolveTemplate(templateName, !windowStatus.isInsideWindow);
  if (!templateResolution.valid) {
    return res.status(400).json({ error: templateResolution.error });
  }

  const finalTemplateName = templateResolution.templateName;
  const finalTemplateLang = templateResolution.language || 'en_US';

  const rate = 2.50;
  if (db.tenants.length > 0 && db.tenants[0].balance < rate) {
    return res.status(400).json({ error: 'Insufficient balance to complete Test WhatsApp dispatch.' });
  }

  if (db.tenants.length > 0) {
    db.tenants[0].balance -= rate;
  }

  try {
    const result = await whatsappService.sendSingleMessage(normalizedTo, message || '', {
      templateName: finalTemplateName,
      templateLanguage: finalTemplateLang,
      templateConfig: templateResolution.templateConfig,
      mediaType,
      mediaUrl,
      caption
    });

    const autoNotice = templateResolution.autoApplied
      ? ` [Auto-applied approved template '${finalTemplateName}' due to 24h window policy]`
      : '';

    const newWaMsg: WhatsAppMessage = {
      id: `wa-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      whatsappMessageId: result.messageId,
      recipient: normalizedTo,
      messageContent: (message || finalTemplateName || `[${mediaType || 'media'} attachment]`) + autoNotice,
      mediaType,
      mediaUrl,
      templateName: finalTemplateName,
      status: result.status,
      providerResponse: result.rawResponse,
      errorDetails: result.error,
      timestamp: new Date().toISOString(),
      direction: 'OUTBOUND'
    };
    db.whatsappMessages.unshift(newWaMsg);

    const newLog: MessageLog = {
      id: `mlog-wa-test-${Date.now()}`,
      recipient: normalizedTo,
      channel: 'WHATSAPP',
      status: result.status === 'READ' ? 'READ' : result.status === 'DELIVERED' ? 'DELIVERED' : result.status === 'FAILED' ? 'FAILED' : 'SENT',
      provider: result.provider,
      cost: rate,
      timestamp: new Date().toISOString(),
      failoverReason: result.error
    };
    db.messageLogs.unshift(newLog);

    saveDB();
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });
    broadcast({ type: 'UPDATE_WHATSAPP_MESSAGES', payload: db.whatsappMessages });

    pushSystemNotification(
      result.success ? 'Meta WhatsApp Dispatched' : 'WhatsApp Dispatch Failed',
      result.success
        ? `Sent WhatsApp message to ${normalizedTo} via ${result.provider}.${templateResolution.autoApplied ? ' (Approved Template Auto-Applied)' : ''}`
        : `WhatsApp message to ${normalizedTo} failed: ${result.error || 'Meta API error'}.`,
      result.success ? 'success' : 'alert'
    );

    res.json({
      success: result.success,
      messageId: result.messageId,
      recipient: normalizedTo,
      status: result.status,
      provider: result.provider,
      cost: rate,
      templateApplied: finalTemplateName,
      templateLanguage: finalTemplateLang,
      customerWindowStatus: windowStatus,
      rawMetaResponse: result.rawResponse,
      error: result.error
    });
  } catch (err: any) {
    console.error('[WhatsApp API] Test dispatch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Configure webhook endpoint to receive and process delivery reports in real time (Requirement 9)
app.post('/api/webhooks/delivery-reports', express.urlencoded({ extended: true }), (req, res) => {
  const { id, status, phoneNumber, failureReason } = req.body;

  console.log(`[Webhook Delivery Report] MessageID: ${id}, Status: ${status}, Phone: ${phoneNumber}, Error: ${failureReason}`);

  // Create standard webhook log
  const webhookLog: WebhookLog = {
    id: `wh-cb-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    url: '/api/webhooks/delivery-reports',
    event: 'sms.delivery_report',
    status: 200,
    response: JSON.stringify(req.body),
    timestamp: new Date().toISOString()
  };
  db.webhookLogs.unshift(webhookLog);

  // Map incoming provider delivery status
  let mappedStatus: MessageLog['status'] = 'DELIVERED';
  if (status === 'Success' || status === 'Delivered') {
    mappedStatus = 'DELIVERED';
  } else if (status === 'Failed' || status === 'Rejected') {
    mappedStatus = 'FAILED';
  } else if (status === 'Sent' || status === 'Submitted') {
    mappedStatus = 'SENT';
  }

  // Find the log
  const targetLog = db.messageLogs.find(l => l.id === id || l.recipient === phoneNumber);
  if (targetLog) {
    targetLog.status = mappedStatus;
    if (failureReason) {
      targetLog.failoverReason = failureReason;
    }
    console.log(`[Webhook Delivery Report] Updated message status of ${targetLog.id} to ${mappedStatus}`);
  }

  saveDB();
  broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });
  broadcast({ type: 'UPDATE_WEBHOOK_LOGS', payload: db.webhookLogs });

  pushSystemNotification(
    'Delivery Callback Received',
    `Webhook updated delivery report for ${phoneNumber || 'subscriber'} to ${mappedStatus}.`,
    mappedStatus === 'FAILED' ? 'alert' : 'success'
  );

  res.status(200).send('OK');
});

// Append Webhook Log helper
app.post('/api/webhook-logs', (req, res) => {
  const log: WebhookLog = req.body;
  db.webhookLogs.unshift(log);
  saveDB();
  broadcast({ type: 'UPDATE_WEBHOOK_LOGS', payload: db.webhookLogs });
  res.json({ success: true, webhookLogs: db.webhookLogs });
});

// Webhook Trigger helper for testing
app.post('/api/workflows/trigger', (req, res) => {
  const { name } = req.body;
  
  // Append audit logs
  const audit: AuditLog = {
    id: `audit-${Date.now()}`,
    userEmail: 'marketing.bot@sacco.co.ke',
    action: `AUTOMATION_WORKFLOW_RUN_SUCCESS: ${name}`,
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(audit);

  // Append transactional message logs
  const newLog: MessageLog = {
    id: `mlog-auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    recipient: '+254711223344',
    channel: 'SMS',
    status: 'DELIVERED',
    provider: 'Safaricom Direct',
    cost: 1.00,
    timestamp: new Date().toISOString()
  };
  db.messageLogs.unshift(newLog);

  saveDB();

  broadcast({ type: 'UPDATE_AUDIT_LOGS', payload: db.auditLogs });
  broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });

  pushSystemNotification('Automation Loop Triggered', `Triggered: ${name}`);
  res.json({ success: true });
});

// Real-Time Campaign simulation dispatch running on the server
function runRealtimeCampaignSimulation(campaignId: string) {
  const campaign = db.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  // Set status to PROCESSING
  campaign.status = 'PROCESSING';
  if (campaign.processedCount === undefined) {
    campaign.processedCount = 0;
  }
  saveDB();
  broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });

  const totalRecipients = campaign.totalRecipients || 10;
  let index = campaign.processedCount || 0;
  const ratePerChannel: Record<string, number> = { SMS: 1.00, WHATSAPP: 2.50, EMAIL: 0.05 };
  
  // Determine channels to dispatch
  const selectedChannels = campaign.channels.length > 0 ? campaign.channels : ['SMS'];
  const delayMs = campaign.batchDelayMs || 800;
  
  // Create incremental progress steps
  const intervalId = setInterval(async () => {
    // Check if campaign was deleted or paused
    const activeCamp = db.campaigns.find(c => c.id === campaignId);
    if (!activeCamp || activeCamp.status === 'PAUSED' || activeCamp.status === 'CANCELLED' || activeCamp.status === 'COMPLETED') {
      clearInterval(intervalId);
      return;
    }

    if (index >= totalRecipients) {
      activeCamp.status = 'COMPLETED';
      activeCamp.processedCount = totalRecipients;
      saveDB();
      broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
      pushSystemNotification('Campaign Dispatched', `Campaign "${activeCamp.name}" successfully delivered to all ${totalRecipients} recipients across targeted channels.`, 'success');
      
      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        userEmail: 'system@co.ke',
        action: `CAMPAIGN_QUEUE_DISPATCH_COMPLETE: ${activeCamp.name} (${totalRecipients} nodes)`,
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString()
      };
      db.auditLogs.unshift(audit);
      saveDB();
      broadcast({ type: 'UPDATE_AUDIT_LOGS', payload: db.auditLogs });
      
      clearInterval(intervalId);
      return;
    }

    // Process a batch of recipients based on batchSize config
    const configuredBatchSize = activeCamp.batchSize || 100;
    const batchSize = Math.max(1, Math.min(configuredBatchSize, Math.floor(totalRecipients / 8) || 1));
    const processedThisStep = Math.min(batchSize, totalRecipients - index);

    const stepPromises = [];

    for (let i = 0; i < processedThisStep; i++) {
      const contactIndex = index;
      index++; // increment immediately

      const contact = db.contacts[contactIndex % db.contacts.length] || {
        firstName: 'Member',
        lastName: `${contactIndex + 1}`,
        phoneNumber: `+254700000${contactIndex.toString().padStart(3, '0')}`,
        email: `member-${contactIndex}@sacco.co.ke`,
        customFields: { memberId: `SAC-${1000 + contactIndex}`, savingsBalance: 'KES 45,000' }
      };

      const sendPromise = (async () => {
        for (const channel of selectedChannels) {
          const cost = ratePerChannel[channel] || 1.00;
          
          // Debit tenant
          if (db.tenants.length > 0) {
            db.tenants[0].balance = Math.max(0, db.tenants[0].balance - cost);
          }

          let status: MessageLog['status'] = 'DELIVERED';
          let provider = channel === 'SMS' ? 'Safaricom Direct' : channel === 'WHATSAPP' ? 'Meta Cloud API' : 'AWS SES';
          let failoverReason: string | undefined = undefined;

          // Prepare personalized message text using templates if provided
          let rawText = channel === 'SMS' ? (activeCamp.smsTemplate || `Dear {{first_name}}, campaign update regarding your account {{memberId}}.`)
            : channel === 'EMAIL' ? (activeCamp.emailTemplate || `Hello {{first_name}},\n\nUpdate regarding account {{memberId}}.`)
            : `Hello {{first_name}}, WhatsApp alert regarding {{savingsBalance}}.`;

          // Replace merge tags
          const text = rawText
            .replace(/\{\{first_name\}\}/g, contact.firstName || 'Valued Member')
            .replace(/\{\{last_name\}\}/g, contact.lastName || '')
            .replace(/\{\{memberId\}\}/g, contact.customFields?.memberId || `SAC-${1000 + contactIndex}`)
            .replace(/\{\{savingsBalance\}\}/g, contact.customFields?.savingsBalance || 'KES 25,000');

          if (channel === 'SMS') {
            const smsResult = await smsManager.sendSingle(contact.phoneNumber, text);
            provider = smsResult.provider;
            status = smsResult.status;
            failoverReason = smsResult.error;
          } else if (channel === 'WHATSAPP') {
            const contactId = (contact as any).id || `c-fallback-${contactIndex}`;
            const windowStatus = checkCustomerWindow(contact.phoneNumber);
            const templateRes = await validateOrResolveTemplate(activeCamp.whatsappTemplate, !windowStatus.isInsideWindow);
            
            const effectiveTemplate = templateRes.templateName || activeCamp.whatsappTemplate || 'hello_world';

            const waResult = await whatsappService.sendSingleMessage(contact.phoneNumber, text, {
              templateName: effectiveTemplate,
              templateLanguage: templateRes.language || 'en_US',
              campaignId: activeCamp.id,
              contactId: contactId
            });
            provider = waResult.provider;
            status = waResult.status === 'READ' ? 'READ' : waResult.status === 'DELIVERED' ? 'DELIVERED' : waResult.status === 'FAILED' ? 'FAILED' : 'SENT';
            failoverReason = waResult.error;

            const waRecord: WhatsAppMessage = {
              id: `wa-camp-${Date.now()}-${contactIndex}`,
              campaignId: activeCamp.id,
              contactId: contactId,
              whatsappMessageId: waResult.messageId,
              recipient: contact.phoneNumber,
              messageContent: text + (templateRes.autoApplied ? ' [Approved Template Auto-Applied]' : ''),
              templateName: effectiveTemplate,
              status: waResult.status,
              providerResponse: waResult.rawResponse,
              errorDetails: waResult.error,
              timestamp: new Date().toISOString(),
              direction: 'OUTBOUND'
            };
            db.whatsappMessages.unshift(waRecord);
            broadcast({ type: 'UPDATE_WHATSAPP_MESSAGES', payload: db.whatsappMessages });
          } else {
            const rand = Math.random();
            if (rand > 0.94) status = 'BOUNCED';
          }

          // Update campaign counters safely
          activeCamp.sentCount += 1;
          if (status === 'DELIVERED') activeCamp.deliveredCount += 1;
          else if (status === 'READ') {
            activeCamp.deliveredCount += 1;
            activeCamp.readCount += 1;
          } else if (status === 'FAILED') activeCamp.failedCount += 1;
          else if (status === 'BOUNCED') activeCamp.bouncedCount += 1;

          activeCamp.cost += cost;

          // Log the message
          const messageLog: MessageLog = {
            id: `mlog-live-${Date.now()}-${contactIndex}-${channel}`,
            recipient: channel === 'EMAIL' ? contact.email : contact.phoneNumber,
            channel: channel as any,
            status,
            provider,
            cost,
            timestamp: new Date().toISOString(),
            failoverReason
          };
          db.messageLogs.unshift(messageLog);
        }

        activeCamp.processedCount = index;
      })();

      stepPromises.push(sendPromise);
    }

    await Promise.all(stepPromises);

    // Trigger developer API sandbox webhook logging if an API key exists
    if (db.apiKeys.length > 0) {
      const webhookLog: WebhookLog = {
        id: `wh-${Date.now()}-${index}`,
        url: 'https://client-webhook.co.ke/sms/callback',
        event: 'sms.delivered',
        status: 200,
        response: JSON.stringify({ success: true, messageId: `msg-${Date.now()}`, timestamp: new Date().toISOString() }),
        timestamp: new Date().toISOString()
      };
      db.webhookLogs.unshift(webhookLog);
      broadcast({ type: 'UPDATE_WEBHOOK_LOGS', payload: db.webhookLogs });
    }

    saveDB();

    // Broadcast current progress states live
    broadcast({ type: 'UPDATE_CAMPAIGNS', payload: db.campaigns });
    broadcast({ type: 'UPDATE_TENANTS', payload: db.tenants });
    broadcast({ type: 'UPDATE_MESSAGE_LOGS', payload: db.messageLogs });

  }, delayMs);
}

// Vite and static asset serving
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
    
    // Serve static files / final SPA index.html
    app.get('*', (req, res, next) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    startHTTPServer();
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  startHTTPServer();
}

function startHTTPServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Attach WebSocket Server using noServer to cleanly intercept /ws upgrades without conflicting with Vite
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log('Client connected to WebSocket server. Active connections:', wsClients.size);

    // Send initial sync state to client immediately
    ws.send(JSON.stringify({ type: 'INITIAL_SYNC', payload: db }));

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('Client disconnected. Active connections:', wsClients.size);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
    });
  });
}
