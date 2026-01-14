Elixosense is a men’s wellness / supplement brand, not a software product, so there is no public “developer documentation” in the usual sense; the best you can get is business, product, and operations context from their public footprint. That’s still enough to design flows, ledgers, and WhatsApp experiences tailored to them.[1][2][3]

Below is all the usable context, grouped so you can plug it straight into your spec.

***

## Brand and business model

- Elixosense positions itself as **East Africa’s leading lab‑tested men’s wellness brand**, focused on testosterone and performance supplements sold across Kenya, Somalia, Uganda, and Tanzania.[4][1]
- They sell premium wellness products via an e‑commerce site (Shopify or similar), with a catalog including items like “Testo Booster” and other herbal blends.[5][6]
- They are a **direct‑to‑consumer** brand with strong emphasis on trust, lab testing, and clinically studied formulas, which means evidence and dispute handling should be tight (receipts, delivery confirmations, advice trails).[6][7][1]

***

## Contact, operations, and service hours

- Location: South C, Nairobi, Kenya (Leebarn estate / Langata area references from import records).[2][8][9]
- Contact: phone +254 729 043 238 and support@elixosense.com (also info@elixosense.com appears on About page).[3][5][2]
- Hours: Monday–Saturday 8am–1am, Sunday 10am–11pm, which implies long WhatsApp support windows and late‑night ordering.[5][2]

Implications for your system:

- WhatsApp automation must handle **late‑night inquiries and orders**, including escalation paths when humans are offline.  
- SLAs, queueing, and routing logic should assume almost “near‑24/7” availability with perhaps different response expectations after midnight.

***

## Products and catalog structure

- “Testo Booster” product page shows a **detailed ingredient list** (Ashwagandha, Tribulus Terrestris, Safed Musli, Zinc, Kaunch Beej, etc.), benefits, dosage guidance, and usage warnings.[6]
- The products section suggests a **small but high‑margin SKU set**, more like a focused wellness line than a huge general catalog.[5][6]

Implications:

- WhatsApp flows should emphasize:  
  - Quick product discovery (1–10 SKUs max) with clear benefits and contraindications.  
  - Advice / pre‑purchase Q&A workflows (e.g., “Are you on medication X?”, “What age are you?”) for safety.  
  - Strong **evidence trail** around what advice was given in case of health‑related disputes.

***

## Brand tone, social presence, and funnel

- Instagram and Facebook present them as a **premium men’s wellness brand** with strong masculinity and confidence messaging (“His strength starts here”).[4][3]
- Social content appears oriented to:  
  - Education about performance and wellness.  
  - Testimonials / social proof.  
  - Call‑to‑action back to WhatsApp or site for purchase and support.[7][4]

Implications:

- Your WhatsApp automation should be able to:  
  - Capture leads **from IG/FB campaigns** into a structured CRM/ledger.  
  - Run **broadcast and follow‑up flows** (e.g., new customer drip, re‑order reminders after 30–60 days).  
  - Track referrals, coupon codes, and campaign attribution in your ledger.

***

## Logistics, imports, and scaling hints

- Import/export records show Elixosense Limited importing “amber, booster, bottle” and similar inventory, indicating they manage physical stock and packaging at some scale.[8][9][10]
- Operating across multiple East African countries suggests cross‑border shipping complexity and potentially mixed payment methods (M‑Pesa, bank, maybe cash on delivery).[10][1]

Implications for your architecture:

- Your ledger must handle:  
  - Multi‑country orders (Kenya first, but with flags for Somalia/Uganda/Tanzania).  
  - Different shipping workflows (local courier vs. regional shipping).  
  - Inventory events tied to WhatsApp orders and returns (e.g., failed delivery, disputes on product quality).  

***

## How to use this in your spec

When you and Comet define the system spec, you can now explicitly say:

- “First production tenant: **Elixosense, a men’s wellness D2C brand in Nairobi with 5–10 SKUs, late‑night support hours, and East Africa customers**.”[1][2][5]
- “Key flows: IG/FB → WhatsApp DM → guided product selection → health screening questions → payment (M‑Pesa) → delivery confirmation → re‑order reminders, with all steps written to the ledger.”[6][4][5]
- “Dispute evidence must capture: advice messages, dosage recommendations, payment confirmations, and delivery events for at least 24 months, tied to a specific phone + order ID.”[7][10][6]

If you want, next step can be: a table of **concrete WhatsApp journeys** tailored to Elixosense (first‑time buyer, repeat buyer, side‑effects complaint, refund request), each with what needs to be stored in the ledger.

[1](https://elixosense.com)
[2](https://elixosense.com/about-us)
[3](https://www.facebook.com/61574058014074/about/)
[4](https://www.instagram.com/elixosense/)
[5](https://www.elixosense.com/products)
[6](https://www.elixosense.com/products/testo-booster)
[7](https://www.facebook.com/harmreductionsocietyke/videos/technology-can-fight-back-by-integrating-ict-in-substance-use-prevention-and-con/1337066594451109/)
[8](https://www.trademo.com/kenya/buyers/top-cap/2)
[9](https://www.trademo.com/kenya/buyers/tablets/35)
[10](https://en.52wmb.com/buyer/196794733)
[11](https://www.f6s.com/companies/software/kenya/co)
[12](https://smartpossoftware.com/pages/tag/kenya/)
[13](https://www.reddit.com/r/Kenya/comments/1f4u9uj/hey_heres_a_kenyanbased_productivity_software_on/)
[14](https://www.facebook.com/100064346815443/posts/at-the-heart-of-sustainable-governance-lies-accountability-transparency-and-ethi/1259770069511208/)
[15](https://scapartner.com/2025/05/22/list-of-kenya-computer-software-importers-distributors/)