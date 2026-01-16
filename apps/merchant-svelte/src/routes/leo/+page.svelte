<script lang="ts">
  import { onMount } from 'svelte';
  import { getTodaySummary, loadTodaySummary, subscribeToUpdates } from '$lib/stores/today.svelte';
  import { supabase } from '$lib/supabase';
  import { PUBLIC_BUSINESS_ID, PUBLIC_SUPABASE_URL } from '$env/static/public';

  let summary = $derived(getTodaySummary());
  let pendingOrders = $state<
    Array<{ id: string; outstanding_amount: number; customer_phone: string }>
  >([]);
  let invoiceQrSvg = $state('');
  let invoiceQrOrderId = $state<string | null>(null);
  let invoiceError = $state<string | null>(null);
  const qrEndpoint = `${PUBLIC_SUPABASE_URL}/functions/v1/generate-qr`;

  onMount(() => {
    loadTodaySummary();
    const unsubscribe = subscribeToUpdates();
    loadPendingOrders();
    return () => unsubscribe();
  });

  function getTrend(diff: number): string {
    if (diff > 0) return '📈';
    if (diff < 0) return '📉';
    return '➡️';
  }

  function formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  }

  async function loadPendingOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('id,outstanding_amount,customer_phone')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .gt('outstanding_amount', 0)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!error) {
      pendingOrders = data ?? [];
    }
  }

  async function generateInvoiceQR(orderId: string) {
    invoiceError = null;
    invoiceQrSvg = '';
    invoiceQrOrderId = orderId;

    const response = await fetch(qrEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: PUBLIC_BUSINESS_ID,
        type: 'invoice',
        data: { orderId },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      invoiceError = data?.error ?? 'Failed to generate QR';
      return;
    }

    invoiceQrSvg = data.qr_svg;
  }
</script>

<div class="leo-page">
  <h1 class="page-title">LEO</h1>

  {#if summary.loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Inapakia...</p>
    </div>
  {:else if summary.error}
    <div class="error-card">
      <p>⚠️ {summary.error}</p>
      <button onclick={() => loadTodaySummary()}>Jaribu tena</button>
    </div>
  {:else}
    <!-- Orders Card -->
    <div class="card orders-card">
      <div class="card-content">
        <div class="card-info">
          <div class="card-label">ODA MPYA</div>
          <div class="card-value">{summary.orders.today}</div>
          <div class="card-trend" class:positive={summary.orders.vsYesterday > 0} class:negative={summary.orders.vsYesterday < 0}>
            {getTrend(summary.orders.vsYesterday)}
            {#if summary.orders.vsYesterday !== 0}
              {summary.orders.vsYesterday > 0 ? '+' : ''}{summary.orders.vsYesterday} vs jana
            {:else}
              Sawa na jana
            {/if}
          </div>
        </div>
        <div class="card-icon">📦</div>
      </div>
    </div>

    <!-- Revenue Card -->
    <div class="card revenue-card">
      <div class="card-content">
        <div class="card-info">
          <div class="card-label">MAPATO</div>
          <div class="card-value">{formatCurrency(summary.revenue.today)}</div>
          <div class="card-trend" class:positive={summary.revenue.vsYesterday > 0} class:negative={summary.revenue.vsYesterday < 0}>
            {getTrend(summary.revenue.vsYesterday)}
            {#if summary.revenue.vsYesterday !== 0}
              {summary.revenue.vsYesterday > 0 ? '+' : ''}{formatCurrency(Math.abs(summary.revenue.vsYesterday))} vs jana
            {:else}
              Sawa na jana
            {/if}
          </div>
        </div>
        <div class="card-icon">💰</div>
      </div>
    </div>

    <!-- Outstanding Card -->
    <div class="card outstanding-card">
      <div class="card-content">
        <div class="card-info">
          <div class="card-label">ZINASUBIRI</div>
          <div class="card-value warning">{formatCurrency(summary.outstanding.total)}</div>
          <div class="card-sub">{summary.outstanding.count} watu</div>
        </div>
        <div class="card-icon">⏳</div>
      </div>

      {#if summary.outstanding.people.length > 0}
        <div class="people-list">
          {#each summary.outstanding.people.slice(0, 3) as person}
            <div class="person-row">
              <div class="person-info">
                <div class="person-name">{person.name}</div>
                <div class="person-reason">{person.reason}</div>
              </div>
              <div class="person-amount">{formatCurrency(person.amount)}</div>
            </div>
          {/each}
          {#if summary.outstanding.people.length > 3}
            <a href="/deni" class="view-all">Ona wote ({summary.outstanding.count}) →</a>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Messages Card -->
    <div class="card messages-card">
      <div class="card-content">
        <div class="card-info">
          <div class="card-label">UJUMBE LEO</div>
          <div class="card-value">{summary.messages.total}</div>
          <div class="card-sub">
            {summary.messages.replied} zimejibiwa, {summary.messages.pending} zinasubiri
          </div>
        </div>
        <div class="card-icon">📱</div>
      </div>
    </div>

    <!-- Daily Verification Button -->
    <div class="sawa-section">
      <a href="/sawa" class="sawa-button">
        ✓ Thibitisha Leo
      </a>
    </div>

    {#if pendingOrders.length > 0}
      <div class="card qr-card">
        <div class="card-title">QR ya Malipo</div>
        <div class="qr-orders">
          {#each pendingOrders as order}
            <div class="qr-order">
              <div>
                <div class="order-id">Oda {order.id}</div>
                <div class="order-amount">
                  {formatCurrency(order.outstanding_amount)}
                </div>
              </div>
              <button class="qr-button" onclick={() => generateInvoiceQR(order.id)}>
                Tengeneza QR
              </button>
            </div>
          {/each}
        </div>
        {#if invoiceError}
          <p class="qr-error">⚠️ {invoiceError}</p>
        {/if}
        {#if invoiceQrSvg}
          <div class="qr-preview">
            {@html invoiceQrSvg}
            {#if invoiceQrOrderId}
              <div class="qr-caption">QR ya oda {invoiceQrOrderId}</div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .leo-page {
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
    border-top-color: #10b981;
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

  .card {
    background: white;
    border-radius: 16px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
  }

  .card-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .card-info {
    flex: 1;
  }

  .card-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .card-value {
    font-size: 2rem;
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .card-value.warning {
    color: #f59e0b;
  }

  .card-trend {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .card-trend.positive {
    color: #10b981;
  }

  .card-trend.negative {
    color: #ef4444;
  }

  .card-sub {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .card-icon {
    font-size: 2.5rem;
    opacity: 0.9;
  }

  /* Card accents */
  .orders-card {
    border-left: 4px solid #3b82f6;
  }

  .revenue-card {
    border-left: 4px solid #10b981;
  }

  .outstanding-card {
    border-left: 4px solid #f59e0b;
  }

  .messages-card {
    border-left: 4px solid #8b5cf6;
  }

  /* People list in outstanding card */
  .people-list {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f0f0f0;
  }

  .person-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f5f5f5;
  }

  .person-row:last-of-type {
    border-bottom: none;
  }

  .person-info {
    flex: 1;
    min-width: 0;
  }

  .person-name {
    font-weight: 600;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .person-reason {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .person-amount {
    font-weight: 700;
    color: #f59e0b;
    margin-left: 1rem;
    white-space: nowrap;
  }

  .view-all {
    display: block;
    text-align: center;
    color: #3b82f6;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.75rem;
    text-decoration: none;
    margin-top: 0.5rem;
  }

  .view-all:hover {
    text-decoration: underline;
  }

  /* Sawa button */
  .sawa-section {
    margin-top: 1.5rem;
    text-align: center;
  }

  .sawa-button {
    display: inline-block;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    font-size: 1.125rem;
    font-weight: 700;
    border-radius: 12px;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .sawa-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
  }

  .sawa-button:active {
    transform: translateY(0);
  }

  .qr-card {
    margin-top: 1.5rem;
  }

  .card-title {
    font-weight: 700;
    margin-bottom: 0.75rem;
  }

  .qr-orders {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .qr-order {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
    padding: 0.75rem;
    border-radius: 10px;
  }

  .order-id {
    font-weight: 600;
  }

  .order-amount {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .qr-button {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .qr-error {
    color: #dc2626;
    margin-top: 0.75rem;
  }

  .qr-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem 0;
  }

  .qr-caption {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }
</style>
