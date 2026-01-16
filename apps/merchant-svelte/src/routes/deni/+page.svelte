<script lang="ts">
  import { onMount } from 'svelte';
  import { getDebtsState, loadDebts, sendReminder, sendAllReminders, subscribeToDebts, type Debt } from '$lib/stores/debts.svelte';

  let state = $derived(getDebtsState());

  onMount(() => {
    loadDebts();
    const unsubscribe = subscribeToDebts();
    return () => unsubscribe();
  });

  function formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  }

  function getStatusColor(debt: Debt): string {
    if (debt.daysOverdue > 7) return 'red';
    if (debt.daysOverdue > 3) return 'yellow';
    return 'gray';
  }

  function getStatusLabel(debt: Debt): string {
    if (debt.daysOverdue > 7) return '🔴';
    if (debt.daysOverdue > 3) return '🟡';
    return '🟢';
  }
</script>

<div class="deni-page">
  <h1 class="page-title">WANAKUFA</h1>

  {#if state.loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Inapakia...</p>
    </div>
  {:else if state.error}
    <div class="error-card">
      <p>⚠️ {state.error}</p>
      <button onclick={() => loadDebts()}>Jaribu tena</button>
    </div>
  {:else if state.debts.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🎉</div>
      <h2>Hakuna Deni!</h2>
      <p>Wateja wako wote wamelipa</p>
    </div>
  {:else}
    <!-- Total Outstanding -->
    <div class="total-card">
      <div class="total-label">Jumla Wanakufa</div>
      <div class="total-value">{formatCurrency(state.total)}</div>
      <div class="total-count">{state.debts.length} watu</div>
    </div>

    <!-- Send All Reminders -->
    <button class="send-all-btn" onclick={() => sendAllReminders()}>
      📤 Tuma Kumbusha Zote
    </button>

    <!-- Debts List -->
    <div class="debts-list">
      {#each state.debts as debt (debt.id)}
        <div class="debt-card" class:overdue={debt.daysOverdue > 7}>
          <div class="debt-header">
            <div class="debt-status">{getStatusLabel(debt)}</div>
            <div class="debt-customer">
              <div class="customer-name">{debt.customerName}</div>
              <div class="customer-phone">{debt.customerPhone}</div>
            </div>
            <div class="debt-amount">{formatCurrency(debt.amount)}</div>
          </div>

          <div class="debt-details">
            <div class="debt-items">📦 {debt.items || 'Bidhaa mbalimbali'}</div>
            <div class="debt-date">
              📅 {debt.date}
              {#if debt.daysOverdue > 0}
                <span class="days-overdue">({debt.daysOverdue} siku zilizopita)</span>
              {/if}
            </div>
          </div>

          <div class="debt-actions">
            <button 
              class="remind-btn"
              onclick={() => sendReminder(debt)}
              disabled={state.sendingReminder === debt.id}
            >
              {#if state.sendingReminder === debt.id}
                ⏳ Inatuma...
              {:else}
                📤 Tuma Kumbusha
              {/if}
            </button>
            <a href="tel:{debt.customerPhone}" class="call-btn">
              📞 Piga Simu
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .deni-page {
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
    border-top-color: #f59e0b;
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
    color: #10b981;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #6b7280;
  }

  .total-card {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 16px;
    text-align: center;
    margin-bottom: 1rem;
  }

  .total-label {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
  }

  .total-value {
    font-size: 2.5rem;
    font-weight: 800;
  }

  .total-count {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-top: 0.5rem;
  }

  .send-all-btn {
    width: 100%;
    padding: 1rem;
    background: white;
    border: 2px solid #f59e0b;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    color: #f59e0b;
    cursor: pointer;
    margin-bottom: 1.5rem;
    transition: all 0.2s;
  }

  .send-all-btn:hover {
    background: #fef3c7;
  }

  .debts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .debt-card {
    background: white;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
  }

  .debt-card.overdue {
    border-left: 4px solid #ef4444;
  }

  .debt-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .debt-status {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .debt-customer {
    flex: 1;
    min-width: 0;
  }

  .customer-name {
    font-weight: 700;
    color: #1a1a1a;
    font-size: 1rem;
  }

  .customer-phone {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .debt-amount {
    font-size: 1.25rem;
    font-weight: 800;
    color: #ef4444;
    white-space: nowrap;
  }

  .debt-details {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 8px;
  }

  .debt-items {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .debt-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .days-overdue {
    color: #ef4444;
    font-weight: 600;
  }

  .debt-actions {
    display: flex;
    gap: 0.75rem;
  }

  .remind-btn {
    flex: 1;
    padding: 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .remind-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .remind-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .call-btn {
    padding: 0.75rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    text-decoration: none;
    transition: background 0.2s;
  }

  .call-btn:hover {
    background: #059669;
  }
</style>
