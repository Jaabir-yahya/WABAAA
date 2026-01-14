# Industry Standards Quick Reference Guide

**ElixoSense WhatsApp Commerce Platform**  
**For**: Development Team, PM, Auditors  
**Version**: 1.0  
**Last Updated**: 2026-01-14

---

## 1-Page Summary

### Your Sector
**FinTech + E-commerce + Conversational Commerce** (Kenya)

### Critical Standards
1. **PCI DSS** (Payment processing) - SAQ A-EP likely applicable
2. **Kenya DPA 2019** (Data protection) - Mandatory
3. **Meta WhatsApp Business Policy** - Account suspension risk if violated
4. **M-Pesa Daraja Guidelines** - Required for payment integration
5. **OWASP Top 10** - API security best practices

### Compliance Status

| Standard | Status | Priority | Action Required |
|----------|--------|----------|-----------------|
| WhatsApp Business Policy | ⚠️ Review | Critical | Verify opt-in mechanism |
| M-Pesa Integration | ⚠️ In Progress | Critical | Complete sandbox testing |
| Data Protection (Kenya) | ⚠️ Partial | High | Add privacy policy |
| PCI DSS | ✅ Simplified | High | Complete SAQ A-EP |
| OWASP API Security | ⚠️ In Progress | High | Add rate limiting |
| TypeScript Strict Mode | ✅ Implemented | Medium | Maintain |
| Testing (70%+ coverage) | ❌ Pending | Medium | Write tests |
| Monitoring (Sentry) | ⚠️ Planned | Medium | Configure |

---

## Key Requirements by Area

### 1. Payment Security (M-Pesa)

**Must Have**:
- ✅ HTTPS only
- ✅ Idempotency (prevent double charges)
- ✅ Amount validation (KES 10 - 150,000)
- ✅ Callback verification
- ✅ Transaction logging (7-year retention)
- ⚠️ Sandbox testing complete
- ❌ Production credentials secured

**Quick Check**:
```typescript
// Every payment must have idempotency key
const idempotencyKey = `mpesa-${ticketId}-${timestamp}`;

// Validate amount
if (amount < 10 || amount > 150000) {
  throw new Error('Invalid amount');
}

// Log everything
await logTransaction({ type: 'payment', ...details });
```

---

### 2. WhatsApp Cloud API

**Must Have**:
- ✅ Signature verification (`X-Hub-Signature-256`)
- ✅ Webhook responds < 20 seconds
- ✅ User opt-in before messaging
- ✅ 24-hour message window respected
- ⚠️ Message templates approved
- ❌ Quality rating monitored (Green/Yellow/Red)

**Quick Check**:
```typescript
// ALWAYS verify webhook signature
if (!verifyWebhookSignature(payload, signature, secret)) {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}

// Check 24-hour window before sending
const canSend = await canMessageCustomer(customerId);
if (!canSend) {
  // Use approved template instead
}
```

---

### 3. Data Protection (Kenya DPA 2019)

**Must Have**:
- ❌ Privacy Policy published
- ❌ Terms of Service published
- ✅ Consent mechanism for data collection
- ⚠️ Data retention policy (7 years for financial)
- ❌ Data deletion process
- ❌ Data access request process
- ⚠️ Data localization (consider af-south-1 region)

**Customer Rights**:
1. **Right to Access**: Export all their data
2. **Right to Deletion**: With exceptions for financial records
3. **Right to Correction**: Update inaccurate data
4. **Right to Portability**: JSON export

**Quick Check**:
```typescript
// Implement these endpoints:
// GET /api/customers/:phone/data - Export all data
// DELETE /api/customers/:phone - Delete (with exceptions)
// PATCH /api/customers/:phone - Update data
```

---

### 4. API Security (OWASP)

**Top Risks for Your App**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken Authorization | High | RLS policies + ownership checks |
| Rate Limiting Missing | High | Upstash/Vercel rate limiting |
| Webhook Signature Bypass | Critical | ALWAYS verify signatures |
| Payment Flow Manipulation | Critical | State machine validation |
| SQL Injection | Medium | Use Drizzle ORM (parameterized) |
| Secrets in Code | Critical | Environment variables only |

**Quick Check**:
```bash
# No secrets in code
grep -r "sk_" src/  # Should be empty
grep -r "Bearer " src/  # Should be empty

# No SQL injection
# All queries use Drizzle ORM ✅

# Rate limiting
curl https://your-app.com/api/webhook (100x)
# Should return 429 after threshold
```

---

### 5. Infrastructure Security

**Vercel Security Headers** (Required):

```typescript
// middleware.ts or next.config.ts
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

**Environment Variables**:
```bash
# NEVER in code or Git
DATABASE_URL
WHATSAPP_API_TOKEN
WHATSAPP_APP_SECRET
SAFARICOM_API_KEY
SAFARICOM_API_SECRET
SUPABASE_SERVICE_KEY

# Set in Vercel dashboard only
```

---

## Production Readiness Criteria

### Must Have Before Launch

- [ ] **Security**
  - [ ] All secrets in environment variables (not code)
  - [ ] Webhook signature verification implemented
  - [ ] Rate limiting on all public endpoints
  - [ ] HTTPS enforced everywhere
  - [ ] Security headers configured
  
- [ ] **Payment**
  - [ ] M-Pesa sandbox testing complete
  - [ ] Idempotency implemented
  - [ ] Transaction logging (7-year retention)
  - [ ] Amount validation (10-150,000 KES)
  
- [ ] **WhatsApp**
  - [ ] Webhook signature verification
  - [ ] Response time < 20 seconds
  - [ ] Message templates approved
  - [ ] Opt-in mechanism implemented
  
- [ ] **Data Protection**
  - [ ] Privacy Policy published
  - [ ] Terms of Service published
  - [ ] User consent collected
  - [ ] Data retention policy implemented
  
- [ ] **Monitoring**
  - [ ] Error tracking (Sentry)
  - [ ] Uptime monitoring
  - [ ] Alert system configured
  - [ ] Logs don't contain secrets

### Nice to Have

- [ ] PCI DSS SAQ completed
- [ ] Penetration testing done
- [ ] Load testing completed
- [ ] 70%+ test coverage
- [ ] Automated dependency scanning
- [ ] Multi-region backup

---

## Common Mistakes to Avoid

### 1. ❌ Logging Secrets
```typescript
// ❌ DON'T
logger.info('Payment request', { apiKey: SAFARICOM_API_KEY });

// ✅ DO
logger.info('Payment request', { ticketId, amount });
```

### 2. ❌ Skipping Webhook Verification
```typescript
// ❌ DON'T
export async function POST(request: Request) {
  const body = await request.json();
  // Process without verification - DANGEROUS!
}

// ✅ DO
export async function POST(request: Request) {
  const signature = request.headers.get('x-hub-signature-256');
  const body = await request.text();
  
  if (!verifySignature(body, signature)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  
  // Now safe to process
}
```

### 3. ❌ Not Implementing Idempotency
```typescript
// ❌ DON'T
async function chargeCustomer(ticketId: string, amount: number) {
  return await mpesa.charge({ ticketId, amount });
  // If called twice = double charge!
}

// ✅ DO
async function chargeCustomer(ticketId: string, amount: number) {
  const idempotencyKey = `payment-${ticketId}`;
  
  const existing = await db.query.payments.findFirst({
    where: eq(payments.idempotencyKey, idempotencyKey)
  });
  
  if (existing) return existing; // Don't charge again
  
  return await mpesa.charge({ ticketId, amount });
}
```

### 4. ❌ Ignoring Rate Limits
```typescript
// ❌ DON'T
export async function POST(request: Request) {
  // Process every request - vulnerable to DoS
}

// ✅ DO
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return Response.json({ error: 'rate_limit' }, { status: 429 });
  }
  
  // Process request
}
```

### 5. ❌ Direct DB Access Without Authorization
```typescript
// ❌ DON'T
export async function GET(req: Request, { params }) {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, params.id)
  });
  return Response.json(ticket); // Any user can see any ticket!
}

// ✅ DO
export async function GET(req: Request, { params }) {
  const session = await getServerSession();
  
  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, params.id),
      eq(tickets.tenantId, session.user.tenantId)
    )
  });
  
  if (!ticket) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  
  return Response.json(ticket);
}
```

---

## Testing Checklist

### Before Every Deploy

```bash
# 1. Type check
npm run typecheck

# 2. Lint
npm run lint

# 3. Tests
npm run test:unit
npm run test:integration

# 4. Security audit
npm audit --audit-level=high

# 5. Build
npm run build

# 6. Verify env vars
vercel env ls production
```

### Security Tests

```bash
# 1. Test webhook signature validation
curl -X POST https://your-app.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Expected: 401 Unauthorized (no valid signature)

# 2. Test rate limiting
for i in {1..100}; do curl https://your-app.com/api/webhook; done
# Expected: Some 429 responses

# 3. Test unauthorized access
curl https://your-app.com/api/admin/tickets
# Expected: 401 Unauthorized

# 4. Test SQL injection
curl -X POST https://your-app.com/api/tickets \
  -d '{"phone": "254\"; DROP TABLE tickets;--"}'
# Expected: Validation error, table exists
```

---

## Regulatory Timeline

### Immediate (Before Launch)
- Privacy Policy
- Terms of Service
- WhatsApp opt-in mechanism
- Payment logging (7-year retention)

### 30 Days After Launch
- Monitor WhatsApp quality rating
- Review payment success rates
- Check for security incidents

### 90 Days After Launch
- First security audit
- Review data protection compliance
- Update dependencies

### Annual
- PCI DSS review
- Full security audit
- Penetration testing
- Compliance review

---

## Quick Reference: Key Limits

| Service | Limit | Action if Exceeded |
|---------|-------|-------------------|
| M-Pesa Min | KES 10 | Reject payment |
| M-Pesa Max | KES 150,000 | Split or reject |
| WhatsApp Message Window | 24 hours | Use template |
| WhatsApp Message Size | 4096 chars | Truncate/split |
| Vercel Function Timeout | 10s (Hobby) | Async processing |
| Supabase Connections | ~60 (Free) | Connection pooling |
| API Request Size | 4.5 MB | Reject large files |

---

## Contact Information

### Regulatory Bodies (Kenya)
- **Data Protection**: https://www.odpc.go.ke/
- **Safaricom Support**: https://developer.safaricom.co.ke/support

### Vendor Support
- **Meta WhatsApp**: https://business.facebook.com/support
- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support

### Internal Documentation
- Full Standards: `/docs/INDUSTRY_STANDARDS.md`
- Security Checklist: `/docs/SECURITY_CHECKLIST.md`
- Locked Stack: `/docs/inputs/cursor-locked-stack.md`
- ADRs: `/docs/adr/`
- Runbook: `/docs/runbook.md`

---

## Emergency Procedures

### Payment Issue
1. Check Safaricom dashboard
2. Review transaction logs
3. Contact Safaricom support
4. Manual verification if needed

### WhatsApp Quality Degradation
1. Check quality rating in Meta dashboard
2. Review recent messages for user blocks/reports
3. Pause proactive messaging
4. Review and fix message templates

### Data Breach
1. Isolate affected systems
2. Notify ODPC within 72 hours
3. Notify affected users
4. Document incident
5. Implement fixes

### Service Outage
1. Check Vercel status
2. Review error logs
3. Rollback if needed
4. Communicate with users

---

**This is a living document. Update as standards evolve.**

**Last Updated**: 2026-01-14  
**Next Review**: 2026-04-14  
**Owner**: Engineering Team
