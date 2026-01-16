<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';
  import { supabase } from '$lib/supabase';

  let payments = $state<any[]>([]);
  let loading = $state(true);

  let totalReceived = $derived(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  async function loadPayments() {
    loading = true;
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      payments = data;
    }
    loading = false;
  }

  onMount(() => {
    loadPayments();

    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `business_id=eq.${PUBLIC_BUSINESS_ID}` },
        () => loadPayments()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  });
</script>

<h1>💰 Malipo</h1>

<div class="total-card">
  <span class="label">Jumla ilipwa leo</span>
  <span class="value">KSh {totalReceived.toLocaleString()}</span>
</div>

{#if loading}
  <p class="loading">Inapakia...</p>
{:else if payments.length === 0}
  <p class="empty">Hakuna malipo</p>
{:else}
  <div class="payments-list">
    {#each payments as payment (payment.id)}
      <div class="payment-card">
        <div class="header">
          <span class="phone">{payment.customer_phone}</span>
          <span class="method">{payment.method.toUpperCase()}</span>
        </div>
        <div class="amount">KSh {Number(payment.amount).toLocaleString()}</div>
        {#if payment.mpesa_receipt}
          <div class="receipt">Receipt: {payment.mpesa_receipt}</div>
        {/if}
        <div class="time">{new Date(payment.created_at).toLocaleString('sw-KE')}</div>
      </div>
    {/each}
  </div>
{/if}

<style>
  h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .total-card {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .total-card .label {
    display: block;
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
  }

  .total-card .value {
    font-size: 2rem;
    font-weight: bold;
  }

  .loading,
  .empty {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .payments-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .payment-card {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .phone {
    font-weight: 500;
  }

  .method {
    background: #e5e5e5;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .amount {
    font-size: 1.25rem;
    font-weight: bold;
    color: #10b981;
  }

  .receipt,
  .time {
    font-size: 0.75rem;
    color: #999;
    margin-top: 0.25rem;
  }
</style>
