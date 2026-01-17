# KCOS Kenya Context

## Kenya Commerce Landscape

```mermaid
mindmap
    root((Kenya Commerce))
        Payment Methods
            M-Pesa
                STK Push
                C2B Paybill
                Till Number
            Cash on Delivery
            Bank Transfer
            Credit/Debt Books
        Communication
            WhatsApp
                Primary channel
                Sheng messages
                Voice notes
            SMS
                Fallback
                Reminders
            USSD
                Feature phones
        Business Types
            Duka/Kiosk
            Mini Supermarket
            Restaurant
            Wholesale
            Service Provider
        Challenges
            Intermittent Internet
            Mixed Languages
            Informal Credit
            Trust Relationships
```

## M-Pesa Integration

```mermaid
sequenceDiagram
    participant C as Customer
    participant KCOS as KCOS
    participant MP as M-Pesa Daraja
    participant SIM as SIM Toolkit

    Note over KCOS: STK Push Flow
    KCOS->>MP: POST /mpesa/stkpush
    MP-->>KCOS: { CheckoutRequestID }
    MP->>SIM: Push to phone
    SIM->>C: "Enter PIN to pay KSh 500"
    C->>SIM: Enter PIN
    SIM->>MP: Confirm
    MP->>KCOS: POST callback
    KCOS->>KCOS: Update payment status
    KCOS->>C: WhatsApp confirmation
```

### M-Pesa Specifics

| Parameter | Value | Notes |
|-----------|-------|-------|
| Min Amount | KSh 1 | |
| Max Amount | KSh 150,000 | Per transaction |
| Phone Format | 254XXXXXXXXX | No leading 0 |
| Timeout | ~30 seconds | For user response |
| Callback | Required | Must be HTTPS |

## WhatsApp Integration

```mermaid
flowchart TB
    subgraph Incoming["📥 Incoming Messages"]
        TXT["Text\n'nataka sukari 2kg'"]
        DOC["Documents\nInvoices, receipts"]
        IMG["Images\nProduct photos"]
        LOC["Location\nDelivery address"]
    end

    subgraph Processing["⚙️ Processing"]
        PARSER["Chaos Parser\nHandles Sheng,\ntypos, shortcuts"]
    end

    subgraph Outgoing["📤 Outgoing"]
        CONF["Confirmations"]
        REMIND["Reminders"]
        RECEIPT["Digital receipts"]
    end

    Incoming --> Processing
    Processing --> Outgoing
```

### Sheng & Language Handling

```mermaid
flowchart LR
    subgraph Input["Customer Input"]
        I1["'nataka suka 2kg'"]
        I2["'sukari mbili'"]
        I3["'sugar two kgs'"]
        I4["'suka 2'"]
    end

    subgraph Parser["Chaos Parser"]
        P1["Alias mapping"]
        P2["Typo correction"]
        P3["Number extraction"]
        P4["Unit normalization"]
    end

    subgraph Output["Parsed Result"]
        O1["{\n  product: 'sukari',\n  quantity: 2,\n  unit: 'kg'\n}"]
    end

    Input --> Parser --> Output
```

### Parser Configuration

```yaml
parser_rules:
  product_aliases:
    sukari: ["sugar", "suka", "sucre", "shuga"]
    maziwa: ["milk", "mziwa", "mlk"]
    unga: ["flour", "uga", "ngano"]
    mafuta: ["oil", "cooking oil", "mfuta"]
    sabuni: ["soap", "sabun", "sbn"]
    
  unit_mappings:
    kg: ["kilo", "kilogram", "kgs", "kilos"]
    g: ["gram", "grams", "grm"]
    lita: ["litre", "liter", "litres", "l", "lt"]
    pcs: ["piece", "pieces", "pc", "piec"]
    packet: ["packets", "pkt", "pkts", "pckt"]
    
  number_words:
    moja: 1
    mbili: 2
    tatu: 3
    nne: 4
    tano: 5
```

## Business Hours & Timing

```mermaid
flowchart TB
    subgraph Hours["🕐 Business Hours (Africa/Nairobi)"]
        BH["7:00 AM - 8:00 PM\nAuto-responses enabled"]
    end

    subgraph Outside["🌙 Outside Hours"]
        OH["Messages logged\nNo auto-response\nMerchant notified next day"]
    end

    subgraph Rate["⏱️ Rate Limiting"]
        RL["5 messages per minute\nPer customer\nPrevents spam"]
    end

    subgraph Cooldown["❄️ Response Cooldown"]
        CD["5 minutes between\nauto-responses\nPer customer"]
    end
```

## Credit/Debt Management

```mermaid
flowchart TB
    subgraph Order["Order Creation"]
        O1["is_credit: true"]
        O2["payment_terms: '7 days'"]
    end

    subgraph Tracking["Outstanding Tracking"]
        T1["total_amount: 1000"]
        T2["outstanding_amount: 1000"]
    end

    subgraph Payments["Partial Payments"]
        P1["Payment 1: 500"]
        P2["Outstanding: 500"]
        P3["Payment 2: 500"]
        P4["Outstanding: 0"]
    end

    subgraph Status["Status Flow"]
        S1["pending"] --> S2["partial"] --> S3["paid"]
    end

    Order --> Tracking
    Tracking --> Payments
    Payments --> Status
```

## Multi-Channel Fallback

```mermaid
flowchart TB
    subgraph Primary["📱 Primary: WhatsApp"]
        WA["whatsapp.send"]
    end

    subgraph Fallback["📨 Fallback: SMS"]
        SMS["sms.send\n(Africa's Talking)"]
    end

    subgraph Decision{WhatsApp\nfailed?}
    end

    WA --> Decision
    Decision -->|Yes| SMS
    Decision -->|No| DONE["✓ Delivered"]
    SMS --> DONE

    style Fallback fill:#fff3e0
```

### Fallback Implementation

```typescript
async function sendWithFallback(params: {
  to: string;
  message: string;
  businessId: string;
}) {
  // Try WhatsApp first
  const waResult = await whatsappSend(params);
  
  if (waResult.success) {
    return { channel: 'whatsapp', ...waResult };
  }
  
  // Fallback to SMS
  const smsResult = await smsSend({
    to: params.to,
    message: truncateForSms(params.message), // Max 160 chars
  });
  
  return { 
    channel: 'sms', 
    whatsappError: waResult.error,
    ...smsResult 
  };
}
```

## Kenya-Specific Workflows

### Pattern: Duka Credit Sale

```yaml
id: duka-credit-sale
name: Duka Credit Sale with Follow-up
description: Sell on credit with automatic reminders

steps:
  - id: create_credit_order
    action: order.create
    input:
      isCredit: true
      paymentTerms: "{{ trigger.data.terms || '7 days' }}"

  - id: record_in_duka_book
    action: event.log
    input:
      eventType: "duka.credit_issued"
      eventData:
        customerName: "{{ customer.displayName }}"
        amount: "{{ order.totalAmount }}"
        dueDate: "{{ $now() + trigger.data.terms }}"

  - id: notify_customer
    action: whatsapp.send
    input:
      to: "{{ customer.phone }}"
      message: |
        {{ customer.displayName }}, deni yako ni KSh {{ order.totalAmount }}.
        Tafadhali lipa kabla ya siku {{ trigger.data.terms }}.
```

### Pattern: Mama Mboga Order

```yaml
id: mama-mboga-order
name: Mama Mboga Vegetable Order
description: Handles informal vegetable orders with weight estimates

steps:
  - id: parse_mboga
    action: document.parse
    input:
      content: "{{ trigger.data.text }}"
      type: "order"
      config:
        # Mama mboga specific
        product_aliases:
          sukuma: ["sukuma wiki", "kale", "skuma"]
          nyanya: ["tomatoes", "tomato", "tamato"]
          vitunguu: ["onions", "onion", "tunguu"]
          pilipili: ["pepper", "pilpil", "hoho"]
        
        # Informal units
        unit_mappings:
          bunch: ["fungu", "bunch", "bnch"]
          heap: ["rundo", "heap", "pile"]
          debe: ["tin", "debe", "bucket"]
```

## Integration Landscape

```mermaid
flowchart TB
    subgraph Core["KCOS Core"]
        WE["Workflow Engine"]
    end

    subgraph Kenya["🇰🇪 Kenya Integrations"]
        MP["M-Pesa\n(Safaricom)"]
        AT["Africa's Talking\n(SMS)"]
        WA["WhatsApp\n(Meta)"]
    end

    subgraph Future["🔮 Future Integrations"]
        EQUITY["Equity Bank\n(Eazzy API)"]
        KCB["KCB\n(M-Pesa Paybill)"]
        JUMIA["Jumia\n(Marketplace)"]
        GLOVO["Glovo\n(Delivery)"]
        SENDY["Sendy\n(Logistics)"]
    end

    subgraph Gov["🏛️ Government"]
        KRA["KRA\n(eTIMS)"]
        TIMS["TIMS\n(Invoicing)"]
    end

    Core --> Kenya
    Core -.-> Future
    Core -.-> Gov
```

## Localization Checklist

| Area | Consideration | Implementation |
|------|---------------|----------------|
| **Currency** | KSh (Kenya Shillings) | Format: `KSh 1,000` |
| **Phone** | 254XXXXXXXXX | 10 digits after country code |
| **Timezone** | Africa/Nairobi (EAT, UTC+3) | All timestamps |
| **Language** | Swahili + English + Sheng | Parser aliases |
| **Business Hours** | 7am - 8pm typical | Policy guards |
| **Public Holidays** | Kenyan calendar | Schedule awareness |
| **Weekend** | Sat-Sun (some work) | Configurable |
