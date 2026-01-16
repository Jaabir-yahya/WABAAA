<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { supabase } from '$lib/supabase';

	type BusinessRecord = {
		id: string;
		name: string;
		whatsapp_number: string | null;
		config?: Record<string, unknown> | null;
	};

	type Product = {
		id: string;
		name: string;
		price: number;
		unit?: string;
		description?: string;
		image?: string;
	};

	type CartItem = Product & { qty: number };

	let loading = $state(true);
	let error = $state<string | null>(null);
	let business = $state<BusinessRecord | null>(null);
	let products = $state<Product[]>([]);
	let cart = $state<CartItem[]>([]);
	let shareUrl = $state<string | null>(null);

	let qrFor = $state<Product | null>(null);
	let qrSvg = $state<string | null>(null);
	let qrLoading = $state(false);
	let qrError = $state<string | null>(null);
	const qrDataUrl = $derived(
		qrSvg ? `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}` : null
	);

	const cartTotal = $derived(
		cart.reduce((sum, item) => sum + item.price * item.qty, 0)
	);

	const cartCount = $derived(cart.reduce((sum, item) => sum + item.qty, 0));

	const businessId = () => get(page).params.businessId;

	onMount(async () => {
		const id = businessId();
		if (!id) {
			error = 'Biashara haijapatikana.';
			loading = false;
			return;
		}
		await loadBusiness(id);
		shareUrl = `${window.location.origin}/store/${id}`;
	});

	async function loadBusiness(id: string) {
		loading = true;
		error = null;

		const { data, error: fetchError } = await supabase
			.from('businesses')
			.select('id,name,whatsapp_number,config')
			.eq('id', id)
			.maybeSingle();

		if (fetchError || !data) {
			error = fetchError?.message ?? 'Biashara haijapatikana.';
			loading = false;
			return;
		}

		business = data as BusinessRecord;
		products = buildProducts((data as BusinessRecord).config ?? {});
		loading = false;
	}

	function buildProducts(config: Record<string, unknown>) {
		const catalog = Array.isArray(config.product_catalog)
			? (config.product_catalog as Record<string, unknown>[])
			: null;
		if (catalog?.length) {
			return catalog
				.map((item) => ({
					id: String(item.id ?? item.name ?? '').trim(),
					name: String(item.name ?? item.id ?? '').trim(),
					price: Number(item.price ?? 0),
					unit: item.unit ? String(item.unit) : undefined,
					description: item.description ? String(item.description) : undefined,
					image: item.image ? String(item.image) : undefined
				}))
				.filter((item) => item.id && item.name && Number.isFinite(item.price) && item.price > 0);
		}

		const prices = (config.product_prices ?? {}) as Record<string, number>;
		const labels = (config.product_labels ?? {}) as Record<string, string>;
		const images = (config.product_images ?? {}) as Record<string, string>;
		const units = (config.product_units ?? {}) as Record<string, string>;
		const descriptions = (config.product_descriptions ?? {}) as Record<string, string>;

		return Object.entries(prices)
			.map(([id, price]) => ({
				id,
				name: labels[id] ?? id,
				price: Number(price ?? 0),
				unit: units[id],
				description: descriptions[id],
				image: images[id]
			}))
			.filter((item) => Number.isFinite(item.price) && item.price > 0);
	}

	function formatCurrency(amount: number) {
		return `KSh ${amount.toLocaleString('en-KE')}`;
	}

	function normalizePhone(phone?: string | null) {
		if (!phone) return '';
		return phone.replace(/\D/g, '');
	}

	function buildWhatsAppLink(message: string) {
		if (!business?.whatsapp_number) return '';
		const phone = normalizePhone(business.whatsapp_number);
		return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
	}

	function addToCart(product: Product) {
		const existing = cart.find((item) => item.id === product.id);
		if (existing) {
			cart = cart.map((item) =>
				item.id === product.id ? { ...item, qty: item.qty + 1 } : item
			);
			return;
		}
		cart = [...cart, { ...product, qty: 1 }];
	}

	function adjustQty(productId: string, delta: number) {
		cart = cart
			.map((item) =>
				item.id === productId ? { ...item, qty: Math.max(1, item.qty + delta) } : item
			)
			.filter((item) => item.qty > 0);
	}

	function removeFromCart(productId: string) {
		cart = cart.filter((item) => item.id !== productId);
	}

	function buildCartMessage() {
		if (!business) return '';
		const lines = cart.map(
			(item) => `- ${item.name} x${item.qty} (${formatCurrency(item.price * item.qty)})`
		);
		return [
			`Nataka kuagiza kutoka ${business.name}:`,
			...lines,
			`Jumla: ${formatCurrency(cartTotal)}`
		].join('\n');
	}

	function checkoutWhatsApp() {
		const message = cart.length ? buildCartMessage() : 'Nataka kuagiza bidhaa.';
		const link = buildWhatsAppLink(message);
		if (link) window.open(link, '_blank');
	}

	function orderSingle(product: Product) {
		const message = `Nataka ${product.name} ${formatCurrency(product.price)}`;
		const link = buildWhatsAppLink(message);
		if (link) window.open(link, '_blank');
	}

	async function generateQr(product: Product) {
		if (!business) return;
		qrLoading = true;
		qrError = null;
		qrSvg = null;
		qrFor = product;

		try {
			const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/generate-qr`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					businessId: business.id,
					type: 'product',
					data: {
						productId: product.id,
						quantity: 1,
						unit: product.unit ?? 'pcs',
						amount: product.price
					}
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload?.error ?? 'QR haijatengenezwa.');
			}

			qrSvg = payload.qr_svg ?? null;
		} catch (err) {
			qrError = err instanceof Error ? err.message : 'Kuna tatizo la QR.';
		} finally {
			qrLoading = false;
		}
	}

	function closeQr() {
		qrFor = null;
		qrSvg = null;
		qrError = null;
	}
</script>

{#if loading}
	<div class="state">Inapakia duka...</div>
{:else if error}
	<div class="state error">{error}</div>
{:else}
	<section class="header">
		<div>
			<h1>{business?.name}</h1>
			<p class="meta">WhatsApp: {business?.whatsapp_number ?? 'Haijawekwa'}</p>
		</div>
		{#if shareUrl}
			<div class="share">
				<span>Link ya duka</span>
				<input readonly value={shareUrl} />
			</div>
		{/if}
	</section>

	<section class="grid">
		{#if products.length === 0}
			<div class="state">Hakuna bidhaa zilizowekwa kwenye config.</div>
		{:else}
			{#each products as product (product.id)}
				<article class="card">
					<div class="card-media">
						{#if product.image}
							<img src={product.image} alt={product.name} />
						{:else}
							<div class="placeholder">📦</div>
						{/if}
					</div>
					<div class="card-body">
						<h3>{product.name}</h3>
						{#if product.description}
							<p class="desc">{product.description}</p>
						{/if}
						<p class="price">{formatCurrency(product.price)}</p>
						<div class="actions">
							<button class="primary" onclick={() => addToCart(product)}>
								Ongeza Cart
							</button>
							<button class="ghost" onclick={() => orderSingle(product)}>
								WhatsApp
							</button>
							<button class="ghost" onclick={() => generateQr(product)}>
								QR
							</button>
						</div>
					</div>
				</article>
			{/each}
		{/if}
	</section>

	<section class="cart">
		<div class="cart-header">
			<h2>Cart ({cartCount})</h2>
			{#if cart.length > 0}
				<span class="total">Jumla: {formatCurrency(cartTotal)}</span>
			{/if}
		</div>

		{#if cart.length === 0}
			<p class="state">Bado hakuna bidhaa kwenye cart.</p>
		{:else}
			<div class="cart-items">
				{#each cart as item (item.id)}
					<div class="cart-item">
						<div>
							<strong>{item.name}</strong>
							<p class="meta">{formatCurrency(item.price)} / {item.unit ?? 'pcs'}</p>
						</div>
						<div class="qty">
							<button onclick={() => adjustQty(item.id, -1)}>-</button>
							<span>{item.qty}</span>
							<button onclick={() => adjustQty(item.id, 1)}>+</button>
						</div>
						<button class="link" onclick={() => removeFromCart(item.id)}>Ondoa</button>
					</div>
				{/each}
			</div>
			<button class="checkout" onclick={checkoutWhatsApp}>
				Checkout via WhatsApp
			</button>
			<p class="hint">
				Checkout inaenda WhatsApp ili oda iwekwe kwenye mfumo na QR/M-Pesa
				ikuweze kuhusishwa na biashara sahihi.
			</p>
		{/if}
	</section>
{/if}

{#if qrFor}
	<div class="modal">
		<div class="modal-body">
			<h3>QR ya {qrFor.name}</h3>
			{#if qrLoading}
				<p class="state">Inatengeneza QR...</p>
			{:else if qrError}
				<p class="state error">{qrError}</p>
			{:else if qrDataUrl}
				<img class="qr" src={qrDataUrl} alt={`QR ya ${qrFor.name}`} />
				<p class="hint">Scan ili kuanzisha oda ya bidhaa hii.</p>
			{/if}
			<button class="ghost" onclick={closeQr}>Funga</button>
		</div>
	</div>
{/if}

<style>
	.state {
		padding: 1rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
	}

	.state.error {
		background: #fee2e2;
		color: #991b1b;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		background: white;
		padding: 1.5rem;
		border-radius: 16px;
		box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.meta {
		margin: 0.35rem 0 0;
		color: #64748b;
	}

	.share {
		display: grid;
		gap: 0.35rem;
		min-width: 220px;
	}

	.share input {
		border-radius: 10px;
		border: 1px solid #cbd5f5;
		padding: 0.5rem 0.6rem;
		font-size: 0.9rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
	}

	.card {
		background: white;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
		display: flex;
		flex-direction: column;
	}

	.card-media {
		height: 150px;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		font-size: 2rem;
	}

	.card-body {
		padding: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.desc {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
	}

	.price {
		font-weight: 700;
		margin: 0;
	}

	.actions {
		display: grid;
		gap: 0.5rem;
	}

	button {
		border-radius: 10px;
		border: none;
		padding: 0.6rem 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	button.primary {
		background: #16a34a;
		color: white;
	}

	button.primary:hover {
		background: #15803d;
	}

	button.ghost {
		background: #e2e8f0;
		color: #0f172a;
	}

	.cart {
		margin-top: 2rem;
		background: white;
		padding: 1.5rem;
		border-radius: 16px;
		box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
	}

	.cart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.total {
		font-weight: 700;
		color: #16a34a;
	}

	.cart-items {
		display: grid;
		gap: 0.75rem;
	}

	.cart-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
	}

	.qty {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.qty button {
		background: #e2e8f0;
		width: 32px;
		height: 32px;
		border-radius: 8px;
	}

	.link {
		background: none;
		color: #ef4444;
		padding: 0;
	}

	.checkout {
		margin-top: 1rem;
		width: 100%;
		background: #0f172a;
		color: white;
	}

	.hint {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: #64748b;
	}

	.modal {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-body {
		background: white;
		padding: 1.5rem;
		border-radius: 16px;
		box-shadow: 0 16px 32px rgba(15, 23, 42, 0.2);
		max-width: 360px;
		text-align: center;
		display: grid;
		gap: 0.75rem;
	}

	.qr {
		width: 100%;
		height: auto;
	}

	@media (max-width: 720px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
