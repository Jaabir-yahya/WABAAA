# KCOS Commerce Primitives & Patterns
## Universal Building Blocks Across All Industries

**Date**: January 17, 2026  
**Project**: Kenya Commerce OS (KCOS)  

---

## 1. The Universal Commerce Primitives

Every industry you care about (retail, restaurant, automotive, horticulture, healthcare, distribution, etc.) keeps repeating the same core moves:

1. **Order Intake** – “I want X”
2. **Identity** – “Who are you?”
3. **Catalog / Inventory** – “What do we have?”
4. **Pricing** – “What does it cost?”
5. **Payment** – “Pay for X”
6. **Fulfillment** – “Here is X”
7. **Notification** – “This is the status of X”
8. **Reconciliation** – “What happened today?”

Industries differ mostly in:
- What **X** is (parts, food, produce, medicine, services)
- How much structure the order has
- How regulated the domain is

KCOS focuses on **channels + actions** that can implement these primitives in Kenya.

---

## 2. KCOS Capability Matrix

Map KCOS capabilities to these primitives:

```text
KCOS CAPABILITY     →   PRIMITIVES IT ENABLES
═══════════════════════════════════════════════
WhatsApp
  - Order Intake          (receive free-text, media)
  - Catalog Display       (send menu/list/carousel)
  - Notification          (status updates)
  - Receipt Delivery      (PDF/text receipts)
  - Support               (two-way chat)

QR
  - Identity              (scan = who)
  - Product Identification (scan = what)
  - Location Verification  (scan = where)
  - Payment Initiation     (scan = pay)
  - Traceability           (scan = history)

M-Pesa
  - Payment Collection    (STK push)
  - Payment Verification  (callback/query)
  - Reconciliation        (transaction log)
  - Partial/Repeated Pay  (installments, top-ups)

SMS
  - Notification Fallback (when WhatsApp fails)
  - Critical Alerts       (delivery/payment failures)
  - OTP / Verification    (simple flows)

Data Store (Postgres + Events)
  - Order State           (lifecycle)
  - Customer History      (behaviour, CLV)
  - Inventory             (stock levels)
  - Audit Trail           (who did what, when)
```

---

## 3. Primitive 1: ORDER INTAKE

### 3.1 Foreign Pattern

Across Shopify, Square, Toast, etc., “Order Intake” usually means:

1. Show something the customer can select (menu/catalog)
2. Capture what they want
3. Validate it (availability, constraints)
4. Confirm back to them
5. Create an order record

Channels used abroad:
- Web / mobile app UI
- POS screen
- Phone-in orders entered by staff
- Kiosk / self-order screen

### 3.2 Kenya Adaptation (KCOS)

For KCOS, default channels:

- **WhatsApp** as the primary intake surface
- **QR** to jump into the right context (shop/branch/table)
- Optional **web mini-front** for richer flows

#### 3.3 Order Intake Pattern Workflow (Reusable)

```yaml
id: "pattern.order-intake.v1"
name: "Universal Order Intake (WhatsApp + QR)"

trigger:
  type: whatsapp.received

steps:
  # 1. Attach context (where did this come from?)
  - id: resolve_context
    action: context.resolve
    input:
      from: "{{ trigger.from }}"
      message: "{{ trigger.text }}"
      metadata: "{{ trigger.metadata }}"   # e.g., QR deep link params
    output: ctx

  # 2. Resolve or create customer (IDENTITY primitive)
  - id: resolve_customer
    action: actor.resolve
    input:
      phone: "{{ trigger.from }}"
      qrData: "{{ ctx.qr }}"
    output: customer

  # 3. Parse intent + items (from free-text)
  - id: parse_intent
    action: document.parse
    input:
      text: "{{ trigger.text }}"
      mode: "{{ ctx.domain }}"            # "retail" | "restaurant" | "parts" | ...
    output: parsed

  # 4. Validate items against catalog/inventory
  - id: validate_items
    action: inventory.validate_request
    input:
      items: "{{ parsed.items }}"
      locationId: "{{ ctx.locationId }}"
    output: validated
    compensation: whatsapp.send

  # 5. Create order record (no payment yet)
  - id: create_order
    action: order.create
    input:
      customerId: "{{ customer.id }}"
      items: "{{ validated.items }}"
      source: "{{ ctx.source }}"          # "whatsapp"
      locationId: "{{ ctx.locationId }}"
    output: order

  # 6. Confirm to customer (review + next step)
  - id: send_confirmation
    action: whatsapp.send
    input:
      to: "{{ trigger.from }}"
      template: "order_review"
      params:
        items: "{{ order.items }}"
        totalEstimate: "{{ validated.estimatedTotal }}"
        nextAction: "{{ ctx.nextStep }}"  # "pay", "confirm", etc.
```

**This pattern is industry-agnostic.**  
Retail/restaurant/automotive/horticulture only change:

- `ctx.domain` (for parsing)
- `inventory.validate_request` implementation
- Templates used in `whatsapp.send`

---

## 4. Primitive 2: IDENTITY

### Foreign Pattern

- Customer login (email/password, OAuth)
- Loyalty card
- Phone number on POS
- Account number (B2B)

### Kenya Adaptation

The phone number and/or QR code **is the identity**.

#### Identity Resolution Pattern

```yaml
id: "pattern.identity-resolution.v1"

trigger:
  # used as an internal step, not an external trigger

steps:
  - id: find_actor
    action: actor.find
    input:
      phone: "{{ input.phone }}"
      qrData: "{{ input.qr }}"
    output: existingActor

  - id: create_if_missing
    action: condition.if
    input:
      condition: "{{ existingActor == null }}"
      onTrue:
        action: actor.create
        input:
          phone: "{{ input.phone }}"
          qrData: "{{ input.qr }}"
      onFalse:
        action: noop
    output: actor
```

---

## 5. Primitive 3: PAYMENT COLLECTION

### Foreign Pattern (Stripe, Adyen, etc.)

- Create payment intent
- Present pay UI (card/wallet)
- Confirm payment
- Update invoice/order
- Send receipt

### Kenya Adaptation: M-Pesa + WhatsApp

#### Payment Collection Pattern

```yaml
id: "pattern.payment-collection.v1"

trigger:
  type: internal.call      # called from other workflows

steps:
  # 1. Calculate amount (including fees/taxes)
  - id: calculate_total
    action: pricing.calculate
    input:
      items: "{{ input.items }}"
      customerId: "{{ input.customerId }}"
      context: "{{ input.context }}"     # industry-specific
    output: pricing

  # 2. Initiate M-Pesa payment
  - id: initiate_mpesa
    action: mpesa.initiate
    input:
      phone: "{{ input.phone }}"
      amount: "{{ pricing.total }}"
      reference: "{{ input.orderId }}"
    output: stk

  # 3. Wait for callback
  - id: wait_for_callback
    action: wait.for
    input:
      waitForEvent: "mpesa.callback"
      timeout: 300000        # 5 minutes
    output: callback

  # 4. Verify payment
  - id: verify
    action: mpesa.verify
    input:
      transactionId: "{{ callback.transactionId }}"
      expectedAmount: "{{ pricing.total }}"
    output: payment

  # 5. Update order/payment records
  - id: record_payment
    action: payment.record
    input:
      orderId: "{{ input.orderId }}"
      transactionId: "{{ payment.transactionId }}"
      amount: "{{ payment.amount }}"
      status: "{{ payment.status }}"
    output: paymentRecord

  # 6. Notify customer
  - id: send_receipt
    action: whatsapp.send
    input:
      to: "{{ input.phone }}"
      template: "payment_receipt"
      params:
        amount: "{{ payment.amount }}"
        reference: "{{ payment.transactionId }}"
        orderId: "{{ input.orderId }}"
```

Any industry can reuse this pattern; only pricing rules and templates change.

---

## 6. Primitive 4: STATUS NOTIFICATION

Pattern: “Something happened” → “Tell the right people”.

```yaml
id: "pattern.status-notification.v1"

trigger:
  type: event.log

steps:
  - id: format_message
    action: notification.format
    input:
      eventType: "{{ trigger.type }}"
      eventData: "{{ trigger.data }}"
    output: msg

  - id: send_primary
    action: whatsapp.send
    input:
      to: "{{ msg.to }}"
      message: "{{ msg.body }}"

  - id: send_fallback
    action: condition.if
    input:
      condition: "{{ msg.requiresFallback }}"
      onTrue:
        action: sms.send
        input:
          to: "{{ msg.to }}"
          message: "{{ msg.bodyShort }}"
      onFalse:
        action: noop
```

---

## 7. Primitive 5: DAILY RECONCILIATION

Pattern: “What happened today?” for owner/managers.

```yaml
id: "pattern.daily-reconciliation.v1"

trigger:
  type: schedule.trigger
  cron: "0 21 * * *"    # every day at 21:00

steps:
  - id: aggregate
    action: report.aggregate
    input:
      period: "today"
      metrics:
        - "total_orders"
        - "total_revenue"
        - "failed_payments"
        - "top_items"
    output: report

  - id: format
    action: report.format_text
    input:
      report: "{{ report }}"
    output: text

  - id: send_to_owner
    action: whatsapp.send
    input:
      to: "{{ business.ownerPhone }}"
      message: "{{ text }}"
```

---

## 8. Industry as Configuration

Industries should primarily be **configuration + validation** on top of patterns:

### Example: Restaurant vs Automotive

**Restaurant config:**

```yaml
industry: "restaurant"
parsing:
  domain: "menu_items"
  synonyms:
    "chips": "FRIES"
    "soda": ["COKE", "FANTA", "SPRITE"]
pricing:
  taxRate: 0.16
  serviceCharge: 0.05
templates:
  order_review: "You ordered: {{ items }}. Total: {{ total }}."
  payment_receipt: "Thanks! Paid {{ amount }} for order {{ orderId }}."
```

**Automotive config:**

```yaml
industry: "automotive"
parsing:
  domain: "parts"
  synonyms:
    "prado": ["TOYOTA LANDCRUISER PRADO"]
    "vx": ["TRIM_VX"]
pricing:
  taxRate: 0.16
  laborRatePerHour: 2500
templates:
  order_review: "Parts: {{ items }}. Est. labor: {{ labor }}. Total: {{ total }}."
  payment_receipt: "Payment {{ amount }} received for job {{ jobCard }}."
```

Both use the **same primitives**, different configuration.

---

## 9. Build Order Recommendation

1. **Implement primitives (patterns) first:**
   - `pattern.order-intake.v1`
   - `pattern.identity-resolution.v1`
   - `pattern.payment-collection.v1`
   - `pattern.status-notification.v1`
   - `pattern.daily-reconciliation.v1`

2. **Expose them as building blocks in your workflow builder.**

3. **Add industry configs**:
   - `config.restaurant.yaml`
   - `config.retail.yaml`
   - `config.automotive.yaml`
   - `config.horticulture.yaml`

4. **Later**: add more primitives if you discover new universal ones.

---

## 10. How to Drive This in KCOS Code

In your TypeScript core, primitives become **template workflows**:

```ts
// patternRegistry.ts

type PatternId =
  | "pattern.order-intake.v1"
  | "pattern.identity-resolution.v1"
  | "pattern.payment-collection.v1"
  | "pattern.status-notification.v1"
  | "pattern.daily-reconciliation.v1";

interface PatternDefinition {
  id: PatternId;
  yaml: string;
  description: string;
}

class PatternRegistry {
  private patterns = new Map<PatternId, PatternDefinition>();

  register(pattern: PatternDefinition) {
    this.patterns.set(pattern.id, pattern);
  }

  get(id: PatternId) {
    return this.patterns.get(id);
  }

  list() {
    return Array.from(this.patterns.values());
  }
}
```

Industries then **compose** patterns instead of hand-writing everything.

---

## 11. Next Actions

1. Treat this document as the source of truth for primitives and patterns.
2. In `KCOS-DOCUMENTATION-INDEX.md`, keep a pointer under “docs/” to this primitives doc.
3. For Cursor:
   - Ask it to scaffold the `PatternRegistry` and a first implementation of `pattern.order-intake.v1` as a Temporal workflow.
4. When you design any new industry flow, force yourself to:
   - Express it only in terms of these primitives.
   - Add a primitive only if many industries need it and existing ones truly don’t fit.

This keeps KCOS mathematically clean: a small, powerful set of primitives → patterns → industry configs.
