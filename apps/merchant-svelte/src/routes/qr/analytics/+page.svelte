<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';

  let loading = $state(true);
  let error = $state<string | null>(null);
  let stats = $state({
    total_scans: 0,
    conversions: 0,
    conversion_rate: 0,
    revenue_from_qr: 0,
    top_products: [] as { product: string; scans: number }[],
  });

  async function loadAnalytics() {
    loading = true;
    error = null;

    const { data, error: fetchError } = await supabase
      .from('commerce_events')
      .select('payload')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .eq('event_type', 'merchant_note')
      .in('payload->>note_type', ['qr_scan', 'qr_conversion']);

    if (fetchError) {
      error = fetchError.message;
      loading = false;
      return;
    }

    const scans: Record<string, number> = {};
    let totalScans = 0;
    let conversions = 0;
    let revenue = 0;

    for (const event of data ?? []) {
      const payload = event.payload as Record<string, unknown>;
      const noteType = payload?.note_type as string;
      if (noteType === 'qr_scan') {
        totalScans += 1;
        const metadata = payload?.metadata as Record<string, unknown> | null;
        const product = (metadata?.product_id as string) ?? 'unknown';
        scans[product] = (scans[product] ?? 0) + 1;
      }
      if (noteType === 'qr_conversion') {
        conversions += 1;
        revenue += Number(payload?.amount ?? 0);
      }
    }

    const top_products = Object.entries(scans)
      .map(([product, count]) => ({ product, scans: count }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 5);

    stats = {
      total_scans: totalScans,
      conversions,
      conversion_rate: totalScans === 0
        ? 0
        : Math.round((conversions / totalScans) * 100),
      revenue_from_qr: revenue,
      top_products,
    };

    loading = false;
  }

  onMount(() => {
    loadAnalytics();
  });
</script>

<div class="page">
  <h1 class="title">QR Analytics</h1>

  {#if loading}
    <p>Inapakia...</p>
  {:else if error}
    <p class="error">⚠️ {error}</p>
  {:else}
    <div class="stats">
      <div class="card">
        <div class="label">Total Scans</div>
        <div class="value">{stats.total_scans}</div>
      </div>
      <div class="card">
        <div class="label">Conversions</div>
        <div class="value">{stats.conversions}</div>
      </div>
      <div class="card">
        <div class="label">Conversion Rate</div>
        <div class="value">{stats.conversion_rate}%</div>
      </div>
      <div class="card">
        <div class="label">QR Revenue</div>
        <div class="value">KSh {stats.revenue_from_qr.toLocaleString('en-KE')}</div>
      </div>
    </div>

    <div class="card">
      <h2>Top Products</h2>
      {#if stats.top_products.length === 0}
        <p>Hakuna scans bado.</p>
      {:else}
        <ul>
          {#each stats.top_products as item}
            <li>{item.product}: {item.scans} scans</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    padding-bottom: 2rem;
  }
  .title {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
  }
  .stats {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    margin-bottom: 1rem;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #f0f0f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .label {
    color: #6b7280;
    font-size: 0.75rem;
    text-transform: uppercase;
  }
  .value {
    font-size: 1.25rem;
    font-weight: 700;
  }
  .error {
    color: #dc2626;
  }
</style>
