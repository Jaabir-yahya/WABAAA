<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Redirect to Leo (Today) screen as the main dashboard
  onMount(() => {
    goto('/leo');
  });
</script>

<div class="loading-screen">
  <div class="spinner"></div>
  <p>Inapakia...</p>
</div>

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #6b7280;
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
</style>
