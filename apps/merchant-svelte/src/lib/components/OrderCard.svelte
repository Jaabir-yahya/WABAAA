<script lang="ts">
  import { callEdgeFunction } from '$lib/api';

  interface Props {
    order: any;
    onUpdated: () => void;
  }

  let { order, onUpdated }: Props = $props();
  let sendingLink = $state(false);

  const statusLabels: Record<string, string> = {
    pending: 'Inasubiri',
    partial: 'Sehemu',
    paid: 'Imelipwa'
  };

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    partial: '#3b82f6',
    paid: '#10b981'
  };

  async function sendPaymentLink() {
    sendingLink = true;
    try {
      await callEdgeFunction('generate-payment-link', {
        order_id: order.id,
        amount: order.outstanding_amount,
        phone: order.customer_phone
      });
      alert('✅ STK Push imetumwa!');
      onUpdated();
    } catch (error) {
      alert(`❌ Imeshindwa: ${error}`);
    } finally {
      sendingLink = false;
    }
  }
</script>

<div class="card">
  <div class="header">
    <div class="customer">
      <span class="name">{order.customer_name || order.customer_phone}</span>
      <span class="phone">{order.customer_phone}</span>
    </div>
    <span class="status" style="background: {statusColors[order.status] || '#999'}">
      {statusLabels[order.status] || order.status}
    </span>
  </div>

  <div class="items">
    {#each order.items || [] as item}
      <div class="item">{item.product} × {item.quantity}</div>
    {/each}
  </div>

  <div class="footer">
    <div class="amounts">
      <div class="total">KSh {Number(order.total_amount).toLocaleString()}</div>
      {#if order.outstanding_amount > 0}
        <div class="outstanding">
          Imebaki: KSh {Number(order.outstanding_amount).toLocaleString()}
        </div>
      {/if}
    </div>

    {#if order.outstanding_amount > 0}
      <button class="send-link" onclick={sendPaymentLink} disabled={sendingLink}>
        {sendingLink ? '...' : '💰 Tuma Link'}
      </button>
    {/if}
  </div>
</div>

<style>
  .card {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .customer {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 600;
    font-size: 1rem;
  }

  .phone {
    font-size: 0.75rem;
    color: #666;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    color: white;
  }

  .items {
    font-size: 0.875rem;
    color: #444;
    margin-bottom: 0.75rem;
  }

  .item {
    padding: 0.25rem 0;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f0f0f0;
    padding-top: 0.75rem;
  }

  .total {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .outstanding {
    font-size: 0.75rem;
    color: #f59e0b;
  }

  .send-link {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .send-link:disabled {
    opacity: 0.5;
  }
</style>
