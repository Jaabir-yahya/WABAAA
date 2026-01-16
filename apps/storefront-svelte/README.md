# Storefront Svelte App

Customer-facing digital storefront for Kenya Commerce OS. It loads product data
from `businesses.config`, supports cart + WhatsApp checkout, and uses the
existing QR generation endpoint to keep orders tied to the correct merchant.

## Setup

Create `apps/storefront-svelte/.env`:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Install and run:

```bash
npm install
npm run dev
```

Open:

```
http://localhost:5173/store/<business-id>
```

## Product Data Options

The storefront reads products from `businesses.config`:

### Option A: `product_catalog` array
```json
{
  "product_catalog": [
    {
      "id": "sukari",
      "name": "Sukari",
      "price": 150,
      "unit": "kg",
      "description": "Sukari ya Tesco",
      "image": "https://cdn.example.com/sukari.jpg"
    }
  ]
}
```

### Option B: `product_prices` map (plus optional labels)
```json
{
  "product_prices": { "sukari": 150 },
  "product_labels": { "sukari": "Sukari" },
  "product_units": { "sukari": "kg" },
  "product_images": { "sukari": "https://cdn.example.com/sukari.jpg" },
  "product_descriptions": { "sukari": "Sukari ya Tesco" }
}
```

## QR Flow

The "QR" action calls:

```
POST {PUBLIC_SUPABASE_URL}/functions/v1/generate-qr
```

with `type: "product"` so the generated QR is business-scoped and safe for
cross-seller attribution.
