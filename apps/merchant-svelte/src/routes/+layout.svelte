<script lang="ts">
  import { getIsOnline, getPendingCount } from '$lib/stores/offline-queue.svelte';
  import { getSyncStatus } from '$lib/stores/sync-manager.svelte';

  let { children } = $props();

  let pendingCount = $derived(getPendingCount());
  let isOnline = $derived(getIsOnline());
  let syncStatus = $derived(getSyncStatus());
</script>

<svelte:head>
  <title>ElixoSense - Biashara Yako</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#10B981" />
</svelte:head>

{#if !isOnline}
  <div class="offline-banner">
    ⚠️ Offline - Oda zitaunganishwa baadaye
    {#if pendingCount > 0}
      ({pendingCount} zinasubiri)
    {/if}
  </div>
{/if}

{#if syncStatus === 'syncing'}
  <div class="sync-banner">🔄 Inaunganisha...</div>
{/if}

<main>
  {@render children()}
</main>

<nav class="bottom-nav">
  <a href="/leo" class="nav-item">
    <span class="icon">📊</span>
    <span class="label">Leo</span>
  </a>
  <a href="/deni" class="nav-item">
    <span class="icon">⏳</span>
    <span class="label">Deni</span>
  </a>
  <a href="/bidhaa" class="nav-item">
    <span class="icon">📦</span>
    <span class="label">Bidhaa</span>
  </a>
  <a href="/wateja" class="nav-item">
    <span class="icon">👥</span>
    <span class="label">Wateja</span>
  </a>
</nav>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5;
  }

  .offline-banner {
    background: #ef4444;
    color: white;
    padding: 0.5rem 1rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .sync-banner {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    text-align: center;
    font-size: 0.875rem;
  }

  main {
    padding: 1rem;
    padding-bottom: 5rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: white;
    border-top: 1px solid #e5e5e5;
    padding: 0.5rem 0;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    color: #666;
    padding: 0.5rem;
  }

  .nav-item:hover {
    color: #10b981;
  }

  .icon {
    font-size: 1.5rem;
  }

  .label {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>
