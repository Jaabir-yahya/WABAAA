<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';
  import { supabase } from '$lib/supabase';

  let messages = $state<any[]>([]);
  let loading = $state(true);

  async function loadMessages() {
    loading = true;
    const { data, error } = await supabase
      .from('commerce_events')
      .select('*')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .eq('event_type', 'whatsapp_message_in')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      messages = data;
    }
    loading = false;
  }

  function createOrderFromMessage(message: any) {
    const phone = message.customer_phone;
    const text = message.payload?.text || '';
    window.location.href = `/orders/new?phone=${encodeURIComponent(phone)}&notes=${encodeURIComponent(text)}`;
  }

  onMount(() => {
    loadMessages();

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commerce_events',
          filter: `business_id=eq.${PUBLIC_BUSINESS_ID}`
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  });
</script>

<h1>📱 Ujumbe wa WhatsApp</h1>

{#if loading}
  <p class="loading">Inapakia...</p>
{:else if messages.length === 0}
  <p class="empty">Hakuna ujumbe mpya</p>
{:else}
  <div class="messages-list">
    {#each messages as msg (msg.id)}
      <div class="message-card">
        <div class="header">
          <span class="phone">{msg.customer_phone}</span>
          <span class="time">{new Date(msg.created_at).toLocaleTimeString('sw-KE')}</span>
        </div>
        <div class="text">{msg.payload?.text || '(no text)'}</div>
        <button class="create-order" onclick={() => createOrderFromMessage(msg)}>
          📦 Tengeneza Oda
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .loading,
  .empty {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .message-card {
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
    font-weight: 600;
    color: #10b981;
  }

  .time {
    font-size: 0.75rem;
    color: #999;
  }

  .text {
    background: #f5f5f5;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .create-order {
    width: 100%;
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
</style>
