<script>
export let data;
import SorobanClient from "soroban-client";

</script>

<svelte:head>
	<title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>

    <h3>Vault {data.title}</h3>
    <p>Token: {data.token_id}</p>
    <p>Minted fee shares: {data.shares_total_supply}</p>
    <p>Current yield: {data.current_yield} {data.asset} [stroops]</p>

</section>

<style>

</style>
