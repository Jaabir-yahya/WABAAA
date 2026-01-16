<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';
  import { supabase } from '$lib/supabase';
  import OrderCard from '$lib/components/OrderCard.svelte';

  let orders = $state<any[]>([]);
  let loading = $state(true);
  let filter = $state<'all' | 'pending' | 'paid'>('all');

  let filteredOrders = $derived(
    filter === 'all'
      ? orders
      : orders.filter((order) =>
          filter === 'pending'
            ? order.status === 'pending' || order.status === 'partial'
            : order.status === 'paid'
        )
  );

  let stats = $derived({
    total: orders.length,
    pending: orders.filter((order) => order.status === 'pending' || order.status === 'partial')
      .length,
    paid: orders.filter((order) => order.status === 'paid').length,
    outstanding: orders.reduce(
      (sum, order) => sum + Number(order.outstanding_amount || 0),
      0
    )
  });

  async function loadOrders() {
    loading = true;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      orders = data;
    }
    loading = false;
  }

  onMount(() => {
    loadOrders();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${PUBLIC_BUSINESS_ID}` },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  });
</script>

<div class="header">
  <h1>📦 Oda Zako</h1>
  <div class="stats">
    <div class="stat">
      <span class="value">KSh {stats.outstanding.toLocaleString()}</span>
      <span class="label">Zinasubiri</span>
    </div>
  </div>
</div>

<div class="filters">
  <button class:active={filter === 'all'} onclick={() => (filter = 'all')}>
    Zote ({stats.total})
  </button>
  <button class:active={filter === 'pending'} onclick={() => (filter = 'pending')}>
    Zinasubiri ({stats.pending})
  </button>
  <button class:active={filter === 'paid'} onclick={() => (filter = 'paid')}>
    Zilipwa ({stats.paid})
  </button>
</div>

{#if loading}
  <p class="loading">Inapakia...</p>
{:else if filteredOrders.length === 0}
  <p class="empty">Hakuna oda</p>
{:else}
  <div class="orders-list">
    {#each filteredOrders as order (order.id)}
      <OrderCard {order} onUpdated={loadOrders} />
    {/each}
  </div>
{/if}

<style>
  .header {
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
  }

  .stats {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 1rem;
    border-radius: 12px;
  }

  .stat .value {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .stat .label {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    overflow-x: auto;
  }

  .filters button {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e5e5;
    border-radius: 20px;
    background: white;
    font-size: 0.875rem;
    white-space: nowrap;
    cursor: pointer;
  }

  .filters button.active {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .loading,
  .empty {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
