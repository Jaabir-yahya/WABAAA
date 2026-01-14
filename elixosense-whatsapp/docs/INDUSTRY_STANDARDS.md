# Industry Standards & Best Practices
**ElixoSense WhatsApp Commerce Platform - Kenya**

**Document Version**: 1.0  
**Last Updated**: 2026-01-14  
**Sector**: FinTech + E-commerce + Conversational Commerce

---

## Executive Summary

This document outlines industry standards and best practices applicable to the ElixoSense WhatsApp commerce platform. As a **conversational commerce** solution handling **financial transactions** in the **Kenyan market**, this platform must comply with multiple regulatory frameworks and industry standards.

**Primary Standards Applicable**:
- **PCI DSS** (Payment Card Industry Data Security Standard) - Payment handling
- **ISO/IEC 27001** - Information security management
- **GDPR/Kenya DPA 2019** - Data protection
- **Meta WhatsApp Business API Guidelines** - Platform compliance
- **M-Pesa Integration Standards** - Payment processing
- **OWASP** - Application security
- **Serverless Security Best Practices** - Cloud architecture

---

## 1. Payment Processing Standards (FinTech)

### 1.1 PCI DSS Compliance

**Current Status**: Simplified compliance via M-Pesa (SAQ A-EP likely applicable)

**Key Requirements for Your Setup**:

✅ **APPLICABLE**:
- **Build and Maintain a Secure Network**
  - Install and maintain firewall (Vercel's infrastructure)
  - Do not use vendor-supplied defaults (all credentials unique)
  
- **Protect Cardholder Data** 
  - You're NOT storing card data → reduced scope
  - M-Pesa handles sensitive payment data
  - Still protect: transaction IDs, payment codes, customer phone numbers

- **Maintain a Vulnerability Management Program**
  - Use up-to-date dependencies (`npm audit`)
  - Regular security testing (CodeQL, Dependabot)
  - Secure coding practices (input validation, sanitization)

- **Implement Strong Access Control**
  - Unique IDs for admin users (Supabase Auth)
  - Restrict access based on need-to-know (RLS policies)
  - Track and monitor all access (audit logs)

- **Regularly Monitor and Test Networks**
  - Log all transactions (state_logs table)
  - Regular security testing (penetration testing recommended)
  - Incident response plan

- **Maintain an Information Security Policy**
  - Document security policies
  - Annual review of security practices

**Recommendations**:
```typescript
// 1. Never log sensitive payment data
logger.info("Payment initiated", {
  ticketId: ticket.id,
  amount: amount,
  // ❌ DON'T: mpesaCode, phoneNumber in logs
});

// 2. Encrypt sensitive data at rest
// Use Supabase's built-in encryption + consider field-level encryption
// for highly sensitive data like phone numbers

// 3. Implement payment data retention policies
// Default: 7 years for financial records (Kenya Tax Laws)
// After retention period: secure deletion
```

### 1.2 M-Pesa / Safaricom Daraja Standards

**Official Standards**: Safaricom Daraja API Guidelines

**Key Requirements**:

1. **Security**:
   ```typescript
   // ✅ Required: HTTPS only
   // ✅ Required: API credentials protection (never in code)
   // ✅ Required: Callback URL authentication
   // ✅ Required: Idempotency (prevent double charges)
   
   // Implement in lib/payments.ts:
   async function requestPayment(ticketId: string, amount: number) {
     const idempotencyKey = `mpesa-${ticketId}-${Date.now()}`;
     
     // Check if already processed
     const existing = await db.query.payments.findFirst({
       where: eq(payments.idempotencyKey, idempotencyKey)
     });
     
     if (existing) {
       return existing; // Prevent duplicate charge
     }
     
     // Proceed with STK push...
   }
   ```

2. **Callback Handling**:
   ```typescript
   // ✅ Must respond within 30 seconds
   // ✅ Must validate callback authenticity
   // ✅ Must handle retries (callbacks may be sent multiple times)
   
   // In route.ts:
   export async function POST(request: Request) {
     const startTime = Date.now();
     
     try {
       const body = await request.json();
       
       // Quick validation
       if (!isValidMpesaCallback(body)) {
         return Response.json({ error: "invalid" }, { status: 400 });
       }
       
       // Async processing (don't block response)
       processMpesaCallbackAsync(body);
       
       // Respond quickly
       return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
       
     } catch (error) {
       logger.error("Mpesa callback error", error);
       return Response.json({ error: "server_error" }, { status: 500 });
     }
   }
   ```

3. **Testing Requirements**:
   - Use Safaricom sandbox for all development
   - Test all error scenarios (insufficient funds, timeout, etc.)
   - Never test with production credentials in development

4. **Transaction Limits**:
   - Min: KES 10
   - Max: KES 150,000 (per transaction)
   - Daily limits apply per customer

### 1.3 Financial Record Keeping (Kenya)

**Kenya Tax Laws (Income Tax Act)**:

- **Retention Period**: 7 years minimum
- **Records Required**: All transactions, invoices, receipts
- **Audit Trail**: Immutable, timestamped records

**Implementation**:
```sql
-- ✅ Your state_logs table already implements this
CREATE TABLE state_logs (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Immutable: no UPDATE/DELETE allowed
);

-- ✅ Add retention policy trigger
-- Automatically archive after 7 years
```

---

## 2. Data Protection & Privacy Standards

### 2.1 Kenya Data Protection Act 2019

**Key Requirements**:

1. **Lawful Processing**:
   - ✅ Obtain consent for data collection
   - ✅ Process only for stated purposes
   - ✅ Keep data accurate and up-to-date

2. **Data Subject Rights**:
   - Right to access their data
   - Right to correction
   - Right to deletion (with financial record exceptions)
   - Right to data portability

**Implementation Checklist**:
```typescript
// ✅ Implement in your API:

// 1. Data Access Request (GET /api/customers/:phone/data)
async function getCustomerData(phoneNumber: string) {
  return {
    profile: await db.query.customers.findFirst(...),
    tickets: await db.query.tickets.findMany(...),
    messages: await db.query.whatsappMessages.findMany(...),
    payments: await db.query.payments.findMany(...),
    // Export in portable format (JSON)
  };
}

// 2. Data Deletion Request (with financial exceptions)
async function deleteCustomerData(phoneNumber: string) {
  // ⚠️ Cannot delete financial records (7-year retention)
  // Can delete: profile info, non-financial messages
  // Should: Anonymize rather than delete
  
  await db.update(customers)
    .set({
      name: "DELETED USER",
      email: null,
      metadata: null,
      deleted_at: new Date()
    })
    .where(eq(customers.phone, phoneNumber));
}
```

3. **Data Localization** (Kenya):
   - ✅ Customer data should be stored within Kenya or EAC
   - Current: Supabase eu-west-1 (Ireland) - **ACTION NEEDED**
   - **Recommendation**: Consider Supabase region migration to `af-south-1` (South Africa) for better compliance

4. **Privacy Policy**:
   - ✅ Must have clear privacy policy
   - ✅ Disclose data collection practices
   - ✅ Explain third-party sharing (Meta, Safaricom)

**Required Privacy Policy Sections**:
- What data we collect
- How we use it
- Who we share with (Meta WhatsApp, Safaricom M-Pesa)
- How long we keep it (7 years for financial)
- Customer rights
- Contact for data requests

### 2.2 GDPR Considerations

**Why GDPR Matters**: Your stack is EU-region deployed (eu-west-1)

**Key Differences from Kenya DPA**:
- Stricter consent requirements
- More comprehensive rights (right to be forgotten)
- Higher penalties (4% of global turnover)

**Quick Compliance**:
```typescript
// ✅ Cookie consent (if you add analytics)
// ✅ Clear privacy policy
// ✅ Data processing agreements with vendors (Meta, Safaricom)
// ✅ Breach notification (72 hours)
```

---

## 3. WhatsApp Business API Standards

### 3.1 Meta WhatsApp Cloud API Guidelines

**Official Policy**: [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)

**Key Requirements**:

1. **Opt-In Required**:
   ```typescript
   // ❌ NEVER send unsolicited messages
   // ✅ Only message users who initiated conversation
   // ✅ Or have explicit opt-in for notifications
   
   // Implement opt-in tracking:
   interface Customer {
     phone: string;
     opted_in: boolean;
     opt_in_date?: Date;
     opt_in_method: 'whatsapp_message' | 'web_form' | 'sms';
   }
   ```

2. **24-Hour Messaging Window**:
   ```typescript
   // ✅ Free-form messages: within 24h of last user message
   // ✅ Template messages: any time (but require approval)
   
   async function canSendMessage(customerId: string): Promise<boolean> {
     const lastMessage = await db.query.whatsappMessages
       .findFirst({
         where: and(
           eq(whatsappMessages.customerId, customerId),
           eq(whatsappMessages.direction, 'inbound')
         ),
         orderBy: desc(whatsappMessages.createdAt)
       });
     
     if (!lastMessage) return false;
     
     const hoursSince = (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
     return hoursSince < 24;
   }
   ```

3. **Message Templates**:
   - All proactive messages must use approved templates
   - Templates require Meta approval (usually 24-48h)
   - Templates have variable limits

4. **Quality Rating**:
   - **Green**: Good quality, full access
   - **Yellow**: Medium quality, warnings
   - **Red**: Low quality, restricted or banned
   
   **Quality Factors**:
   - User blocks/reports
   - Response time
   - Message delivery rate
   - Template rejection rate

   **Best Practices**:
   ```typescript
   // ✅ Respond quickly (< 5 minutes ideal)
   // ✅ Provide value in every message
   // ✅ Easy opt-out mechanism
   // ✅ Don't send too frequently
   
   // Track quality metrics:
   interface QualityMetrics {
     message_sent: number;
     message_delivered: number;
     message_read: number;
     user_blocks: number;
     user_reports: number;
     avg_response_time_seconds: number;
   }
   ```

5. **Prohibited Content**:
   - ❌ No spam or bulk messaging
   - ❌ No misleading information
   - ❌ No sensitive content (gambling, tobacco, etc.)
   - ❌ No account sharing/selling

### 3.2 Webhook Security

**Meta Requirements**:

1. **Signature Verification** (MANDATORY):
   ```typescript
   // ✅ ALWAYS verify X-Hub-Signature-256
   import crypto from 'crypto';
   
   function verifyWebhookSignature(
     payload: string,
     signature: string,
     appSecret: string
   ): boolean {
     const expectedSignature = crypto
       .createHmac('sha256', appSecret)
       .update(payload)
       .digest('hex');
     
     return signature === `sha256=${expectedSignature}`;
   }
   
   // In webhook route:
   export async function POST(request: Request) {
     const rawBody = await request.text();
     const signature = request.headers.get('x-hub-signature-256');
     
     if (!signature || !verifyWebhookSignature(rawBody, signature, WHATSAPP_APP_SECRET)) {
       return Response.json({ error: "unauthorized" }, { status: 401 });
     }
     
     // Process webhook...
   }
   ```

2. **Webhook Verification**:
   ```typescript
   // GET /api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=xxx
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const mode = searchParams.get('hub.mode');
     const token = searchParams.get('hub.verify_token');
     const challenge = searchParams.get('hub.challenge');
     
     if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
       return new Response(challenge, { status: 200 });
     }
     
     return Response.json({ error: "forbidden" }, { status: 403 });
   }
   ```

3. **Response Time Requirements**:
   - Must respond within 20 seconds
   - Return 200 OK before heavy processing
   - Use async processing for complex workflows

---

## 4. API Security Standards (OWASP)

### 4.1 OWASP API Security Top 10 (2023)

**How Each Applies to Your Platform**:

| Risk | Applicable? | Mitigation |
|------|-------------|------------|
| **API1:2023 Broken Object Level Authorization** | ✅ High | Implement RLS policies, verify ticket ownership |
| **API2:2023 Broken Authentication** | ✅ High | Use Supabase Auth, secure session management |
| **API3:2023 Broken Object Property Level Authorization** | ✅ Medium | Validate all input fields, sanitize outputs |
| **API4:2023 Unrestricted Resource Consumption** | ✅ High | Rate limiting, pagination, timeouts |
| **API5:2023 Broken Function Level Authorization** | ✅ High | Admin-only routes behind auth checks |
| **API6:2023 Unrestricted Access to Sensitive Business Flows** | ✅ Critical | Payment flow validation, state machine guards |
| **API7:2023 Server Side Request Forgery (SSRF)** | ⚠️ Low | Validate URLs before fetching media |
| **API8:2023 Security Misconfiguration** | ✅ Medium | Secure headers, env vars, no debug in prod |
| **API9:2023 Improper Inventory Management** | ⚠️ Low | Document all API endpoints |
| **API10:2023 Unsafe Consumption of APIs** | ✅ Medium | Validate Meta/Safaricom responses |

**Implementation Examples**:

```typescript
// API1: Broken Object Level Authorization
// ❌ BAD:
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, params.id)
  });
  return Response.json(ticket);
}

// ✅ GOOD:
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  
  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, params.id),
      eq(tickets.tenantId, session.user.tenantId) // Tenant isolation
    )
  });
  
  if (!ticket) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  
  return Response.json(ticket);
}

// API4: Unrestricted Resource Consumption
// ✅ Implement rate limiting:
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return Response.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }
  
  // Process request...
}

// API6: Broken Business Logic
// ✅ Validate state transitions:
async function transitionTicket(ticketId: string, newState: string) {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId)
  });
  
  // Validate transition is allowed
  const allowedTransitions: Record<string, string[]> = {
    'init': ['quoted'],
    'quoted': ['booked'],
    'booked': ['paid', 'cancelled'],
    'paid': ['completed'],
  };
  
  if (!allowedTransitions[ticket.state]?.includes(newState)) {
    throw new Error(`Invalid transition: ${ticket.state} -> ${newState}`);
  }
  
  // Proceed with transition...
}
```

### 4.2 Input Validation & Sanitization

**Zod Schemas** (already in your stack):

```typescript
// ✅ Define schemas for all inputs
import { z } from 'zod';

const WhatsAppMessageSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string(),
        }),
        messages: z.array(z.object({
          from: z.string().regex(/^\d{10,15}$/), // Phone number validation
          id: z.string(),
          timestamp: z.string(),
          type: z.enum(['text', 'image', 'document', 'audio', 'video']),
          text: z.object({
            body: z.string().max(4096) // Prevent oversized inputs
          }).optional(),
        })),
      }),
    })),
  })),
});

// Use in webhook:
export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const validated = WhatsAppMessageSchema.parse(body);
    // Safe to use validated data
  } catch (error) {
    logger.error("Invalid webhook payload", error);
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
}
```

**SQL Injection Prevention**:

```typescript
// ✅ Use Drizzle ORM (parameterized queries)
// ❌ NEVER concatenate user input into SQL

// ✅ GOOD:
const results = await db.query.customers.findMany({
  where: eq(customers.phone, userProvidedPhone)
});

// ❌ BAD (never do this):
const results = await db.execute(
  `SELECT * FROM customers WHERE phone = '${userProvidedPhone}'`
);
```

**XSS Prevention**:

```typescript
// ✅ Sanitize HTML if displaying user content
import DOMPurify from 'isomorphic-dompurify';

function renderMessage(message: string) {
  // If rendering in admin dashboard
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
}
```

---

## 5. Serverless Architecture Best Practices

### 5.1 Vercel/Next.js Standards

**Edge vs Node.js Runtime**:

```typescript
// For API routes, prefer Node.js runtime for:
// - Database connections
// - Complex business logic
// - File processing

export const runtime = 'nodejs'; // Default, good for your use case

// Use Edge runtime only for:
// - Simple redirects
// - Header manipulation
// - Geo-routing
```

**Cold Start Optimization**:

```typescript
// ✅ Initialize connections outside handler
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Connection pooling (reused across invocations)
const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient);

export async function GET() {
  // Fast: connection already warm
  const tickets = await db.query.tickets.findMany();
  return Response.json(tickets);
}

// ❌ DON'T: Create new connection per request
export async function GET() {
  const client = postgres(process.env.DATABASE_URL!); // Slow!
  const db = drizzle(client);
  // ...
}
```

**Timeout Management**:

```typescript
// Vercel timeout: 10s (Hobby), 60s (Pro), 300s (Enterprise)
// Your current plan: likely 10s

// ✅ For long-running tasks:
export async function POST(request: Request) {
  const { ticketId } = await request.json();
  
  // Option 1: Immediate response + async processing
  processTicketAsync(ticketId); // Background job
  return Response.json({ status: "processing" });
  
  // Option 2: Use cron for batch processing
  // Queue to DB, process via /api/cron/processor
}
```

**Environment Variables**:

```typescript
// ✅ Validate env vars at startup
const requiredEnvVars = [
  'DATABASE_URL',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'SAFARICOM_API_KEY',
] as const;

requiredEnvVars.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});
```

### 5.2 Database Connection Pooling

**PostgreSQL Connection Limits**:

- Supabase Free Tier: ~60 concurrent connections
- Vercel Serverless: Can spike to 100+ concurrent functions

**Best Practices**:

```typescript
// ✅ Use connection pooling
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10, // Max connections per serverless instance
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10,
});

// ✅ Alternative: Use Supabase connection pooler
// DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### 5.3 Caching Strategies

```typescript
// ✅ Cache static/slow-changing data
import { unstable_cache } from 'next/cache';

const getWorkflowDefinition = unstable_cache(
  async (workflowName: string) => {
    const yaml = await fs.readFile(`./workflows/${workflowName}.yaml`, 'utf-8');
    return parseWorkflow(yaml);
  },
  ['workflow-definitions'],
  { revalidate: 3600 } // 1 hour
);

// ✅ Use Vercel KV for session/rate limiting data
import { kv } from '@vercel/kv';

await kv.set(`session:${userId}`, sessionData, { ex: 3600 });
```

---

## 6. Testing & Quality Assurance Standards

### 6.1 Test Coverage Requirements

**Industry Standards**:
- Critical paths (payment, auth): 100%
- Business logic: 80%+
- Integration points: 70%+
- Overall: 70%+

**Your Test Strategy**:

```typescript
// ✅ Unit tests (lib/ modules)
// jest.config.cjs already configured

// Example: lib/payments.test.ts
describe('requestPayment', () => {
  it('should create payment record with idempotency key', async () => {
    const result = await requestPayment('ticket-123', 1000);
    
    expect(result.amount).toBe(1000);
    expect(result.status).toBe('initiated');
    expect(result.idempotencyKey).toMatch(/^mpesa-ticket-123-/);
  });
  
  it('should prevent duplicate payment requests', async () => {
    await requestPayment('ticket-123', 1000);
    const duplicate = await requestPayment('ticket-123', 1000);
    
    expect(duplicate.status).toBe('initiated'); // Same record
  });
  
  it('should handle Safaricom API errors gracefully', async () => {
    // Mock Safaricom API failure
    mockSafaricomAPI.mockRejectedValue(new Error('Network error'));
    
    await expect(requestPayment('ticket-123', 1000))
      .rejects.toThrow('Payment request failed');
  });
});

// ✅ Integration tests (API routes)
// vitest configured for this

// Example: api/payments/mpesa-callback/route.test.ts
describe('POST /api/payments/mpesa-callback', () => {
  it('should process successful payment callback', async () => {
    const callback = {
      Body: {
        stkCallback: {
          MerchantRequestID: "req-123",
          CheckoutRequestID: "checkout-123",
          ResultCode: 0,
          ResultDesc: "Success",
        }
      }
    };
    
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(callback)
    }));
    
    expect(response.status).toBe(200);
    
    // Verify payment record updated
    const payment = await db.query.payments.findFirst({
      where: eq(payments.merchantRequestId, "req-123")
    });
    expect(payment.status).toBe('completed');
  });
});
```

### 6.2 Security Testing

**Required Tests**:

1. **Penetration Testing** (Annual minimum):
   - OWASP ZAP automated scan
   - Manual pen test before production launch
   - Focus: Auth, payment flows, data leakage

2. **Dependency Scanning**:
   ```bash
   # ✅ Add to CI/CD:
   npm audit --audit-level=moderate
   
   # ✅ Use GitHub Dependabot (enable in repo settings)
   # ✅ Use Snyk or similar for continuous monitoring
   ```

3. **SAST (Static Application Security Testing)**:
   ```bash
   # ✅ ESLint security plugins
   npm install --save-dev eslint-plugin-security
   
   # ✅ TypeScript strict mode (already enabled)
   # ✅ CodeQL scanning (GitHub Advanced Security)
   ```

### 6.3 Load Testing

**Recommended Tools**: k6, Artillery, or Apache JMeter

**Test Scenarios**:

```javascript
// k6 load test example
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Sustain 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Test webhook endpoint
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [/* ... */]
  });
  
  const res = http.post('https://your-app.vercel.app/api/whatsapp/webhook', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Performance Targets**:
- API response time: p95 < 500ms
- Webhook processing: < 100ms (before async handoff)
- Database queries: < 100ms
- Payment initiation: < 2s

---

## 7. Documentation Standards

### 7.1 Code Documentation

**JSDoc for Public APIs**:

```typescript
/**
 * Initiates an M-Pesa STK Push payment request.
 * 
 * @param ticketId - Unique identifier for the ticket
 * @param amount - Payment amount in KES (min: 10, max: 150000)
 * @param phoneNumber - Customer phone number in format 254XXXXXXXXX
 * 
 * @returns Promise resolving to payment record with status 'initiated'
 * 
 * @throws {PaymentError} If amount is invalid or API request fails
 * 
 * @example
 * ```typescript
 * const payment = await requestPayment('ticket-123', 1000, '254712345678');
 * console.log(payment.merchantRequestId); // "req-abc123"
 * ```
 */
export async function requestPayment(
  ticketId: string,
  amount: number,
  phoneNumber: string
): Promise<Payment> {
  // Implementation...
}
```

### 7.2 Architecture Decision Records (ADRs)

**Already Implemented**: `docs/adr/` ✅

**Recommendation**: Continue using ADRs for major decisions

**Template** (already in `0000-template.md`):
- Context
- Decision
- Status
- Consequences
- Alternatives considered

### 7.3 API Documentation

**Recommended**: OpenAPI/Swagger spec

```yaml
# docs/openapi.yaml
openapi: 3.0.0
info:
  title: ElixoSense WhatsApp API
  version: 1.0.0
  description: Internal API for WhatsApp commerce platform

paths:
  /api/tickets/{id}:
    get:
      summary: Get ticket details
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Ticket details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Ticket'
        '404':
          description: Ticket not found
```

### 7.4 Runbook

**Already Implemented**: `docs/runbook.md` ✅

**Ensure it includes**:
- Deployment procedures
- Incident response
- Rollback procedures
- Monitoring & alerts
- Emergency contacts

---

## 8. Deployment & Operations Standards

### 8.1 CI/CD Pipeline

**Recommended GitHub Actions Workflow**:

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
      
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/analyze@v2
  
  deploy-staging:
    needs: [test, security]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
  
  deploy-production:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 8.2 Environment Strategy

**Best Practice: 3 Environments**

| Environment | Branch | Auto-Deploy | Database | Purpose |
|-------------|--------|-------------|----------|---------|
| Development | `develop` | Yes (preview) | Dev DB | Feature testing |
| Staging | `staging` | Yes | Staging DB (prod-like) | Integration testing |
| Production | `main` | Yes | Prod DB | Live traffic |

**Environment Variables Management**:

```bash
# ✅ Use Vercel CLI for env management
vercel env add WHATSAPP_API_TOKEN production
vercel env add SAFARICOM_API_KEY production

# ✅ Never commit .env files
# ✅ Rotate secrets quarterly
# ✅ Use different credentials per environment
```

### 8.3 Monitoring & Observability

**Logging Standards**:

```typescript
// ✅ Structured logging
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  trace_id?: string;
}

class Logger {
  info(message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      trace_id: this.getTraceId(),
    }));
  }
  
  error(message: string, error: Error, context?: Record<string, unknown>) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      trace_id: this.getTraceId(),
    }));
    
    // Also send to Sentry
    Sentry.captureException(error, { contexts: { custom: context } });
  }
}
```

**Metrics to Track**:

```typescript
// ✅ Application metrics
const metrics = {
  // Performance
  api_response_time: { p50, p95, p99 },
  db_query_time: { p50, p95, p99 },
  
  // Business
  messages_received_per_minute: number,
  messages_sent_per_minute: number,
  tickets_created_per_hour: number,
  payments_initiated_per_hour: number,
  payments_completed_per_hour: number,
  payment_success_rate: number, // %
  
  // Errors
  webhook_errors_per_minute: number,
  payment_errors_per_minute: number,
  api_error_rate: number, // %
  
  // Quality
  whatsapp_quality_rating: 'green' | 'yellow' | 'red',
  avg_response_time_to_customer: number, // seconds
};

// ✅ Send to monitoring service
// Options: Vercel Analytics, DataDog, New Relic, Axiom
```

**Alerting Rules**:

```yaml
# Example alerting config
alerts:
  - name: High Error Rate
    condition: error_rate > 5% for 5 minutes
    severity: critical
    notify: [pagerduty, slack]
  
  - name: Slow API Response
    condition: api_response_time_p95 > 2s for 10 minutes
    severity: warning
    notify: [slack]
  
  - name: Payment Failure Spike
    condition: payment_error_rate > 10% for 5 minutes
    severity: critical
    notify: [pagerduty, slack, email]
  
  - name: WhatsApp Quality Degradation
    condition: whatsapp_quality_rating == 'yellow'
    severity: warning
    notify: [slack]
```

### 8.4 Backup & Disaster Recovery

**Database Backups**:

```bash
# ✅ Supabase provides automatic backups
# Free tier: Daily backups, 7-day retention
# Paid tier: PITR (Point-in-Time Recovery)

# ✅ Manual backup script (optional)
#!/bin/bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
# Upload to S3/Supabase Storage
```

**Recovery Time Objective (RTO)**: < 4 hours  
**Recovery Point Objective (RPO)**: < 24 hours (Free tier), < 1 hour (Paid tier)

**Disaster Recovery Plan**:

1. **Database failure**: Restore from Supabase backup
2. **Vercel outage**: Deploy to backup platform (Netlify, Railway)
3. **WhatsApp API outage**: Queue messages, retry when restored
4. **M-Pesa outage**: Manual payment verification flow

---

## 9. Compliance Checklist (Pre-Production)

### 9.1 Security Audit

- [ ] Penetration testing completed
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Secrets not in code/commits
- [ ] HTTPS enforced everywhere
- [ ] Webhook signatures verified
- [ ] SQL injection tests passed
- [ ] XSS prevention verified
- [ ] Rate limiting implemented
- [ ] Authentication/authorization tested
- [ ] Data encryption at rest confirmed
- [ ] Backup/restore tested

### 9.2 Payment Compliance

- [ ] M-Pesa sandbox testing completed
- [ ] Payment idempotency verified
- [ ] Transaction limits enforced (KES 10 - 150,000)
- [ ] Callback handling tested (including retries)
- [ ] Payment failure scenarios handled
- [ ] Refund process documented
- [ ] Financial records retention (7 years) implemented
- [ ] PCI DSS self-assessment completed (SAQ A-EP)

### 9.3 Data Protection

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] WhatsApp Business Policy compliance verified
- [ ] User opt-in mechanism implemented
- [ ] Data access request process defined
- [ ] Data deletion process defined (with exceptions)
- [ ] Data breach response plan documented
- [ ] Third-party data processing agreements signed

### 9.4 Operational Readiness

- [ ] Monitoring dashboards configured
- [ ] Alerts configured and tested
- [ ] Runbook documented and reviewed
- [ ] Incident response plan defined
- [ ] On-call rotation established
- [ ] Backup/restore procedures tested
- [ ] Rollback procedures tested
- [ ] Load testing completed
- [ ] Performance benchmarks met

### 9.5 WhatsApp Specific

- [ ] WhatsApp Business Account verified
- [ ] Phone number registered and verified
- [ ] Message templates approved
- [ ] Webhook URL registered
- [ ] Quality rating: Green
- [ ] Display name approved
- [ ] Profile configured (description, photo)
- [ ] About text set
- [ ] Business hours configured

---

## 10. Recommended Tools & Services

### 10.1 Security

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **Snyk** | Dependency scanning | Free tier available | High |
| **GitHub Advanced Security** | CodeQL, secret scanning | Included with GitHub Enterprise | High |
| **OWASP ZAP** | Automated security testing | Free | High |
| **Sentry** | Error tracking & monitoring | Free tier: 5k errors/month | High |
| **Upstash** | Rate limiting (Redis) | Free tier available | Medium |

### 10.2 Monitoring

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **Vercel Analytics** | Web analytics | Included with Vercel | High |
| **Axiom** | Log aggregation | Free tier: 0.5GB/month | Medium |
| **BetterStack** | Uptime monitoring | Free tier available | High |
| **DataDog** | APM & infrastructure | Paid (expensive) | Low (MVP) |

### 10.3 Testing

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **k6** | Load testing | Free (open source) | High |
| **Postman** | API testing | Free tier available | High |
| **Playwright** | E2E testing | Free (open source) | Medium |

---

## 11. Next Steps & Recommendations

### 11.1 Immediate Actions (Before Production)

1. **Security**:
   - [ ] Enable GitHub Dependabot
   - [ ] Run `npm audit` and fix high/critical issues
   - [ ] Implement rate limiting on all public endpoints
   - [ ] Add webhook signature verification
   - [ ] Set up Sentry error tracking

2. **Compliance**:
   - [ ] Draft Privacy Policy
   - [ ] Draft Terms of Service
   - [ ] Complete PCI DSS SAQ
   - [ ] Review WhatsApp Business Policy compliance

3. **Operations**:
   - [ ] Set up CI/CD pipeline
   - [ ] Configure production monitoring
   - [ ] Write incident response plan
   - [ ] Test backup/restore procedures

### 11.2 Short-term Improvements (First 3 Months)

1. **Performance**:
   - [ ] Implement caching strategy
   - [ ] Optimize database queries (add indexes)
   - [ ] Set up CDN for static assets

2. **Reliability**:
   - [ ] Add retry logic with exponential backoff
   - [ ] Implement circuit breakers for external APIs
   - [ ] Set up dead letter queue for failed messages

3. **Observability**:
   - [ ] Add custom metrics (business + technical)
   - [ ] Create operational dashboards
   - [ ] Set up automated alerts

### 11.3 Long-term Improvements (6-12 Months)

1. **Scalability**:
   - [ ] Migrate to Supabase Pro (better connection pooling)
   - [ ] Consider queue system (Upstash QStash) for heavy workloads
   - [ ] Implement multi-region deployment

2. **Compliance**:
   - [ ] Annual security audit
   - [ ] ISO 27001 certification (if scaling)
   - [ ] Regular pen testing

3. **Features**:
   - [ ] Multi-language support
   - [ ] Advanced analytics dashboard
   - [ ] AI-powered customer service

---

## 12. Key Standards Summary

| Area | Standard | Compliance Level | Notes |
|------|----------|------------------|-------|
| **Payment Security** | PCI DSS SAQ A-EP | Required | M-Pesa handles card data |
| **Data Protection** | Kenya DPA 2019 | Required | Active enforcement in Kenya |
| **Data Protection** | GDPR | Recommended | EU deployment region |
| **API Security** | OWASP API Top 10 | Required | Industry best practice |
| **WhatsApp** | Meta Business Policy | Required | Account suspension risk |
| **Code Quality** | TypeScript Strict | Implemented ✅ | Already in tsconfig |
| **Testing** | 70%+ coverage | Recommended | Jest/Vitest configured |
| **Monitoring** | Structured Logging | Required | Plan with Sentry |
| **Infrastructure** | Serverless Best Practices | Required | Vercel deployment |

---

## 13. Contact & Resources

### 13.1 Regulatory Bodies (Kenya)

- **Office of the Data Protection Commissioner (ODPC)**
  - Website: https://www.odpc.go.ke/
  - Email: dpo@odpc.go.ke

- **Communications Authority of Kenya (CAK)**
  - Website: https://www.ca.go.ke/
  - Relevant for telecoms/WhatsApp compliance

### 13.2 Official Documentation

- **Meta WhatsApp**: https://developers.facebook.com/docs/whatsapp
- **Safaricom Daraja**: https://developer.safaricom.co.ke/
- **PCI Security Standards**: https://www.pcisecuritystandards.org/
- **OWASP**: https://owasp.org/www-project-api-security/
- **Kenya DPA**: https://www.odpc.go.ke/dpa-act/

### 13.3 Internal Documentation

- Locked Stack: `/docs/inputs/cursor-locked-stack.md`
- ADRs: `/docs/adr/`
- Runbook: `/docs/runbook.md`
- Human Guide: `/humandocs/HUMAN_GUIDE.md`

---

**Document Owner**: Engineering Team  
**Review Frequency**: Quarterly  
**Last Reviewed**: 2026-01-14  
**Next Review**: 2026-04-14

---

## Appendix A: Glossary

- **ADR**: Architecture Decision Record
- **DPA**: Data Protection Act
- **GDPR**: General Data Protection Regulation
- **M-Pesa**: Mobile money service by Safaricom (Kenya)
- **ODPC**: Office of the Data Protection Commissioner (Kenya)
- **OWASP**: Open Web Application Security Project
- **PCI DSS**: Payment Card Industry Data Security Standard
- **RLS**: Row Level Security (PostgreSQL/Supabase feature)
- **RPO**: Recovery Point Objective
- **RTO**: Recovery Time Objective
- **SAQ**: Self-Assessment Questionnaire (PCI DSS)
- **SAST**: Static Application Security Testing
- **STK Push**: SIM Toolkit Push (M-Pesa payment initiation)
- **XSS**: Cross-Site Scripting

---

## Appendix B: Useful Commands

```bash
# Security audit
npm audit --audit-level=moderate
npm audit fix

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint -- --fix

# Testing
npm run test:unit
npm run test:integration

# Database migrations
npm run db:migrate

# Build & deploy
npm run build
vercel deploy --prod

# Environment management
vercel env ls
vercel env add VARIABLE_NAME production
vercel env pull .env.local
```
