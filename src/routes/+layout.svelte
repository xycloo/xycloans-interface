<script>
  import Header from './Header.svelte';
  import './styles.css';
  import favicon from '$lib/images/favicon.png';
</script>

<svelte:head>
  <link rel="icon" type="image/png" href={favicon} />
</svelte:head>

<div class="app">
	<Header />

	<main>
		<slot />
	</main>

<!--	<footer>
		<p>built by <a href="https://xycloo.com/">xyclooLabs</a></p>
	</footer>-->
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}

p {
  font-size: 0.9rem;
}
</style>
