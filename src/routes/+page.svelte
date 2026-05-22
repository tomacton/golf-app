<script lang="ts">
	const phases = [
		{ id: 0, title: 'Skeleton', status: 'in progress', detail: 'PWA installable on phone' },
		{ id: 1, title: 'Camera capture', status: 'todo', detail: 'Record a swing, play it back' },
		{ id: 2, title: 'Pose overlay', status: 'todo', detail: 'MediaPipe skeleton on playback' },
		{ id: 3, title: 'Auto-trim swing', status: 'todo', detail: 'Find the swing window in the clip' },
		{ id: 4, title: 'Fault detection', status: 'todo', detail: 'Early extension / OTT / head movement' },
		{ id: 5, title: 'History', status: 'todo', detail: 'Save swings to phone, review later' },
		{ id: 6, title: 'Polish', status: 'todo', detail: 'Install UX, error messages, updates' }
	];
</script>

<svelte:head>
	<title>Golf Improvement</title>
</svelte:head>

<header>
	<h1>Golf</h1>
	<p class="tag">Phase 0 — installable PWA</p>
</header>

<section class="phases">
	{#each phases as phase}
		<article class="phase" data-status={phase.status}>
			<div class="num">{phase.id}</div>
			<div class="meta">
				<div class="title">{phase.title}</div>
				<div class="detail">{phase.detail}</div>
			</div>
			<div class="status">{phase.status}</div>
		</article>
	{/each}
</section>

<footer>
	<p>If you can see this on your iPhone home screen, Phase 0 is done.</p>
</footer>

<style>
	header {
		padding: 32px 0 24px;
	}
	h1 {
		font-size: 2.4rem;
		margin: 0;
		letter-spacing: -0.02em;
	}
	.tag {
		margin: 4px 0 0;
		opacity: 0.7;
		font-size: 0.9rem;
	}

	.phases {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 16px 0;
	}
	.phase {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}
	.phase[data-status='in progress'] {
		background: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.35);
	}
	.num {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.25);
		font-weight: 600;
	}
	.title {
		font-weight: 600;
	}
	.detail {
		font-size: 0.85rem;
		opacity: 0.75;
	}
	.status {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.7;
	}

	footer {
		margin-top: 24px;
		padding: 16px 0;
		opacity: 0.65;
		font-size: 0.85rem;
		text-align: center;
	}
</style>
