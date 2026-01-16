<script lang="ts">
  import { onMount } from 'svelte';
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

  type DailySummary = {
    revenue: number;
    orders: number;
    outstanding: number;
    verified: boolean;
    verifiedAt: string | null;
    streak: number;
  };

  let summary = $state<DailySummary | null>(null);
  let loading = $state(true);
  let verifying = $state(false);
  let showMismatchDialog = $state(false);
  let actualAmount = $state('');

  async function loadDailySummary() {
    loading = true;

    try {
      const { startUtc, endUtc } = getNairobiDayBounds();
      const todayKey = startUtc.toISOString().slice(0, 10);

      // Get today's stats
      const [paymentsResult, ordersResult, verificationResult, streakResult] = await Promise.all([
        // Today's payments
        supabase
          .from('payments')
          .select('applied_amount')
          .eq('business_id', PUBLIC_BUSINESS_ID)
          .eq('status', 'confirmed')
          .gte('created_at', startUtc.toISOString())
          .lt('created_at', endUtc.toISOString()),

        // Today's orders
        supabase
          .from('orders')
          .select('id, outstanding_amount')
          .eq('business_id', PUBLIC_BUSINESS_ID)
          .gte('created_at', startUtc.toISOString())
          .lt('created_at', endUtc.toISOString()),

        // Today's verification
        supabase
          .from('commerce_events')
          .select('occurred_at')
          .eq('business_id', PUBLIC_BUSINESS_ID)
          .eq('event_type', 'merchant_note')
          .contains('payload', { note_type: 'daily_verification', date: todayKey })
          .maybeSingle(),

        // Verification streak (last 7 days)
        supabase
          .from('commerce_events')
          .select('payload')
          .eq('business_id', PUBLIC_BUSINESS_ID)
          .eq('event_type', 'merchant_note')
          .contains('payload', { note_type: 'daily_verification' })
          .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('occurred_at', { ascending: false }),
      ]);

      const payments = paymentsResult.data ?? [];
      const orders = ordersResult.data ?? [];

      const revenue = payments.reduce(
        (sum, p) => sum + Number(p.applied_amount ?? 0),
        0
      );
      const orderCount = orders.length;
      const outstanding = orders.reduce(
        (sum, o) => sum + Number(o.outstanding_amount ?? 0),
        0
      );

      // Calculate streak
      const verifications = streakResult.data ?? [];
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = checkDate.toISOString().slice(0, 10);
        const hasVerification = verifications.some(
          (v) => (v.payload as any)?.date === dateKey
        );
        if (hasVerification) {
          streak++;
        } else if (i > 0) {
          // Don't break on today (might not have verified yet)
          break;
        }
      }

      summary = {
        revenue,
        orders: orderCount,
        outstanding,
        verified: !!verificationResult.data,
        verifiedAt: verificationResult.data?.occurred_at ?? null,
        streak,
      };

      loading = false;
    } catch (error) {
      console.error('Failed to load daily summary:', error);
      loading = false;
    }
  }

  async function verifyDay(matched: boolean, notes?: string) {
    if (!summary) return;

    verifying = true;
    const { startUtc } = getNairobiDayBounds();
    const todayKey = startUtc.toISOString().slice(0, 10);

    try {
      await supabase.from('commerce_events').insert({
        business_id: PUBLIC_BUSINESS_ID,
        event_type: 'merchant_note',
        source_channel: 'pwa',
        payload: {
          note_type: 'daily_verification',
          date: todayKey,
          expected_revenue: summary.revenue,
          matched,
          actual_amount: matched ? summary.revenue : parseFloat(actualAmount) || 0,
          notes,
        },
        idempotency_key: `daily_verification:${PUBLIC_BUSINESS_ID}:${todayKey}`,
        processing_status: 'completed',
      });

      // Reload to update UI
      await loadDailySummary();
      showMismatchDialog = false;
      actualAmount = '';
    } catch (error) {
      console.error('Failed to verify day:', error);
      alert('Imeshindwa kuhifadhi. Jaribu tena.');
    } finally {
      verifying = false;
    }
  }

  onMount(() => {
    loadDailySummary();
  });

  function formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  }

  function formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('sw-KE', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  }
</script>

<div class="sawa-page">
  <h1 class="page-title">THIBITISHA LEO</h1>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Inapakia...</p>
    </div>
  {:else if summary}
    <!-- Streak Badge -->
    {#if summary.streak >= 3}
      <div class="streak-badge">
        🔥 Siku {summary.streak} mfululizo!
      </div>
    {/if}

    <!-- Summary Card -->
    <div class="summary-card">
      <div class="summary-header">
        <span class="summary-icon">💰</span>
        <span class="summary-label">Leo Uliingiza</span>
      </div>
      <div class="summary-amount">{formatCurrency(summary.revenue)}</div>
      <div class="summary-details">
        <div class="detail">
          <span class="detail-value">{summary.orders}</span>
          <span class="detail-label">Oda</span>
        </div>
        <div class="detail">
          <span class="detail-value">{formatCurrency(summary.outstanding)}</span>
          <span class="detail-label">Zinasubiri</span>
        </div>
      </div>
    </div>

    <!-- Verification Status -->
    {#if summary.verified}
      <div class="verified-card">
        <div class="verified-icon">✅</div>
        <div class="verified-text">
          <div class="verified-title">Umethibitisha Leo!</div>
          <div class="verified-time">Saa {formatTime(summary.verifiedAt!)}</div>
        </div>
      </div>
    {:else}
      <!-- Verification Prompt -->
      <div class="verification-prompt">
        <div class="prompt-question">
          Je, pesa uliyoingiza ni <strong>{formatCurrency(summary.revenue)}</strong>?
        </div>

        <div class="prompt-actions">
          <button 
            class="btn-yes"
            onclick={() => verifyDay(true)}
            disabled={verifying}
          >
            {#if verifying}
              ⏳ Inahifadhi...
            {:else}
              ✓ Ndiyo, ni sawa!
            {/if}
          </button>

          <button 
            class="btn-no"
            onclick={() => (showMismatchDialog = true)}
            disabled={verifying}
          >
            ✗ Hapana, kuna tofauti
          </button>
        </div>
      </div>
    {/if}

    <!-- Help Section -->
    <div class="help-section">
      <h3>💡 Vidokezo</h3>
      <ul>
        <li>Thibitisha kila siku kabla ya kulala</li>
        <li>Linganisha na M-Pesa statement yako</li>
        <li>Piga hesabu pesa taslimu yako</li>
        <li>Ukithibitisha kila siku utapata "badge" maalum!</li>
      </ul>
    </div>

    <!-- Back to Leo -->
    <a href="/leo" class="back-link">← Rudi Leo</a>
  {/if}
</div>

<!-- Mismatch Dialog -->
{#if showMismatchDialog}
  <div class="dialog-overlay" onclick={() => (showMismatchDialog = false)}>
    <div class="dialog" onclick={(e) => e.stopPropagation()}>
      <h3>Kuna Tofauti?</h3>
      <p>Mfumo unaonyesha <strong>{formatCurrency(summary?.revenue ?? 0)}</strong></p>
      
      <label class="input-label">
        Je, uliingiza kiasi gani?
        <input 
          type="number"
          bind:value={actualAmount}
          placeholder="Mfano: 45000"
          class="input-field"
        />
      </label>

      <div class="dialog-actions">
        <button 
          class="btn-cancel"
          onclick={() => {
            showMismatchDialog = false;
            actualAmount = '';
          }}
        >
          Ghairi
        </button>
        <button 
          class="btn-submit"
          onclick={() => verifyDay(false, 'Tofauti iliyoripotiwa')}
          disabled={verifying || !actualAmount}
        >
          Hifadhi
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sawa-page {
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

  /* Streak Badge */
  .streak-badge {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 1.5rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  /* Summary Card */
  .summary-card {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .summary-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .summary-icon {
    font-size: 1.5rem;
  }

  .summary-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .summary-amount {
    font-size: 3rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 1.5rem;
  }

  .summary-details {
    display: flex;
    justify-content: center;
    gap: 2rem;
  }

  .detail {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .detail-value {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .detail-label {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-top: 0.25rem;
  }

  /* Verified Card */
  .verified-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f0fdf4;
    border: 2px solid #10b981;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .verified-icon {
    font-size: 2.5rem;
  }

  .verified-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #10b981;
  }

  .verified-time {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Verification Prompt */
  .verification-prompt {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }

  .prompt-question {
    font-size: 1.125rem;
    color: #374151;
    text-align: center;
    margin-bottom: 1.5rem;
    line-height: 1.4;
  }

  .prompt-question strong {
    color: #1a1a1a;
    font-size: 1.25rem;
  }

  .prompt-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn-yes {
    width: 100%;
    padding: 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.125rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-yes:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-2px);
  }

  .btn-yes:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .btn-no {
    width: 100%;
    padding: 1rem;
    background: white;
    color: #6b7280;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-no:hover:not(:disabled) {
    border-color: #ef4444;
    color: #ef4444;
  }

  .btn-no:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Help Section */
  .help-section {
    background: #f9fafb;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .help-section h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }

  .help-section ul {
    margin: 0;
    padding-left: 1.25rem;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .back-link {
    display: block;
    text-align: center;
    color: #3b82f6;
    font-weight: 600;
    text-decoration: none;
    padding: 1rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  /* Dialog */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 100;
  }

  .dialog {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
  }

  .dialog h3 {
    font-size: 1.25rem;
    margin: 0 0 0.5rem 0;
    color: #1a1a1a;
  }

  .dialog p {
    color: #6b7280;
    margin: 0 0 1.5rem 0;
  }

  .input-label {
    display: block;
    font-size: 0.875rem;
    color: #374151;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .input-field {
    width: 100%;
    padding: 0.875rem;
    border: 2px solid #e5e5e5;
    border-radius: 8px;
    font-size: 1rem;
    margin-top: 0.5rem;
    box-sizing: border-box;
  }

  .input-field:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .dialog-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn-cancel {
    flex: 1;
    padding: 0.875rem;
    background: #f3f4f6;
    color: #6b7280;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-submit {
    flex: 1;
    padding: 0.875rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-submit:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>
