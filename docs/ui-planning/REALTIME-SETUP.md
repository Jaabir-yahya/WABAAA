# Real-time Dashboard Setup

## Subscription Pattern

Subscribe to order changes for live dashboard updates:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const orderSubscription = supabase
  .channel('dashboard-orders')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'kcos_core',
      table: 'orders',
      filter: `business_id=eq.YOUR_BUSINESS_ID`,
    },
    (payload) => {
      console.log('Order change:', payload);

      if (payload.eventType === 'INSERT') {
        handleNewOrder(payload.new);
        playNotificationSound();
      } else if (payload.eventType === 'UPDATE') {
        handleOrderUpdate(payload.new, payload.old);
      }
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });

const paymentSubscription = supabase
  .channel('dashboard-payments')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'kcos_core',
      table: 'payments',
      filter: `business_id=eq.YOUR_BUSINESS_ID`,
    },
    (payload) => {
      console.log('Payment received:', payload.new);
      handlePaymentConfirmed(payload.new.order_id, payload.new.amount);
    }
  )
  .subscribe();

function cleanup() {
  supabase.removeChannel(orderSubscription);
  supabase.removeChannel(paymentSubscription);
}
```

## Key Points

1. Schema-qualified subscriptions using `kcos_core`
2. Filter by `business_id` for multi-tenant isolation
3. Listen to both `orders` and `payments` channels
4. Handle `INSERT` vs `UPDATE` events separately
5. Always clean up subscriptions on unmount
