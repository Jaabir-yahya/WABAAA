<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>Kenya Commerce Storefront</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
	<meta name="theme-color" content="#0f172a" />
</svelte:head>

<main class="page">
	<header class="topbar">
		<div class="brand">Kenya Commerce</div>
		<div class="tagline">Duka lako mtandaoni — QR + WhatsApp</div>
	</header>

	<section class="content">
		{@render children()}
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		background: #f8fafc;
		color: #0f172a;
	}

	.page {
		min-height: 100vh;
	}

	.topbar {
		padding: 1.25rem 1.5rem;
		background: #0f172a;
		color: white;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.22);
	}

	.brand {
		font-weight: 700;
		font-size: 1.1rem;
	}

	.tagline {
		margin-top: 0.35rem;
		font-size: 0.9rem;
		color: #cbd5f5;
	}

	.content {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem;
	}
</style>
