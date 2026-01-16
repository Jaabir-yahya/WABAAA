import { supabase } from '$lib/supabase';
import { PUBLIC_BUSINESS_ID } from '$env/static/public';

// Nairobi timezone offset (UTC+3)
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

function getNairobiDayBounds() {
  const now = new Date();
  const nairobiNow = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  const startNairobi = new Date(nairobiNow);
  startNairobi.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(startNairobi.getTime() - NAIROBI_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

function getYesterdayBounds() {
  const { startUtc } = getNairobiDayBounds();
  const yesterdayEnd = startUtc;
  const yesterdayStart = new Date(yesterdayEnd.getTime() - 24 * 60 * 60 * 1000);
  return { startUtc: yesterdayStart, endUtc: yesterdayEnd };
}

export type TodaySummary = {
  orders: {
    today: number;
    yesterday: number;
    vsYesterday: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    vsYesterday: number;
  };
  outstanding: {
    total: number;
    count: number;
    people: Array<{
      name: string;
      phone: string;
      amount: number;
      reason: string;
      orderId: string;
      date: string;
    }>;
  };
  messages: {
    total: number;
    replied: number;
    pending: number;
  };
  loading: boolean;
  error: string | null;
};

// Reactive state
let todaySummary = $state<TodaySummary>({
  orders: { today: 0, yesterday: 0, vsYesterday: 0 },
  revenue: { today: 0, yesterday: 0, vsYesterday: 0 },
  outstanding: { total: 0, count: 0, people: [] },
  messages: { total: 0, replied: 0, pending: 0 },
  loading: true,
  error: null,
});

export function getTodaySummary() {
  return todaySummary;
}

export async function loadTodaySummary() {
  todaySummary.loading = true;
  todaySummary.error = null;

  try {
    const { startUtc: todayStart, endUtc: todayEnd } = getNairobiDayBounds();
    const { startUtc: yesterdayStart, endUtc: yesterdayEnd } = getYesterdayBounds();

    // Parallel queries for efficiency
    const [
      todayOrdersResult,
      yesterdayOrdersResult,
      todayPaymentsResult,
      yesterdayPaymentsResult,
      outstandingResult,
      messagesResult,
    ] = await Promise.all([
      // Today's orders
      supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString()),

      // Yesterday's orders
      supabase
        .from('orders')
        .select('id')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', yesterdayEnd.toISOString()),

      // Today's confirmed payments
      supabase
        .from('payments')
        .select('applied_amount')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .eq('status', 'confirmed')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString()),

      // Yesterday's confirmed payments
      supabase
        .from('payments')
        .select('applied_amount')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .eq('status', 'confirmed')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', yesterdayEnd.toISOString()),

      // Outstanding orders (all time, status pending or partial)
      supabase
        .from('orders')
        .select('id, customer_phone, customer_name, outstanding_amount, items, created_at, status')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .in('status', ['pending', 'partial'])
        .gt('outstanding_amount', 0)
        .order('outstanding_amount', { ascending: false })
        .limit(10),

      // Today's WhatsApp messages
      supabase
        .from('commerce_events')
        .select('id, payload, processing_status')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .eq('event_type', 'whatsapp_message_in')
        .gte('occurred_at', todayStart.toISOString())
        .lt('occurred_at', todayEnd.toISOString()),
    ]);

    // Calculate today's orders
    const todayOrders = todayOrdersResult.data ?? [];
    const yesterdayOrders = yesterdayOrdersResult.data ?? [];
    const todayOrderCount = todayOrders.length;
    const yesterdayOrderCount = yesterdayOrders.length;

    // Calculate today's revenue (from payments, not orders)
    const todayPayments = todayPaymentsResult.data ?? [];
    const yesterdayPayments = yesterdayPaymentsResult.data ?? [];
    const todayRevenue = todayPayments.reduce(
      (sum, p) => sum + Number(p.applied_amount ?? 0),
      0
    );
    const yesterdayRevenue = yesterdayPayments.reduce(
      (sum, p) => sum + Number(p.applied_amount ?? 0),
      0
    );

    // Calculate outstanding
    const outstandingOrders = outstandingResult.data ?? [];
    const outstandingTotal = outstandingOrders.reduce(
      (sum, o) => sum + Number(o.outstanding_amount ?? 0),
      0
    );
    const outstandingPeople = outstandingOrders.map((order) => ({
      name: order.customer_name || formatPhone(order.customer_phone),
      phone: order.customer_phone,
      amount: Number(order.outstanding_amount ?? 0),
      reason: formatItems(order.items),
      orderId: order.id,
      date: formatDate(order.created_at),
    }));

    // Calculate messages
    const messages = messagesResult.data ?? [];
    const repliedMessages = messages.filter(
      (m) => m.processing_status === 'completed'
    ).length;

    todaySummary = {
      orders: {
        today: todayOrderCount,
        yesterday: yesterdayOrderCount,
        vsYesterday: todayOrderCount - yesterdayOrderCount,
      },
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        vsYesterday: todayRevenue - yesterdayRevenue,
      },
      outstanding: {
        total: outstandingTotal,
        count: outstandingOrders.length,
        people: outstandingPeople,
      },
      messages: {
        total: messages.length,
        replied: repliedMessages,
        pending: messages.length - repliedMessages,
      },
      loading: false,
      error: null,
    };
  } catch (error) {
    todaySummary.loading = false;
    todaySummary.error = error instanceof Error ? error.message : 'Failed to load data';
  }
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  // Format: 254712345678 -> 0712...678
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12) {
    return `0${digits.slice(3, 6)}...${digits.slice(-3)}`;
  }
  return phone;
}

function formatItems(items: any): string {
  if (!items || !Array.isArray(items)) return '';
  return items
    .slice(0, 2)
    .map((item: any) => `${item.product} ${item.quantity}${item.unit ? item.unit : ''}`)
    .join(', ');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('sw-KE', { month: 'short', day: 'numeric' });
}

// Subscribe to real-time updates
export function subscribeToUpdates(callback?: () => void) {
  const channel = supabase
    .channel('today-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `business_id=eq.${PUBLIC_BUSINESS_ID}`,
      },
      () => {
        loadTodaySummary();
        callback?.();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `business_id=eq.${PUBLIC_BUSINESS_ID}`,
      },
      () => {
        loadTodaySummary();
        callback?.();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
