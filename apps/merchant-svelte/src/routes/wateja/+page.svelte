<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';

  type CustomerStats = {
    phone: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    isRepeat: boolean;
  };

  let customerStats = $state<CustomerStats[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadCustomerStats() {
    loading = true;
    error = null;

    try {
      // Get all orders grouped by customer
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('customer_phone, customer_name, total_amount, created_at')
        .eq('business_id', PUBLIC_BUSINESS_ID)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Aggregate customer stats
      const statsMap = new Map<string, CustomerStats>();

      for (const order of orders ?? []) {
        const phone = order.customer_phone;
        const existing = statsMap.get(phone);

        if (existing) {
          existing.totalOrders += 1;
          existing.totalSpent += Number(order.total_amount ?? 0);
          // Keep the most recent name if available
          if (order.customer_name) {
            existing.name = order.customer_name;
          }
        } else {
          statsMap.set(phone, {
            phone,
            name: order.customer_name || formatPhone(phone),
            totalOrders: 1,
            totalSpent: Number(order.total_amount ?? 0),
            lastOrderDate: formatDate(order.created_at),
            isRepeat: false,
          });
        }
      }

      // Mark repeat customers
      statsMap.forEach((stats) => {
        stats.isRepeat = stats.totalOrders >= 3;
      });

      // Sort by total spent (best customers first)
      customerStats = Array.from(statsMap.values()).sort(
        (a, b) => b.totalSpent - a.totalSpent
      );

      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load customers';
      loading = false;
    }
  }

  onMount(() => {
    loadCustomerStats();
  });

  function formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  }

  function formatPhone(phone: string): string {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 12) {
      return `0${digits.slice(3)}`;
    }
    return phone;
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sw-KE', { month: 'short', day: 'numeric' });
  }

  function getCustomerBadge(customer: CustomerStats): { emoji: string; label: string } | null {
    if (customer.totalSpent >= 50000) return { emoji: '👑', label: 'VIP' };
    if (customer.totalSpent >= 20000) return { emoji: '💎', label: 'Hodari' };
    if (customer.isRepeat) return { emoji: '🌟', label: 'Mwaminifu' };
    return null;
  }

  // Stats derived from customer data
  let summaryStats = $derived({
    totalCustomers: customerStats.length,
    repeatCustomers: customerStats.filter((c) => c.isRepeat).length,
    totalRevenue: customerStats.reduce((sum, c) => sum + c.totalSpent, 0),
    averageSpend: customerStats.length > 0
      ? customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / customerStats.length
      : 0,
  });
</script>

<div class="wateja-page">
  <h1 class="page-title">WATEJA</h1>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Inapakia...</p>
    </div>
  {:else if error}
    <div class="error-card">
      <p>⚠️ {error}</p>
      <button onclick={() => loadCustomerStats()}>Jaribu tena</button>
    </div>
  {:else if customerStats.length === 0}
    <div class="empty-state">
      <div class="empty-icon">👥</div>
      <h2>Hakuna Wateja</h2>
      <p>Wateja wataonekana hapa ukipokea oda</p>
    </div>
  {:else}
    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{summaryStats.totalCustomers}</div>
        <div class="stat-label">Wateja</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{summaryStats.repeatCustomers}</div>
        <div class="stat-label">Wanaorudia</div>
      </div>
    </div>

    <!-- Top Customers Section -->
    <div class="section">
      <h2 class="section-title">🏆 WATEJA WA KWELI</h2>
      
      <div class="customers-list">
        {#each customerStats.slice(0, 10) as customer, index}
          {@const badge = getCustomerBadge(customer)}
          <div class="customer-card" class:vip={customer.totalSpent >= 20000}>
            <div class="customer-rank">#{index + 1}</div>
            <div class="customer-avatar">
              {badge?.emoji ?? '👤'}
            </div>
            <div class="customer-info">
              <div class="customer-name">
                {customer.name}
                {#if badge}
                  <span class="customer-badge">{badge.label}</span>
                {/if}
              </div>
              <div class="customer-stats">
                <span class="stat-orders">{customer.totalOrders} oda</span>
                <span class="stat-date">Mwisho: {customer.lastOrderDate}</span>
              </div>
            </div>
            <div class="customer-total">{formatCurrency(customer.totalSpent)}</div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Customer Insights -->
    <div class="section insights">
      <h2 class="section-title">💡 MAARIFA</h2>
      
      <div class="insight-list">
        <div class="insight-card">
          <div class="insight-icon">📈</div>
          <div class="insight-text">
            <strong>{Math.round((summaryStats.repeatCustomers / summaryStats.totalCustomers) * 100)}%</strong> 
            ya wateja wako wanarudi tena
          </div>
        </div>
        
        <div class="insight-card">
          <div class="insight-icon">💰</div>
          <div class="insight-text">
            Kwa wastani mteja anatumia 
            <strong>{formatCurrency(Math.round(summaryStats.averageSpend))}</strong>
          </div>
        </div>

        {#if customerStats[0]}
          <div class="insight-card">
            <div class="insight-icon">👑</div>
            <div class="insight-text">
              Mteja bora zaidi ni <strong>{customerStats[0].name}</strong> 
              ({formatCurrency(customerStats[0].totalSpent)})
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .wateja-page {
    padding-bottom: 2rem;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #1a1a1a;
    margin: 0 0 1.5rem 0;
    letter-spacing: -0.025em;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem;
    color: #666;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e5e5;
    border-top-color: #ec4899;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-card {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    color: #dc2626;
  }

  .error-card button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    font-size: 1.5rem;
    color: #6b7280;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #9ca3af;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    color: white;
    padding: 1rem;
    border-radius: 12px;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 800;
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.9;
    margin-top: 0.25rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 1rem 0;
  }

  .customers-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .customer-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
  }

  .customer-card.vip {
    border-left: 4px solid #ec4899;
    background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  }

  .customer-rank {
    font-size: 0.75rem;
    font-weight: 800;
    color: #9ca3af;
    width: 24px;
    text-align: center;
  }

  .customer-card.vip .customer-rank {
    color: #ec4899;
  }

  .customer-avatar {
    font-size: 1.75rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 50%;
  }

  .customer-info {
    flex: 1;
    min-width: 0;
  }

  .customer-name {
    font-weight: 700;
    color: #1a1a1a;
    font-size: 0.9375rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .customer-badge {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.125rem 0.5rem;
    background: #fdf2f8;
    color: #ec4899;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .customer-card.vip .customer-badge {
    background: #ec4899;
    color: white;
  }

  .customer-stats {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }

  .stat-orders,
  .stat-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .customer-total {
    font-weight: 700;
    color: #10b981;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  /* Insights */
  .insights {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #bbf7d0;
  }

  .insights .section-title {
    color: #16a34a;
    margin-bottom: 1rem;
  }

  .insight-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .insight-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 0.875rem;
    border-radius: 8px;
  }

  .insight-icon {
    font-size: 1.25rem;
  }

  .insight-text {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.4;
  }

  .insight-text strong {
    color: #1a1a1a;
  }
</style>
