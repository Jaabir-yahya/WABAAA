import { supabase } from '$lib/supabase';
import { PUBLIC_BUSINESS_ID } from '$env/static/public';
import { callEdgeFunction } from '$lib/api';

export type Debt = {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  items: string;
  date: string;
  daysOverdue: number;
  status: 'pending' | 'partial';
};

export type DebtsState = {
  debts: Debt[];
  total: number;
  loading: boolean;
  error: string | null;
  sendingReminder: string | null;
};

let debtsState = $state<DebtsState>({
  debts: [],
  total: 0,
  loading: true,
  error: null,
  sendingReminder: null,
});

export function getDebtsState() {
  return debtsState;
}

export async function loadDebts() {
  debtsState.loading = true;
  debtsState.error = null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_phone, customer_name, outstanding_amount, items, created_at, status')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .in('status', ['pending', 'partial'])
      .gt('outstanding_amount', 0)
      .order('outstanding_amount', { ascending: false });

    if (error) throw error;

    const debts = (data ?? []).map((order) => ({
      id: order.id,
      customerName: order.customer_name || formatPhone(order.customer_phone),
      customerPhone: order.customer_phone,
      amount: Number(order.outstanding_amount ?? 0),
      items: formatItems(order.items),
      date: formatDate(order.created_at),
      daysOverdue: calculateDaysOverdue(order.created_at),
      status: order.status as 'pending' | 'partial',
    }));

    const total = debts.reduce((sum, d) => sum + d.amount, 0);

    debtsState = {
      debts,
      total,
      loading: false,
      error: null,
      sendingReminder: null,
    };
  } catch (error) {
    debtsState.loading = false;
    debtsState.error = error instanceof Error ? error.message : 'Failed to load debts';
  }
}

export async function sendReminder(debt: Debt) {
  debtsState.sendingReminder = debt.id;

  try {
    // This would call a WhatsApp send function
    // For now, we'll use a simple edge function
    await callEdgeFunction('send-reminder', {
      business_id: PUBLIC_BUSINESS_ID,
      customer_phone: debt.customerPhone,
      amount: debt.amount,
      items: debt.items,
    });

    // Mark as sent (optimistic UI)
    alert(`Kumbusha imetumwa kwa ${debt.customerName}`);
  } catch (error) {
    alert(`Imeshindwa kutuma kumbusha: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    debtsState.sendingReminder = null;
  }
}

export async function sendAllReminders() {
  const debts = debtsState.debts;
  if (debts.length === 0) return;

  try {
    for (const debt of debts) {
      await sendReminder(debt);
      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    alert(`Kumbusha ${debts.length} zimetumwa`);
  } catch (error) {
    alert('Imeshindwa kutuma baadhi ya kumbusha');
  }
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12) {
    return `0${digits.slice(3, 6)}...${digits.slice(-3)}`;
  }
  return phone;
}

function formatItems(items: any): string {
  if (!items || !Array.isArray(items)) return '';
  return items
    .map((item: any) => `${item.product} ${item.quantity}${item.unit ? item.unit : ''}`)
    .join(', ');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('sw-KE', { month: 'short', day: 'numeric' });
}

function calculateDaysOverdue(dateStr: string): number {
  if (!dateStr) return 0;
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Subscribe to real-time updates
export function subscribeToDebts(callback?: () => void) {
  const channel = supabase
    .channel('debts-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `business_id=eq.${PUBLIC_BUSINESS_ID}`,
      },
      () => {
        loadDebts();
        callback?.();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
