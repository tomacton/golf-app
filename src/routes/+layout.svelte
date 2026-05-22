<script lang="ts">
	let { children } = $props();
</script>

<main>
	{@render children()}
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			'Open Sans', sans-serif;
		background: #0f6b30;
		color: #fff;
		min-height: 100vh;
	}

	main {
		max-width: 560px;
		margin: 0 auto;
		padding: env(safe-area-inset-top, 24px) 24px env(safe-area-inset-bottom, 24px) 24px;
	}
</style>
