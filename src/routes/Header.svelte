<script>
  import { page } from '$app/stores';
  import logo from '$lib/images/logo.png';
  import github from '$lib/images/github.svg';
  //  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import { StellarWalletsKit, WalletNetwork, WalletType } from 'stellar-wallets-kit';
  import { onMount } from 'svelte';

  onMount(() => {
    const public_key = window.localStorage.getItem("xycloans-public");
    if (public_key != null) {
      document.getElementById("wallet-public").innerText = public_key.slice(0, 10) + "...";
    }
  })
  
  async function connect_wallet() {
    if (window.localStorage.getItem("xycloans-public") == null) {
      const kit = new StellarWalletsKit({
	network: WalletNetwork.FUTURENET,
	selectedWallet: WalletType.XBULL
      });

      const public_key = await kit.getPublicKey();
      window.localStorage.setItem("xycloans-public", public_key);
      window.location.reload()
    }
  }

</script>

<div id="header-section">
<header>
  <nav>
    <div class="corner">
      <a href="/">
	<img src={logo} alt="xyclooLabs" />
      </a>
    </div>


    <ul>
      <li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
	<a href="/">Dashboard</a>
      </li>
      <li aria-current={$page.url.pathname === '/explore' ? 'page' : undefined}>
	<a href="/explore">Explore</a>
      </li>
      <li aria-current={$page.url.pathname === 'https://xycloans.xycloo.com/' ? 'page' : undefined}>
	<a href="https://xycloans.xycloo.com">docs</a>
      </li>


    </ul>

    <div id="wallet">
      <button on:click={connect_wallet}>
	<p id="wallet-public">connect</p>
      </button>
    </div>
    
  </nav>




</header>
</div>

<style>

  #header-section {
    background: #fff;
    right: 0;
    left: 0;
    top: 0;
    z-index: 99;
    margin-bottom: 40px;
  }

  header {
    width: 100%;
    padding-bottom: 20px;
  }

  nav {
    width: 100%;
  }

  nav {
    position: relative;
  }


  #wallet button {
    height: 70%;
    top: 15px;
    position: absolute;
    right: 10px;
  }

  header {
    display: flex;
    max-width: 1100px;
    margin: auto;
  }

  .corner {
    width: 10.9em;
    height: 3em;
    margin-right: 30px;
  }

  .corner a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .corner img {
    padding-top: 20px;

    width: 10.9em;
    height: 2.9em;
    object-fit: contain;
  }

  nav {
    display: flex;
  }



  ul {
    position: relative;
    padding: 0;
    margin: 0;
    height: 3em;
    display: flex;
    list-style: none;
    background: var(--background);
    background-size: contain;
  }

  li {
    padding-top: 10px;
    position: relative;
    height: 100%;
  }


  nav a {
    display: flex;
    height: 100%;
    align-items: center;
    padding: 0 0.5rem;
    color: var(--color-text-light);
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-decoration: none;
    transition: color 0.2s linear;
  }

  nav button {
    height: 80%;
    align-items: center;
    font-size: 0.8rem;
    text-transform: uppercase;
    margin-top: auto;
    background: var(--color-theme-1);
    border: none;
    border-radius: 5px;
  }

  button p {
    font-weight: 700;
    margin: auto;    
  }

  a:hover {
    color: var(--color-theme-3);
  }
</style>
