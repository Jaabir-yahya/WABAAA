# Security Checklist for Production Deployment

**Project**: ElixoSense WhatsApp Commerce Platform  
**Version**: 1.0  
**Last Updated**: 2026-01-14

---

## Pre-Deployment Security Checklist

Use this checklist before deploying to production. Mark each item as complete.

### 1. Authentication & Authorization

- [ ] Admin authentication implemented (Supabase Auth)
- [ ] Session management configured (secure, httpOnly cookies)
- [ ] Password requirements enforced (min 8 chars, complexity)
- [ ] Multi-factor authentication considered/implemented
- [ ] Admin roles properly defined in database
- [ ] Row-level security (RLS) policies enabled and tested
- [ ] All admin routes protected with authentication middleware
- [ ] Session timeout configured (recommended: 1 hour)
- [ ] Logout functionality working correctly

**Validation**:
```bash
# Test unauthorized access
curl https://your-domain.com/api/tickets -v
# Expected: 401 Unauthorized

# Test with valid session
curl https://your-domain.com/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" -v
# Expected: 200 OK
```

---

### 2. API Security

- [ ] All public endpoints have rate limiting
- [ ] Request size limits configured (prevent DoS)
- [ ] CORS configured properly (not set to `*`)
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] Output sanitization (prevent data leakage)
- [ ] SQL injection prevention verified (ORM usage)
- [ ] NoSQL injection prevention (if applicable)
- [ ] API versioning strategy defined
- [ ] Error messages don't leak sensitive info

**Rate Limiting Check**:
```typescript
// Should be implemented on all public routes
// Test: Send 100 requests rapidly
// Expected: 429 Too Many Requests after threshold
```

**CORS Configuration**:
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

### 3. Webhook Security

- [ ] WhatsApp webhook signature verification implemented
- [ ] M-Pesa callback signature verification implemented
- [ ] Webhook endpoints have idempotency protection
- [ ] Replay attack prevention (timestamp validation)
- [ ] Webhook secrets stored securely (environment variables)
- [ ] Webhook endpoints respond within timeout (< 20s)
- [ ] Failed webhooks logged for retry
- [ ] Webhook payload size validated

**Webhook Signature Verification**:
```typescript
// Must verify X-Hub-Signature-256 for WhatsApp
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSig}`;
}

// Test with invalid signature
// Expected: 401 Unauthorized
```

---

### 4. Data Protection

- [ ] Sensitive data encrypted at rest (database encryption)
- [ ] Sensitive data encrypted in transit (HTTPS only)
- [ ] Database credentials not in code
- [ ] API keys not in code or client-side
- [ ] Customer phone numbers stored securely
- [ ] Payment data minimized (no card numbers stored)
- [ ] Personal data retention policy implemented
- [ ] Data deletion mechanism implemented
- [ ] Audit logs for all data access

**Environment Variables Check**:
```bash
# Verify no secrets in code
grep -r "sk_live" src/  # Should return nothing
grep -r "pk_live" src/  # Should return nothing
grep -r "Bearer " src/  # Should return nothing

# Verify .env files not committed
git log --all --full-history -- "*env*"
# Should not show .env.local or .env.production
```

---

### 5. Payment Security

- [ ] M-Pesa credentials secured (env vars only)
- [ ] Payment amount validation (min/max limits)
- [ ] Duplicate payment prevention (idempotency)
- [ ] Payment callback verification
- [ ] Transaction logging (all attempts logged)
- [ ] Failed payment handling
- [ ] Refund process documented
- [ ] Financial audit trail immutable
- [ ] PCI DSS SAQ completed

**Payment Validation**:
```typescript
// Validate payment amounts
const MIN_AMOUNT = 10;   // KES
const MAX_AMOUNT = 150000; // KES

function validatePaymentAmount(amount: number): boolean {
  return amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
}

// Test with invalid amounts
// Expected: Validation error
```

---

### 6. Dependency Security

- [ ] All dependencies up-to-date
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] No high vulnerabilities (`npm audit`)
- [ ] GitHub Dependabot enabled
- [ ] Automated dependency updates configured
- [ ] Lock files committed (`package-lock.json`)
- [ ] Production dependencies minimal
- [ ] Unused dependencies removed

**Audit Commands**:
```bash
# Check for vulnerabilities
npm audit --audit-level=moderate

# Fix automatically if possible
npm audit fix

# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Check bundle size
npm run build
# Review .next/build output
```

---

### 7. Infrastructure Security

- [ ] HTTPS enforced (no HTTP)
- [ ] TLS 1.2+ required
- [ ] Security headers configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Content-Security-Policy configured
- [ ] No debug endpoints in production
- [ ] Error stack traces disabled in production

**Security Headers**:
```typescript
// middleware.ts or next.config.ts
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];
```

**Verify Headers**:
```bash
curl -I https://your-domain.com
# Should include all security headers
```

---

### 8. Logging & Monitoring

- [ ] All errors logged (Sentry configured)
- [ ] Sensitive data not logged (no passwords, tokens)
- [ ] Structured logging implemented (JSON format)
- [ ] Log retention policy defined
- [ ] Security events logged (auth failures, etc.)
- [ ] Performance monitoring configured
- [ ] Uptime monitoring configured
- [ ] Alerts configured for critical errors
- [ ] Log aggregation service configured

**What NOT to Log**:
```typescript
// ❌ DON'T log these:
// - Passwords
// - API keys/tokens
// - Full credit card numbers
// - Full phone numbers (mask: 254XXX***678)
// - Payment codes
// - Session tokens

// ✅ DO log these:
// - Request IDs
// - User IDs (not PII)
// - Error messages (sanitized)
// - Performance metrics
// - Security events
```

---

### 9. Secrets Management

- [ ] No secrets in code
- [ ] No secrets in Git history
- [ ] Environment variables used for secrets
- [ ] Secrets rotated regularly (quarterly)
- [ ] Different secrets per environment
- [ ] Secrets access logged
- [ ] Secrets backup procedure documented
- [ ] Service accounts use minimal permissions

**Secrets Rotation Schedule**:
```bash
# Quarterly rotation
- WHATSAPP_API_TOKEN
- WHATSAPP_APP_SECRET
- SAFARICOM_API_KEY
- SAFARICOM_API_SECRET
- CRON_SECRET
- SUPABASE_SERVICE_KEY (annually)

# Document last rotation date
```

---

### 10. Database Security

- [ ] Database not publicly accessible
- [ ] Strong database password (min 16 chars)
- [ ] Database backups enabled
- [ ] Backup restoration tested
- [ ] Connection pooling configured
- [ ] Row-level security (RLS) enabled
- [ ] Database queries parameterized (no string concat)
- [ ] Sensitive columns encrypted
- [ ] Database audit logging enabled

**RLS Policies Check**:
```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should have rowsecurity = true

-- Test RLS bypass attempt
SET ROLE anon;
SELECT * FROM tickets WHERE tenant_id != 'current_tenant';
-- Should return 0 rows
```

---

### 11. Incident Response

- [ ] Incident response plan documented
- [ ] Security contact email published
- [ ] Breach notification procedure defined
- [ ] Data breach response plan tested
- [ ] Rollback procedure documented and tested
- [ ] Emergency contacts list maintained
- [ ] Post-mortem template prepared
- [ ] Communication plan for incidents

**Incident Response Steps**:
1. **Detect**: Monitoring alerts or user report
2. **Assess**: Severity and scope
3. **Contain**: Isolate affected systems
4. **Eradicate**: Remove threat
5. **Recover**: Restore normal operations
6. **Review**: Post-mortem and improvements

---

### 12. Compliance

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie policy (if applicable)
- [ ] GDPR compliance reviewed
- [ ] Kenya DPA compliance verified
- [ ] WhatsApp Business Policy reviewed
- [ ] M-Pesa terms reviewed
- [ ] Data processing agreements signed
- [ ] User consent mechanisms implemented

**Required Legal Documents**:
- Privacy Policy (public URL)
- Terms of Service (public URL)
- Data Processing Agreement (internal)
- PCI DSS SAQ (internal)

---

### 13. Testing

- [ ] Unit tests passing (70%+ coverage)
- [ ] Integration tests passing
- [ ] Security tests performed
- [ ] Load testing completed
- [ ] Penetration testing completed
- [ ] Vulnerability scanning completed
- [ ] Webhook replay attack tested
- [ ] Payment idempotency tested
- [ ] Error handling tested

**Security Test Cases**:
```bash
# 1. SQL Injection
curl -X POST https://your-domain.com/api/tickets \
  -d '{"customer_phone": "254123\"; DROP TABLE tickets; --"}'
# Expected: Validation error, table not dropped

# 2. XSS
curl -X POST https://your-domain.com/api/tickets \
  -d '{"notes": "<script>alert(1)</script>"}'
# Expected: Script sanitized on output

# 3. Unauthorized access
curl https://your-domain.com/api/admin/tickets
# Expected: 401 Unauthorized

# 4. Rate limiting
for i in {1..100}; do 
  curl https://your-domain.com/api/whatsapp/webhook & 
done
# Expected: Some requests return 429
```

---

### 14. Deployment

- [ ] CI/CD pipeline configured
- [ ] Automated tests run on deploy
- [ ] Staging environment tested
- [ ] Production deploy checklist followed
- [ ] Rollback tested
- [ ] Zero-downtime deployment verified
- [ ] Environment variables set in Vercel
- [ ] DNS configured correctly
- [ ] SSL certificate valid

**Pre-Deploy Checklist**:
```bash
# 1. Run all tests
npm run test:unit
npm run test:integration

# 2. Check for vulnerabilities
npm audit --audit-level=high

# 3. Type check
npm run typecheck

# 4. Lint
npm run lint

# 5. Build
npm run build

# 6. Verify environment variables
vercel env ls production

# 7. Deploy to staging first
vercel deploy

# 8. Test staging thoroughly
# (manual testing + automated tests)

# 9. Deploy to production
vercel deploy --prod

# 10. Verify production
curl https://your-domain.com/api/health
```

---

## Security Scoring

Calculate your security score:

| Category | Weight | Score (0-10) | Weighted |
|----------|--------|--------------|----------|
| Authentication & Authorization | 15% | ___ | ___ |
| API Security | 15% | ___ | ___ |
| Webhook Security | 10% | ___ | ___ |
| Data Protection | 15% | ___ | ___ |
| Payment Security | 15% | ___ | ___ |
| Infrastructure Security | 10% | ___ | ___ |
| Logging & Monitoring | 5% | ___ | ___ |
| Incident Response | 5% | ___ | ___ |
| Compliance | 5% | ___ | ___ |
| Testing | 5% | ___ | ___ |
| **TOTAL** | **100%** | | **___** |

**Scoring Guide**:
- **9-10**: Production ready
- **7-8**: Minor improvements needed
- **5-6**: Major improvements needed
- **< 5**: NOT production ready

**Minimum Required Score**: 8.0/10

---

## Post-Deployment Verification

After deploying to production, verify:

- [ ] All endpoints responding correctly
- [ ] Webhooks receiving and processing messages
- [ ] Payments working (test transaction)
- [ ] Admin dashboard accessible
- [ ] Monitoring showing healthy metrics
- [ ] No errors in Sentry
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Performance acceptable (< 500ms p95)

**Production Health Check**:
```bash
# 1. Basic connectivity
curl https://your-domain.com

# 2. API health
curl https://your-domain.com/api/health

# 3. Security headers
curl -I https://your-domain.com | grep -i "strict-transport"

# 4. SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 5. Performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com
# curl-format.txt:
#   time_total: %{time_total}s
```

---

## Continuous Security

### Weekly
- [ ] Review error logs
- [ ] Check monitoring dashboards
- [ ] Review security alerts

### Monthly
- [ ] Run `npm audit`
- [ ] Review and rotate temporary API keys
- [ ] Check for dependency updates
- [ ] Review access logs for anomalies

### Quarterly
- [ ] Rotate all API keys and secrets
- [ ] Review and update dependencies
- [ ] Penetration testing
- [ ] Security training for team

### Annually
- [ ] Full security audit
- [ ] Compliance review
- [ ] Disaster recovery drill
- [ ] Review and update security policies

---

## Emergency Contacts

**Security Incident**:
- Primary: [Your Security Lead]
- Secondary: [CTO/Technical Lead]
- Email: security@your-domain.com

**Service Outage**:
- On-call Engineer: [Phone/Pager]
- Escalation: [Manager]

**Vendor Issues**:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Meta Support: https://business.facebook.com/support
- Safaricom Support: https://developer.safaricom.co.ke/support

---

**Checklist Owner**: Security Team  
**Review Frequency**: Before each production deployment  
**Last Updated**: 2026-01-14

---

## Appendix: Security Tools

### Recommended Tools

1. **Snyk** - Dependency scanning
   ```bash
   npm install -g snyk
   snyk test
   snyk monitor
   ```

2. **OWASP ZAP** - Security scanner
   ```bash
   docker run -t owasp/zap2docker-stable zap-baseline.py \
     -t https://your-domain.com
   ```

3. **Lighthouse** - Security & performance audit
   ```bash
   npm install -g @lhci/cli
   lhci autorun --url=https://your-domain.com
   ```

4. **SSL Labs** - SSL/TLS testing
   - https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

5. **Security Headers** - Header testing
   - https://securityheaders.com/?q=your-domain.com

---

**Sign-off**:

- [ ] Security Lead: _________________ Date: _______
- [ ] Technical Lead: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
