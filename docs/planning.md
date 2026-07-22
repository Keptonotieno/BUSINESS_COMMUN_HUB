# SaaS Business Communication Platform — Planning, Architecture & Specifications

This document contains the complete engineering blueprints, specifications, and architecture for the **SaaS Business Communication Platform**, designed for multi-tenant scalability across Kenya, East Africa, and the global market.

---

## 1. Product Requirements Document (PRD)

### 1.1 Executive Summary
The SaaS Business Communication Platform is a multi-tenant cloud platform enabling businesses (SMEs and Enterprises) to run bulk SMS, WhatsApp Business API, and email marketing campaigns, manage marketing automation, issue OTP authentications, and view live delivery analytics. 

### 1.2 Product Objectives
*   **Omnichannel Delivery**: Seamless message routing across SMS, WhatsApp, and Email.
*   **High Reliability**: Automated failover routing for SMS/Email and asynchronous retry queues.
*   **Multi-Tenancy**: Complete logical separation of data, billing, contacts, and reports per tenant (company).
*   **SaaS Billing**: Tiered subscription plans (Free Trial, Starter, Professional, Business, Enterprise) with auto-renewals, credits, and multi-gateway integrations.

### 1.3 Scope of the Release (Phase 1)
*   **Tenant/Company Management**: Self-service workspace registration, inviting employees, RBAC (Admin, Manager, Member).
*   **Contacts Hub**: Lists, custom tags, CSV/Excel import, deduplication.
*   **Campaign Builder**: Single interface to orchestrate bulk SMS, Email, or WhatsApp campaigns.
*   **Developer API**: API key generation, REST endpoint and Webhook systems.
*   **Provider Abstraction Layer (Adapters)**: High-reliability adapters with automatic failover (SMS, WhatsApp, Email).

---

## 2. Software Requirements Specification (SRS)

### 2.1 System Overview
The system is divided into three primary tiers:
1.  **Frontend Single Page Application (SPA)**: React + TypeScript + Tailwind CSS for a fast, modern tenant interface.
2.  **Full-Stack Application Server**: Node.js/Express (simulating the enterprise-grade API, in line with modern frameworks) with standard ES module compliance.
3.  **Data & Caching Tier**: Relational PostgreSQL database for highly normalized tenant storage and Redis-backed queuing systems.

### 2.2 Functional & Non-Functional Specifications
(Detailed breakdown in Sections 3 and 4 below).

### 2.3 User Classes and Characteristics
*   **Platform Administrator**: Global platform owner with permission to manage all tenants, review platform revenue, monitor queues, and manage gateway providers.
*   **Tenant Administrator**: The company owner who controls subscriptions, billing, department mapping, API key creation, and teammate invitations.
*   **Tenant Marketer / Manager**: Can create templates, upload contact lists, launch campaigns, and review real-time delivery performance.
*   **Developer Customer**: Interfaces primarily with the REST API platform, integrating transactional alerts into their own software.

---

## 3. Functional Requirements

### 3.1 Module 1: Authentication & Identity
*   **REQ-AUTH-01**: Standard email/password registration with validation rules.
*   **REQ-AUTH-02**: Multi-factor authentication (MFA) via SMS OTP or Authenticator App.
*   **REQ-AUTH-03**: Secure JWT session management (Access tokens 15m, Refresh tokens 7d).
*   **REQ-AUTH-04**: Social login adapters (Google Workspace, Microsoft Entra ID).
*   **REQ-AUTH-05**: Role-Based Access Control (RBAC) supporting platform-level and tenant-level roles.

### 3.2 Module 2: Tenant/Company Management
*   **REQ-COMP-01**: Multi-tenant isolation. No cross-tenant database joins allowed.
*   **REQ-COMP-02**: Workspace switching without re-logging.
*   **REQ-COMP-03**: Teammate invitations with expiry links and pre-selected roles.

### 3.3 Module 3: Subscription & Billing
*   **REQ-BILL-01**: Multi-currency subscription plans (KES for East Africa, USD for international).
*   **REQ-BILL-02**: Payment integration abstraction supporting M-Pesa, Stripe, Card, and Flutterwave.
*   **REQ-BILL-03**: Usage-based SMS and WhatsApp wallet balance tracking separate from monthly subscription fee.

### 3.4 Module 4: Contact Management
*   **REQ-CONT-01**: Interactive list management with custom fields (e.g., `first_name`, `account_balance`).
*   **REQ-CONT-02**: Streamed parsing for CSV and Excel files to process 100k+ imports without memory starvation.
*   **REQ-CONT-03**: Automatic duplication detection matching email or E.164 phone formats.

### 3.5 Module 5-7: Channels (SMS, WhatsApp, Email)
*   **REQ-SMS-01**: Support Unicode, alphanumeric Sender ID custom routing, and multi-part message assembly.
*   **REQ-WA-01**: Official WhatsApp Meta Cloud API support for approved message templates (text, rich buttons, media documents).
*   **REQ-EMAIL-01**: Rich Text and custom HTML Email templates with embedded open-tracking pixel and click-tracking link redirection.

### 3.6 Module 8: Unified Campaign Manager
*   **REQ-CAMP-01**: Drag-and-drop campaign wizard to define audience filters, template variables, schedule time, and channel priority.
*   **REQ-CAMP-02**: Safe state transitions: Draft ➔ Scheduled ➔ Sending ➔ Paused ➔ Completed.

### 3.7 Module 9: Marketing Automation
*   **REQ-AUTO-01**: Trigger-based workflows (e.g., trigger birthday message on matching date, trigger reminder 3 days before renewal).

### 3.8 Module 10: Reports & Analytics
*   **REQ-REP-01**: Real-time aggregated stats (Total Sent, Delivered, Bounced, Failed).
*   **REQ-REP-02**: Charts demonstrating hourly conversion rates and link click trends.

### 3.9 Module 11: REST API & Developer Platform
*   **REQ-API-01**: API Key generation with custom scoping and granular rate limiting (sliding window rate limiter).

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance & Scalability
*   **NFR-PERF-01 (Throughput)**: SMS queue workers must sustain ingestion of up to 5,000 requests per second.
*   **NFR-PERF-02 (Latency)**: API routes must return responses in under 200ms (excluding external provider gateways).
*   **NFR-PERF-03 (Delivery)**: Critical transactional notifications (OTPs) must hit carrier networks within 3 seconds of triggering.

### 4.2 Security & Compliance
*   **NFR-SEC-01 (Data Encryption)**: AES-256-GCM encryption for all sensitive fields at rest (e.g., API keys, OAuth tokens, WhatsApp payloads). TLS 1.3 enforced in transit.
*   **NFR-SEC-02 (Isolation)**: Logical multi-tenant schema partitioning. Row-Level Security (RLS) policies on core tables in PostgreSQL.
*   **NFR-SEC-03 (Compliance)**: Full compliance with Kenya Data Protection Act (KDPA) 2019 and GDPR. Explicit opt-out trackers appended to all outgoing promotional campaigns.

### 4.3 High Availability & Fault Tolerance
*   **NFR-HA-01**: Target SLA of 99.95% uptime.
*   **NFR-HA-02**: Queue failover. Dead Letter Queues (DLQ) configured for automatic message rerouting if carriers fail repeatedly.

---

## 5. User Stories

1.  **As a Marketing Manager at an E-commerce store**, I want to upload a CSV of 50,000 customers with custom birthday fields so that I can configure automated, personalized discount SMS messages to send on their birthdays.
2.  **As a DevOps Lead at a FinTech bank**, I want to issue high-priority transactional OTPs via our API platform using a secure token that utilizes carrier-fallback so that my users never experience delays logging in.
3.  **As a Hospital Administrator**, I want to schedule bulk appointment reminders via both WhatsApp and SMS simultaneously so that patients receive alerts on their preferred communication channels.
4.  **As a SACCO Finance Officer**, I want to pull an automated M-Pesa billing invoice and receipt instantly from the platform's history tab to satisfy our quarterly accounting audits.

---

## 6. Use Cases

### Use Case UC-101: Create and Execute Omnichannel Campaign
*   **Primary Actor**: Marketing Manager.
*   **Preconditions**: Tenant is logged in, has active subscription, and has configured SMS sender IDs and Email domains.
*   **Flow of Events**:
    1.  Actor selects "New Campaign" in the Workspace Dashboard.
    2.  Actor selects the Target List (e.g., "Premium Clients").
    3.  Actor selects active channels (SMS + Email).
    4.  Actor enters the body, utilizing personalization tokens (e.g., `Hello, {{first_name}}`).
    5.  System parses the template and estimates total campaign delivery cost.
    6.  Actor clicks "Send Now".
    7.  System schedules the job to the Redis priority queue.
*   **Postconditions**: Priority queue distributes the payload across adapters. Delivery reports update live on the dashboard.

---

## 7. Database Design (PostgreSQL Schema)

```sql
-- Core Tenants (Multi-Tenant Isolation)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users & Workspace Memberships
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    mfa_secret VARCHAR(255),
    is_mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'MEMBER')),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Contacts & Audience Segmentation
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number VARCHAR(30) NOT NULL, -- E.164 format
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone_number);

-- Marketing Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'PAUSED', 'COMPLETED', 'FAILED')),
    channels VARCHAR(50)[] NOT NULL, -- Array of channels e.g., {'SMS', 'EMAIL', 'WHATSAPP'}
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Tracking (Unified History)
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL')),
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED')),
    provider VARCHAR(100) NOT NULL,
    cost NUMERIC(10, 4) DEFAULT 0.00,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_logs_status ON message_logs(tenant_id, status);
```

---

## 8. System Architecture (Provider Abstraction Layer)

The platform is designed with a **Provider Abstraction Layer (PAL)**. The application core code never targets a direct API (e.g., Africa's Talking API or Twilio API). Instead, it communicates with dynamic interfaces.

### SMS Adapter Architecture
```
                   +------------------------------+
                   |    Unified Campaign Queue    |
                   +--------------+---------------+
                                  |
                                  v
                   +--------------+---------------+
                   |     SMS Dispatch Service     |
                   +--------------+---------------+
                                  |
                 +----------------+----------------+
                 |       Provider Router           |
                 +----------------+----------------+
                                  |
          +-----------------------+-----------------------+
          |                       |                       |
          v                       v                       v
+---------+---------+   +---------+---------+   +---------+---------+
|  Africa's Talking |   |      Twilio       |   |     Safaricom     |
|   SMS Adapter     |   |   SMS Adapter     |   | Direct Enterprise |
+-------------------+   +-------------------+   +-------------------+
```

---

## 9. Sequence Diagram: Campaign Dispatch with Failover

```
Marketer               CampaignManager           MessageQueue             SMS Adapter (Primary)    SMS Adapter (Backup)
   |                          |                        |                           |                        |
   |--- Create Campaign ----->|                        |                           |                        |
   |--- Click "Send Now" ---->|                        |                           |                        |
   |                          |--- Push Jobs --------->|                           |                        |
   |                          |    to Queue            |                           |                        |
   |                          |                        |--- Dispatch Job --------->|                        |
   |                          |                        |                            |-- (Request Timeout)    |
   |                          |                        |                            |   or Failed (5xx)      |
   |                          |                        |<- Return Error ------------|                        |
   |                          |                        |                                                     |
   |                          |                        |--- Route Retry to Backup -------------------------->|
   |                          |                        |                                                     |-- Request OK
   |                          |<-- Post Live Hook -----|                                                     |
   |                          |    (Status: DELIVERED) |<-- Push Webhook Callback ---------------------------|
   |<-- UI Updates -----------|                        |
```

---

## 10. Entity-Relationship (ER) Description
*   **Tenants (1 : N) Users / Members**: One company has many teammate profiles.
*   **Tenants (1 : N) Contacts**: Each tenant owns their private collection of customer records. Custom metadata fields can be stored using structured `JSONB`.
*   **Tenants (1 : N) Campaigns (1 : N) Message Logs**: Campaigns trigger millions of records inside `message_logs` linked to individual contact destinations.

---

## 11. API Specifications (SaaS Platform Endpoints)

### 11.1 Send Transactional SMS
*   **POST** `/api/v1/sms/send`
*   **Headers**: 
    ```http
    Authorization: Bearer <API_KEY>
    Content-Type: application/json
    ```
*   **Request Payload**:
    ```json
    {
      "to": "+254712345678",
      "message": "Your verification code is 482103. Valid for 5 minutes.",
      "senderId": "SACKOMOBILE",
      "priority": "HIGH"
    }
    ```
*   **Response Payload (202 Accepted)**:
    ```json
    {
      "success": true,
      "messageId": "msg_894f2d31e9c20",
      "status": "QUEUED",
      "channel": "SMS",
      "provider": "AfricasTalking",
      "timestamp": "2026-07-21T12:34:00Z"
    }
    ```

### 11.2 Query Campaign Statistics
*   **GET** `/api/v1/analytics/campaigns/:id`
*   **Response Payload (200 OK)**:
    ```json
    {
      "campaignId": "camp_33a82bf901",
      "name": "Midyear Promotional Sale",
      "totalDispatched": 15000,
      "delivered": 14210,
      "bounced": 450,
      "failed": 340,
      "metrics": {
        "deliveryRatePercentage": 94.73,
        "totalCost": 15.42,
        "currency": "USD"
      }
    }
    ```

---

## 12. UI Wireframes (Markdown Visual Frameworks)

The primary Dashboard is structured as a premium single-screen multi-tier viewport with responsive navigation:

```
+---------------------------------------------------------------------------------------------------------+
|  [Logo] Business Comm   |   Search Actions...   | Workspace: [ Safaricom Sacco ]    | User: Kepton   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  [DASHBOARD]     |   OVERVIEW STATS                                                                     |
|  [CAMPAIGNS]     |   +-------------------+ +-------------------+ +-------------------+ +---------------+  |
|  [CONTACTS]      |   | Total Dispatched  | | Delivery Rate     | | SMS Balance (KES) | | active Subs   |  |
|  [AUTOMATION]    |   | 1,208,452 messages| | 98.42%            | | KES 42,910.00     | | Pro - Annual  |  |
|  [API & KEYS]    |   +-------------------+ +-------------------+ +-------------------+ +---------------+  |
|  [BILLING]       |                                                                                      |
|  [SETTINGS]      |   ACTIVE CAMPAIGNS                                                                   |
|                  |   +-------------------------------------------------------------------------------+  |
|                  |   | Name                     | Channel     | Status    | Progress   | Actions         |  |
|                  |   +--------------------------+-------------+-----------+------------+-----------------+  |
|                  |   | Q3 Dividend Payout Notice| SMS         | SENDING   | [====--] 72%| Pause | Cancel  |  |
|                  |   | Midyear Promo Offers     | WhatsApp    | SCHEDULED | [------] 0% | Edit  | Trigger |  |
|                  |   | Welcome Onboarding Series| Email       | ACTIVE    | [======]100%| Reports         |  |
|                  |   +-------------------------------------------------------------------------------+  |
|                  |                                                                                      |
+---------------------------------------------------------------------------------------------------------+
```

---

## 13. Security Architecture & OWASP Top 10 Mitigation

*   **A01:2021-Broken Access Control**: Enforced tenant scoping on every route. The ORM includes default `where({ tenantId })` wrappers that are mathematically verified before database pipeline compilation.
*   **A03:2021-Injection**: Raw SQL parameterized natively. API Keys are stored hashed with SHA-256 (only visible on creation).
*   **A05:2021-Security Misconfiguration**: Dev environment variables explicitly separated from production, with fail-safe defaults.
*   **Rate Limiting**: Sliding window Redis limiter configured at 60 requests/minute per client IP for public UI endpoints, and custom bucket limits for developers based on API Key plans.

---

## 14. Development Roadmap

*   **Phase 1: Foundation & Platform Engine (Active)**: Architecture blueprint verification, Workspace Multi-Tenant Routing setup, Contact list parsing, mock database seeding.
*   **Phase 2: Channel Adapters & Queue Dispatch**: Building the Provider Abstraction Layer (PAL), integrating real/mock gateways, setting up background worker retries.
*   **Phase 3: Visual Analytics & Webhook Engine**: Analytics aggregation scheduler, PDF exporter, Developer webhook dispatch logic.
*   **Phase 4: Optimization, Auditing & Final Delivery**: End-to-end multi-tenant validation, security penetrations, and global deployments.

---

## 15. Testing Strategy

*   **Unit Testing**: Isolated validation for adapter routing logic, template interpolation engines, and timezone parsers.
*   **Integration Testing**: End-to-end multi-tenant isolation verification (confirming Tenant A can never query Tenant B records under simulated race-conditions).
*   **Load Testing**: High-concurrency queues loaded with 10k messages to measure packet loss and memory leaks inside Express servers.

---

## 16. Deployment Strategy

*   **Containerization**: High-efficiency Dockerfiles mapping Node runtimes with minimal alpine layers.
*   **Orchestration**: Kubernetes-ready manifest structures declaring Pod Horizontal Autoscaling (HPA) triggers when queue sizes exceed 10,000 pending jobs.
*   **CI/CD**: GitHub Actions pipelines compiling code quality linters, checking type definitions, and pushing verified containers to artifact registries.

---

## 17. Maintenance Plan

*   **Daily Log Rotation**: Moving Express access logs and adapter debug histories into cold object storage with automatic 30-day lifecycle purges.
*   **Carrier API Monitoring**: Setting up hourly synthetic health tests on carrier endpoints (e.g. Twilio, Safaricom) to preemptively flags latencies or connection drops.
