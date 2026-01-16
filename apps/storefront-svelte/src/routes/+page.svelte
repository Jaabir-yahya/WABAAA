<script lang="ts">
	let businessId = $state('');

	function goToStorefront() {
		const trimmed = businessId.trim();
		if (!trimmed) return;
		window.location.href = `/store/${trimmed}`;
	}
</script>

<section class="hero">
	<h1>Fungua storefront ya biashara yako</h1>
	<p>
		Hii ni storefront nyepesi inayotumia QR + WhatsApp ili wateja waagize haraka na
		ulipeke malipo ya M-Pesa kwa usahihi.
	</p>

	<div class="form">
		<label for="businessId">Ingiza Business ID</label>
		<input
			id="businessId"
			placeholder="mfano: elixosense"
			bind:value={businessId}
			on:keydown={(event) => event.key === 'Enter' && goToStorefront()}
		/>
		<button on:click={goToStorefront}>Fungua Duka</button>
	</div>

	<div class="tips">
		<strong>Tips:</strong>
		<ul>
			<li>QR za bidhaa zinahusisha malipo na biashara sahihi.</li>
			<li>WhatsApp inabeba oda na maelezo ya bidhaa.</li>
			<li>Dashboard ya mfanyabiashara inaendelea kufanya kazi hata bila net.</li>
		</ul>
	</div>
</section>

<style>
	.hero {
		background: white;
		border-radius: 20px;
		padding: 2rem;
		box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 2rem;
	}

	p {
		margin: 0 0 1.5rem;
		color: #475569;
	}

	.form {
		display: grid;
		gap: 0.75rem;
		max-width: 320px;
	}

	label {
		font-weight: 600;
	}

	input {
		padding: 0.75rem 0.9rem;
		border-radius: 12px;
		border: 1px solid #cbd5f5;
		font-size: 1rem;
	}

	button {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		border: none;
		background: #16a34a;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}

	button:hover {
		background: #15803d;
	}

	.tips {
		margin-top: 1.5rem;
		color: #475569;
	}

	.tips ul {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
	}
</style>
