# 🇰🇪 Kenya Commerce - Merchant Svelte PWA

Lightweight, offline-first merchant dashboard built with Svelte 5. Optimized for Nairobi's reality: 3G networks, budget Android phones, and spotty connectivity.

## ✨ Features

- **📦 Orders Dashboard** - View all orders with filters (pending, paid, all)
- **📱 WhatsApp Messages** - See incoming customer messages in real-time
- **💰 Payments Tracker** - Track M-Pesa payments with daily totals
- **🔄 Offline-First** - Queue actions when offline, sync when online
- **⚡ Real-time Updates** - Supabase realtime subscriptions for live data
- **🇰🇪 Swahili UI** - All labels in Swahili (no English fallback)

## 🎯 Bundle Size Targets

- **Initial load:** <50KB gzipped
- **Total cached:** <100KB
- **Per-route chunks:** 10-15KB each

**Current build output:**
- Largest chunk: 45.97 KB gzipped (Supabase client)
- Service worker: 0.67 KB gzipped
- Total: ~70KB gzipped ✅

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (Vite 7 requirement)
- npm 10+

### Install

```bash
npm install
```

### Environment Variables

Create `.env` file:

```bash
PUBLIC_SUPABASE_URL=https://wwjsvzhosbrsotmknrtp.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PUBLIC_BUSINESS_ID=elixosense
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
```

Outputs to `build/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── routes/                    # SvelteKit routes
│   ├── +layout.svelte        # App shell with bottom nav
│   ├── +layout.ts            # Client-only config
│   ├── +page.svelte          # Orders page (home)
│   ├── messages/
│   │   └── +page.svelte      # WhatsApp messages
│   └── payments/
│       └── +page.svelte      # Payments tracker
│
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── api.ts                # Edge Function API client
│   ├── stores/
│   │   ├── offline-queue.svelte.ts    # IndexedDB queue
│   │   └── sync-manager.svelte.ts     # Background sync
│   └── components/
│       └── OrderCard.svelte  # Order display component
│
├── service-worker.ts         # Offline caching
└── app.html                  # PWA manifest + meta tags
```

## 🔧 Key Technologies

- **Svelte 5** - Runes for reactive state
- **SvelteKit 2** - Static adapter for PWA
- **Supabase JS Client** - Database + Realtime
- **IndexedDB (idb)** - Offline queue storage
- **Service Worker** - Cache-first static, network-first API

## 🌐 Offline Behavior

### Queue Actions

When offline, the following actions are queued:

- Create order
- Record payment
- Correct order

### Sync Strategy

1. Actions queued in IndexedDB
2. Exponential backoff on retry (1s, 2s, 4s, 8s, 16s)
3. Max 5 retries before marking as failed
4. Auto-sync when connection restored

### Service Worker Caching

- **Static assets:** Cache-first (HTML, CSS, JS)
- **API calls:** Network-first with cache fallback
- **Cache invalidation:** On new version deployment

## 📊 Real-time Updates

Supabase realtime subscriptions on:

- `orders` table → Refreshes orders page
- `commerce_events` (WhatsApp messages) → Refreshes messages page
- `payments` table → Refreshes payments page

## 🎨 UI Components

### Layout (`+layout.svelte`)

- Bottom navigation (Ujumbe, Oda, Malipo)
- Offline banner with pending count
- Sync status indicator

### Orders Page (`+page.svelte`)

- Outstanding amount tracker
- Filter buttons (Zote, Zinasubiri, Zilipwa)
- Order cards with "Tuma Link" button

### Messages Page (`messages/+page.svelte`)

- WhatsApp message feed
- "Tengeneza Oda" button per message
- Real-time message ingestion

### Payments Page (`payments/+page.svelte`)

- Daily total card
- Payment list with receipts
- M-Pesa receipt display

## 🧪 Testing

### Manual Testing Checklist

- [ ] Load app online → verify data loads
- [ ] Go offline → verify offline banner appears
- [ ] Create order offline → verify queued
- [ ] Go online → verify auto-sync
- [ ] Receive WhatsApp message → verify real-time update
- [ ] Click "Tuma Link" → verify STK Push sent
- [ ] Receive M-Pesa callback → verify order updated

### Dev Test Data

Use `dev-test` business ID to access sample data:

- 3 test orders (pending, partial, paid)
- 3 test WhatsApp messages
- Test customers: Juma, Amina, Mwangi

Access via Edge Function:
```bash
curl https://wwjsvzhosbrsotmknrtp.functions.supabase.co/dev-data
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Set environment variables in Vercel dashboard:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_BUSINESS_ID`

### Static Hosting

Build outputs to `build/` directory. Deploy to any static host:

- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- GitHub Pages

## 🐛 Known Issues

- **Node version warning:** Vite 7 requires Node 20.19+ or 22.12+. Current: 20.12.0
- **Preview server:** May fail with EPERM on `.env` file in sandboxed environments

## 📝 TODO

- [ ] Add `/orders/new` route for manual order creation
- [ ] Implement WhatsApp auto-responder
- [ ] Add push notifications for new orders
- [ ] Add data export functionality
- [ ] Add daily summary view

## 🙏 Acknowledgments

Built for Kenyan merchants who run their businesses on WhatsApp + M-Pesa.

**Optimized for:**
- Tecno/Infinix phones (2GB RAM)
- Slow 3G networks
- Costly data bundles
- Spotty connectivity

---

**Last Updated:** January 16, 2026  
**Version:** 0.1.0 (MVP Foundation)
