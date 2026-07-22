# SaaS Business Communication Platform — High-Level System Architecture Document

This document defines the systemic blueprint, data strategy, microservices decomposition, and provider integration paradigms for the **SaaS Business Communication Platform**. It is engineered for high throughput, high availability, strict multi-tenant isolation, and modular channel expansion.

---

## 1. High-Level Architecture Overview

The system utilizes an asynchronous, event-driven, microservices-ready architecture designed to isolate client-facing request flows from resource-intensive channel delivery operations (bulk queue processing).

### 1.1 Architectural Flow Diagram

```
                             +-----------------------+
                             |   Enterprise Client   |
                             +-----------+-----------+
                                         |
                                         |  HTTPS (TLS 1.3)
                                         v
+---------------------------------------------------------------------------------+
|                                 API GATEWAY                                     |
|  - Rate Limiting (Sliding Window Redis)  - JWT Verification & Auth Routing      |
|  - Request Logging & Audit Trails        - SSL Termination & CORS Enforcement   |
+----------------------------------------+----------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
+----------------------+------------+             +--------+----------------------+
|        WORKSPACE PORTAL SERVICE   |             |       DEVELOPER API SERVICE   |
| (React SPA / Express Auth Panel)  |             | (REST Endpoints & Webhooks)  |
+----------------------+------------+             +--------+----------------------+
                       |                                   |
                       +-----------------+-----------------+
                                         |  gRPC / Internal REST
                                         v
+----------------------------------------+----------------------------------------+
|                                CORE SERVICES                                    |
|   +--------------------------+  +-------------------+  +--------------------+   |
|   | Campaign Orchestrator    |  | Tenant & RBAC     |  | Billing & Usage    |   |
|   +--------------------------+  +-------------------+  +--------------------+   |
+----------------------------------------+----------------------------------------+
                                         |
                                         |  Publish Message Events
                                         v
+----------------------------------------+----------------------------------------+
|                         MESSAGE QUEUE (Redis / RabbitMQ)                        |
|  [Priority Queue] ---> [Transactional] ---> [Marketing / Bulk] ---> [DLQ]        |
+----------------------------------------+----------------------------------------+
                                         |
                                         |  Subscribe / Consumer Pull
                                         v
+----------------------------------------+----------------------------------------+
|                     PROVIDER ABSTRACTION LAYER (PAL)                            |
|                  - Dynamic Carrier Selection & Routing Routing                  |
|                  - Delivery Report (DLR) Webhook Ingestion Engine               |
+----------------------------------------+----------------------------------------+
                                         |
          +------------------------------+------------------------------+
          |                              |                              |
          v                              v                              v
+---------+--------+             +-------+--------+             +-------+--------+
|   SMS Adapters   |             | Email Adapters |             | WhatsApp Adpt. |
| (AfricasTalking, |             |  (SMTP, SES,   |             | (Meta Cloud,   |
| Safaricom, Twilio|             |   SendGrid)    |             |   Twilio WA)   |
+------------------+             +----------------+             +----------------+
```

---

## 2. Microservices Strategy

The platform is designed with a domain-driven, microservices-ready topology. While initially bundled for standard hosting contexts, its services are strictly isolated along domain boundaries, facilitating containerized scaling.

### 2.1 Service Decomposition Matrix

| Service Name | Description | Scalability Profile | Storage Dependency |
| :--- | :--- | :--- | :--- |
| **API Gateway** | Entry point for traffic, enforcing SSL, DDoS protection, rate limits, CORS, and routing rules. | CPU bound, scales horizontally on request spikes. | Redis (Rate limit cache) |
| **Auth & Workspace Service** | Handles tenant registration, team member invitations, RBAC evaluations, and user sessions. | Read-heavy, easily cached. | PostgreSQL (Users, Roles) |
| **Campaign Orchestrator** | Pre-processes bulk schedules, validates templates, segments customer lists, and estimates delivery balances. | Memory bound, handles large list expansions. | PostgreSQL (Campaigns, Lists) |
| **Worker Dispatch Daemon** | Consumes from message queues and pipes jobs to the PAL adapters. | IO bound, highly concurrent workers. | Redis / RabbitMQ |
| **PAL Ingestion (Webhook)**| Listens to provider delivery callbacks (SMS DLRs, Email Bounces/Clicks, WhatsApp Read Receipts). | Extreme write throughput. | PostgreSQL (Logs, Analytics) |
| **Billing & Subscription** | Manages tiered subscriptions, M-Pesa wallet balances, auto-renewals, and PDF invoice generation. | ACID compliance critical, transaction-isolated. | PostgreSQL (Invoices, Ledgers) |

### 2.2 Interservice Communication
*   **Synchronous Interactions (Reads / Transactions)**: Done via gRPC (internal service mesh) or standard JSON over HTTP/2 for latency-sensitive validation (e.g., checking credit balance before enqueue).
*   **Asynchronous Interactions (Bulk Campaign execution)**: Event-driven pub/sub. Publishers drop compact execution payloads (e.g., `{ tenantId, campaignId, recipientListId }`) into the queue. Background consumers stream-parse the recipients, compile messages, and execute delivery in parallel threads.

---

## 3. Database Schema Approach (PostgreSQL)

Multi-tenant platforms must balance **Security Isolation**, **Operational Cost**, **Performance / Custom Queries**, and **Schema Evolution**.

### 3.1 Multi-Tenant Isolation Strategies Compared

1.  **Database-Per-Tenant**: Separate physical servers or databases per tenant.
    *   *Pros*: Complete logical isolation, no risk of data leak, isolated maintenance.
    *   *Cons*: Prohibitively expensive for a mid-market SaaS; hard to run consolidated platform statistics.
2.  **Schema-Per-Tenant**: Single database with a separate namespace schema per company.
    *   *Pros*: Moderate isolation, clean table namespaces.
    *   *Cons*: Schema migrations require iterating over thousands of schemas; Postgres performance degrades if schema count exceeds 10,000.
3.  **Shared Database, Shared Schema (Row-Level Security & Discriminator)** (Chosen Strategy):
    *   *Pros*: Cost-effective, simple schema evolution, performant clustering.
    *   *Cons*: Danger of developer coding errors leaking tenant data if they omit filters.
    *   *Mitigation*: Implement PostgreSQL **Row-Level Security (RLS)** and mandate `tenant_id` on every table. Ensure database client wrappers automatically inject the active tenant context.

### 3.2 Chosen Strategy: Partitioned Shared Schema with RLS
Every table with customer-identifiable data includes a non-nullable `tenant_id UUID`. Row-Level Security policies are applied directly at the database level:

```sql
-- Enable Row-Level Security on core tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Create Security Policy linked to tenant context variables
CREATE POLICY tenant_isolation_policy ON contacts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

### 3.3 Indexes & Optimization
*   **Composite Indexing**: Every lookup index on multi-tenant tables is prefixed with `tenant_id`.
    *   Example: `CREATE INDEX idx_contacts_tenant_email ON contacts (tenant_id, email);`
*   **Partitioning**: High-volume transaction tables like `message_logs` are partitioned by time ranges (e.g., monthly partitions) to keep index trees compact and queries fast.

---

## 4. Provider Abstraction Layer (PAL) Design

The Provider Abstraction Layer isolates application business logic from specific API wrappers. It uses standardized adapters and a dynamic routing engine to manage failovers.

### 4.1 Interface Definitions (TypeScript Specification)

To add any new gateway, developers simply implement the standard `SMSProvider` or `EmailProvider` interfaces:

```typescript
export interface MessagePayload {
  to: string;
  body: string;
  senderId?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  providerMessageId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  rawResponse: any;
  cost: number;
}

export interface SMSProvider {
  name: string;
  sendSMS(payload: MessagePayload): Promise<DeliveryResult>;
  queryDeliveryStatus(providerMessageId: string): Promise<'DELIVERED' | 'FAILED' | 'PENDING'>;
}
```

### 4.2 Dynamic Routing, Priority & Failover Policy

The dynamic routing controller manages how campaigns are handled based on current queue volumes and carrier health metrics.

1.  **Provider Weighting & Health Scoring**: Each provider adapter is evaluated in real-time. If Safaricom's direct API drops success rates below 90%, its weighting is throttled down automatically.
2.  **Adaptive Failover Sequence**:
    *   *Initial Attempt*: Job is routed to the primary configured adapter (e.g., **Safaricom Direct** for Kenyan SMS).
    *   *Carrier Handshake Failure (5xx, Timeout, Core Network Outage)*: The PAL controller intercepts the exception, logs it to the failover ledger, and pushes the job into a high-priority retry bucket.
    *   *Failover Routing*: The backup adapter (e.g., **Africa's Talking** or **Twilio**) is immediately selected to send the packet.
3.  **Circuit Breaker Pattern**: If a provider fails 5 times consecutively, the circuit breaker trips to "OPEN", preventing further execution requests to that specific endpoint for 60 seconds.

```
                           +------------------------+
                           |   Outbound SMS Job     |
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                     YES   | Is Primary Provider    |
             +------------>| Circuit Breaker CLOSED?|
             |             +-----------+------------+
             |                         | NO
             |                         v
             |             +------------------------+
             |             | Route to Backup        |
             |             | Carrier                |
             |             +-----------+------------+
             |                         |
             |                         v
             |             +------------------------+
             |             | Execute Send           |
             |             +------------------------+
             |
     Wait 60s & Reset
             |
             v
   +-------------------+
   |  Circuit Breaker  |
   |     TRIPPED       |
   +-------------------+
             ^
             | 5 Consecutive Failures
             |
     +-------+--------+
     | Primary Outage |
     +----------------+
```

---

## 5. Security Architecture (GDPR & KDPA Alignment)

*   **Audit Logging**: Every administrative action (inviting members, updating subscription, generating developer API keys) writes to an immutable `audit_logs` table.
*   **Field-Level Encryption**: Sensitive credentials (SMTP passwords, Facebook WhatsApp access tokens, API secrets) are encrypted before write using AES-256-GCM.
*   **Opt-Out Enforcement**: The Campaign Builder inserts standard opt-out keywords (`STOP to 22432`, or `Unsubscribe` links in Emails) dynamically based on recipient carrier location profiles.
