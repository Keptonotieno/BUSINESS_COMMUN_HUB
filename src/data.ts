import { Tenant, Contact, ContactList, Campaign, MessageLog, APIKey, AutomationWorkflow, AuditLog } from './types';

export const INITIAL_TENANTS: Tenant[] = [
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

export const SEED_CONTACT_LISTS: ContactList[] = [
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

export const SEED_CONTACTS: Contact[] = [
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

export const SEED_CAMPAIGNS: Campaign[] = [
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

export const SEED_MESSAGE_LOGS: MessageLog[] = [
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

export const INITIAL_API_KEYS: APIKey[] = [
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

export const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
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

export const SEED_AUDIT_LOGS: AuditLog[] = [
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
  },
  {
    id: 'a-3',
    userEmail: 'keptonokoth@gmail.com',
    action: 'CAMPAIGN_TRIGGERED',
    ipAddress: '197.232.145.89',
    timestamp: '2026-07-21T05:20:00-07:00'
  },
  {
    id: 'a-4',
    userEmail: 'finance.admin@sacco.co.ke',
    action: 'SUBSCRIPTION_UPGRADE',
    ipAddress: '197.248.33.102',
    timestamp: '2026-07-20T14:45:00-07:00'
  }
];
