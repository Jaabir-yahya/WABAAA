<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { PUBLIC_BUSINESS_ID } from '$env/static/public';

  type ProductStats = {
    product: string;
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
  };

  type MenuItem = {
    id: string;
    name: string;
    category: string | null;
    base_price: number;
    prep_time_minutes: number | null;
    available: boolean;
    aliases: string[];
    modifiers_allowed: string[];
  };

  let productStats = $state<ProductStats[]>([]);
  let menuItems = $state<MenuItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let businessType = $state('mini_supermarket');
  let menuLoading = $state(false);
  let menuError = $state<string | null>(null);

  let newItemName = $state('');
  let newItemCategory = $state('');
  let newItemPrice = $state('');
  let newItemPrepTime = $state('15');
  let newItemAliases = $state('');
  let newItemModifiers = $state('');

  // Product prices for revenue calculation
  const PRODUCT_PRICES: Record<string, number> = {
    sukari: 200,
    maziwa: 80,
    unga: 180,
    mafuta: 350,
    sabuni: 50,
    dawa: 150,
  };

  async function loadProductStats() {
    loading = true;
    error = null;

    try {
      // Get all orders for this business
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('items, created_at')
        .eq('business_id', PUBLIC_BUSINESS_ID);

      if (fetchError) throw fetchError;

      // Aggregate product stats
      const statsMap = new Map<string, ProductStats>();

      for (const order of orders ?? []) {
        const items = order.items as Array<{ product: string; quantity: number }> | null;
        if (!items || !Array.isArray(items)) continue;

        for (const item of items) {
          const existing = statsMap.get(item.product) ?? {
            product: item.product,
            totalOrders: 0,
            totalQuantity: 0,
            totalRevenue: 0,
          };

          existing.totalOrders += 1;
          existing.totalQuantity += item.quantity;
          existing.totalRevenue += (PRODUCT_PRICES[item.product] ?? 0) * item.quantity;

          statsMap.set(item.product, existing);
        }
      }

      // Sort by total orders (most popular first)
      productStats = Array.from(statsMap.values()).sort(
        (a, b) => b.totalOrders - a.totalOrders
      );

      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load products';
      loading = false;
    }
  }

  onMount(() => {
    loadProductStats();
    loadBusinessType();
    loadMenuItems();
  });

  function formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  }

  function getProductEmoji(product: string): string {
    const emojis: Record<string, string> = {
      sukari: '🍬',
      maziwa: '🥛',
      unga: '🌾',
      mafuta: '🫒',
      sabuni: '🧼',
      dawa: '💊',
    };
    return emojis[product.toLowerCase()] ?? '📦';
  }

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async function loadBusinessType() {
    const { data } = await supabase
      .from('businesses')
      .select('business_type')
      .eq('id', PUBLIC_BUSINESS_ID)
      .maybeSingle();

    if (data?.business_type) {
      businessType = data.business_type;
    }
  }

  async function loadMenuItems() {
    menuLoading = true;
    menuError = null;
    const { data, error: fetchError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', PUBLIC_BUSINESS_ID)
      .order('name', { ascending: true });

    if (fetchError) {
      menuError = fetchError.message;
      menuLoading = false;
      return;
    }

    menuItems = (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      base_price: Number(item.base_price ?? 0),
      prep_time_minutes: item.prep_time_minutes,
      available: item.available,
      aliases: item.aliases ?? [],
      modifiers_allowed: item.modifiers_allowed ?? [],
    }));
    menuLoading = false;
  }

  async function addMenuItem() {
    menuError = null;
    const price = Number(newItemPrice);
    if (!newItemName || !Number.isFinite(price) || price <= 0) {
      menuError = 'Weka jina na bei sahihi';
      return;
    }

    const aliases = newItemAliases
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const modifiers = newItemModifiers
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const { error: insertError } = await supabase
      .from('menu_items')
      .insert({
        business_id: PUBLIC_BUSINESS_ID,
        name: newItemName,
        category: newItemCategory || null,
        base_price: price,
        prep_time_minutes: Number(newItemPrepTime) || 15,
        aliases,
        modifiers_allowed: modifiers,
        available: true,
      });

    if (insertError) {
      menuError = insertError.message;
      return;
    }

    newItemName = '';
    newItemCategory = '';
    newItemPrice = '';
    newItemAliases = '';
    newItemModifiers = '';
    await loadMenuItems();
  }

  async function toggleMenuItem(item: MenuItem) {
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
      .eq('business_id', PUBLIC_BUSINESS_ID);

    if (updateError) {
      menuError = updateError.message;
      return;
    }

    await loadMenuItems();
  }
</script>

<div class="bidhaa-page">
  <h1 class="page-title">BIDHAA</h1>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Inapakia...</p>
    </div>
  {:else if error}
    <div class="error-card">
      <p>⚠️ {error}</p>
      <button onclick={() => loadProductStats()}>Jaribu tena</button>
    </div>
  {:else if productStats.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📦</div>
      <h2>Hakuna Bidhaa</h2>
      <p>Bidhaa zitaonekana hapa ukipokea oda</p>
    </div>
  {:else}
    <!-- Top Selling Section -->
    <div class="section">
      <h2 class="section-title">🔥 ZINAZOUZA SANA</h2>
      
      <div class="products-list">
        {#each productStats.slice(0, 6) as product, index}
          <div class="product-card" class:top-seller={index < 3}>
            <div class="product-rank">#{index + 1}</div>
            <div class="product-icon">{getProductEmoji(product.product)}</div>
            <div class="product-info">
              <div class="product-name">{capitalizeFirst(product.product)}</div>
              <div class="product-stats">
                <span class="stat-orders">{product.totalOrders} oda</span>
                <span class="stat-qty">{product.totalQuantity} {product.product === 'maziwa' ? 'lita' : 'kg'}</span>
              </div>
            </div>
            <div class="product-revenue">{formatCurrency(product.totalRevenue)}</div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Price List Section -->
    <div class="section">
      <h2 class="section-title">💰 BEI ZA SASA</h2>
      
      <div class="price-list">
        {#each Object.entries(PRODUCT_PRICES) as [product, price]}
          <div class="price-row">
            <div class="price-product">
              <span class="price-emoji">{getProductEmoji(product)}</span>
              <span class="price-name">{capitalizeFirst(product)}</span>
            </div>
            <div class="price-value">{formatCurrency(price)}</div>
          </div>
        {/each}
      </div>
    </div>

    {#if businessType === 'restaurant'}
      <!-- Menu Management -->
      <div class="section">
        <h2 class="section-title">🍽️ MENU YAKO</h2>

        <div class="menu-form">
          <input class="menu-input" placeholder="Jina la chakula" bind:value={newItemName} />
          <div class="menu-row">
            <input class="menu-input" placeholder="Bei (KSh)" type="number" bind:value={newItemPrice} />
            <input class="menu-input" placeholder="Dakika za kupika" type="number" bind:value={newItemPrepTime} />
          </div>
          <input class="menu-input" placeholder="Kategoria (mains, drinks)" bind:value={newItemCategory} />
          <input class="menu-input" placeholder="Aliases (chips, viazi)" bind:value={newItemAliases} />
          <input class="menu-input" placeholder="Modifiers (extra cheese, bila vitunguu)" bind:value={newItemModifiers} />
          <button class="menu-add" onclick={addMenuItem}>+ Ongeza kwenye menu</button>
          {#if menuError}
            <div class="menu-error">⚠️ {menuError}</div>
          {/if}
        </div>

        {#if menuLoading}
          <p class="menu-loading">Inapakia menu...</p>
        {:else if menuItems.length === 0}
          <p class="menu-empty">Hakuna menu bado. Ongeza chakula.</p>
        {:else}
          <div class="menu-list">
            {#each menuItems as item}
              <div class="menu-item" class:menu-unavailable={!item.available}>
                <div class="menu-info">
                  <div class="menu-name">{item.name}</div>
                  <div class="menu-meta">
                    {formatCurrency(item.base_price)} • {item.prep_time_minutes ?? 15} dak
                    {#if item.category} • {item.category}{/if}
                  </div>
                  {#if item.modifiers_allowed.length > 0}
                    <div class="menu-modifiers">
                      Modifiers: {item.modifiers_allowed.join(', ')}
                    </div>
                  {/if}
                </div>
                <button class="menu-toggle" onclick={() => toggleMenuItem(item)}>
                  {item.available ? '✅ Inauzwa' : '⏸️ Haipo'}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Coming Soon: Inventory -->
    <div class="section coming-soon">
      <h2 class="section-title">📊 HIFADHI (Inakuja)</h2>
      <p class="coming-text">
        Hivi karibuni utaweza kufuatilia stock yako na kupata tahadhari bidhaa zinapoisha.
      </p>
    </div>
  {/if}
</div>

<style>
  .bidhaa-page {
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
    border-top-color: #8b5cf6;
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

  .products-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .product-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
  }

  .product-card.top-seller {
    border-left: 4px solid #f59e0b;
  }

  .product-rank {
    font-size: 0.75rem;
    font-weight: 800;
    color: #9ca3af;
    width: 24px;
    text-align: center;
  }

  .product-card.top-seller .product-rank {
    color: #f59e0b;
  }

  .product-icon {
    font-size: 1.75rem;
  }

  .product-info {
    flex: 1;
    min-width: 0;
  }

  .product-name {
    font-weight: 700;
    color: #1a1a1a;
    font-size: 1rem;
  }

  .product-stats {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }

  .stat-orders,
  .stat-qty {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .product-revenue {
    font-weight: 700;
    color: #10b981;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  /* Price List */
  .price-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #f5f5f5;
  }

  .price-row:last-child {
    border-bottom: none;
  }

  .price-product {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .price-emoji {
    font-size: 1.25rem;
  }

  .price-name {
    font-weight: 600;
    color: #374151;
  }

  .price-value {
    font-weight: 700;
    color: #1a1a1a;
  }

  /* Coming Soon */
  .coming-soon {
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px dashed #8b5cf6;
  }

  .coming-soon .section-title {
    color: #8b5cf6;
    margin-bottom: 0.5rem;
  }

  .coming-text {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  /* Menu management */
  .menu-form {
    background: #ffffff;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #f0f0f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    margin-bottom: 1rem;
  }

  .menu-row {
    display: flex;
    gap: 0.75rem;
  }

  .menu-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    box-sizing: border-box;
  }

  .menu-add {
    width: 100%;
    padding: 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .menu-error {
    margin-top: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .menu-loading,
  .menu-empty {
    text-align: center;
    color: #6b7280;
    margin: 1rem 0;
  }

  .menu-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    padding: 0.875rem;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
  }

  .menu-item.menu-unavailable {
    opacity: 0.6;
  }

  .menu-info {
    flex: 1;
    min-width: 0;
  }

  .menu-name {
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 0.25rem;
  }

  .menu-meta {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .menu-modifiers {
    font-size: 0.75rem;
    color: #4b5563;
    margin-top: 0.25rem;
  }

  .menu-toggle {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
    background: #f9fafb;
    font-size: 0.75rem;
    cursor: pointer;
  }
</style>
