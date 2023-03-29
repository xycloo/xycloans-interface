<script>
//	import Counter from './Counter.svelte';
import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
import { onMount } from 'svelte';

import SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';

function set_user_public(pk) {
    document.getElementById("user-pk").innerText = pk;
}

async function bridge() {
    const bridge = new xBullWalletConnect();

    const public_key = await bridge.connect();
    set_user_public(public_key);

    bridge.closeConnections();
}

</script>

<svelte:head>
	<title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>
    <h3 id="user-pk"></h3>
    <button on:click={bridge}>connect wallet</button>

</section>

<style>

</style>
