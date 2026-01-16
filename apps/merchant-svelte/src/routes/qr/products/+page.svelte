<script lang="ts">
  import { PUBLIC_BUSINESS_ID, PUBLIC_SUPABASE_URL } from '$env/static/public';

  let productId = $state('');
  let quantity = $state(1);
  let unit = $state('pcs');
  let amount = $state('');
  let qrSvg = $state('');
  let metadata = $state<Record<string, unknown> | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const functionBase = `${PUBLIC_SUPABASE_URL}/functions/v1/generate-qr`;

  async function generateQR() {
    error = null;
    qrSvg = '';
    metadata = null;

    if (!productId || Number(amount) <= 0) {
      error = 'Weka product ID na bei sahihi';
      return;
    }

    loading = true;
    try {
      const response = await fetch(functionBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: PUBLIC_BUSINESS_ID,
          type: 'product',
          data: {
            productId,
            quantity,
            unit,
            amount: Number(amount),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        error = data?.error ?? 'Failed to generate QR';
        return;
      }

      qrSvg = data.qr_svg;
      metadata = data.metadata ?? null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate QR';
    } finally {
      loading = false;
    }
  }
</script>

<div class="page">
  <h1 class="title">QR - Bidhaa</h1>

  <div class="card">
    <div class="row">
      <label>Product ID</label>
      <input bind:value={productId} placeholder="sukari" />
    </div>
    <div class="row two">
      <div>
        <label>Kiasi</label>
        <input type="number" min="1" bind:value={quantity} />
      </div>
      <div>
        <label>Unit</label>
        <input bind:value={unit} placeholder="kg" />
      </div>
    </div>
    <div class="row">
      <label>Bei ya bidhaa (KSh)</label>
      <input type="number" min="1" bind:value={amount} />
    </div>
    <button class="primary" disabled={loading} onclick={generateQR}>
      {loading ? 'Inatengeneza...' : 'Tengeneza QR'}
    </button>
    {#if error}
      <p class="error">⚠️ {error}</p>
    {/if}
  </div>

  {#if qrSvg}
    <div class="card">
      <h2>QR Preview</h2>
      <div class="qr-preview">
        {@html qrSvg}
      </div>
      {#if metadata}
        <pre class="meta">{JSON.stringify(metadata, null, 2)}</pre>
      {/if}
      <button class="secondary" onclick={() => window.print()}>Print</button>
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
  .card {
    background: #fff;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #f0f0f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin-bottom: 1rem;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }
  .row.two {
    flex-direction: row;
    gap: 1rem;
  }
  input {
    padding: 0.6rem;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
  }
  .primary {
    width: 100%;
    background: #10b981;
    color: #fff;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    font-weight: 700;
  }
  .secondary {
    width: 100%;
    margin-top: 0.75rem;
    background: #f9fafb;
    padding: 0.75rem;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
  }
  .error {
    color: #dc2626;
    margin-top: 0.75rem;
  }
  .qr-preview {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }
  .meta {
    font-size: 0.75rem;
    background: #f9fafb;
    padding: 0.75rem;
    border-radius: 8px;
    overflow: auto;
  }
</style>
