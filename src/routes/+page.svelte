<script lang="ts">
	const phases = [
		{ id: 0, title: 'Skeleton', status: 'done', detail: 'PWA installable on phone' },
		{ id: 1, title: 'Camera capture', status: 'in progress', detail: 'Record a swing, play it back' },
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
	<p class="tag">Personal improvement app</p>
</header>

<section class="cta">
	<a href="/record" class="record-btn">
		<span class="icon">●</span>
		<span class="label">Record a swing</span>
	</a>
</section>

<section class="phases">
	<h2>Build progress</h2>
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

<style>
	header {
		padding: 32px 0 16px;
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

	.cta {
		margin: 16px 0 28px;
	}
	.record-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: 100%;
		padding: 18px 20px;
		background: #fff;
		color: #0f6b30;
		text-decoration: none;
		border-radius: 14px;
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		box-shadow: 0 6px 24px -8px rgba(0, 0, 0, 0.35);
	}
	.record-btn:active {
		transform: scale(0.98);
	}
	.record-btn .icon {
		color: #d23838;
		font-size: 1.2em;
	}

	.phases {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 16px 0;
	}
	.phases h2 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.6;
		margin: 0 0 4px;
		font-weight: 600;
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
	.phase[data-status='done'] {
		opacity: 0.55;
	}
	.phase[data-status='done'] .num {
		background: rgba(255, 255, 255, 0.25);
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
</style>
