<script>
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import {get_user_vaults} from "../lender_utils";
  import {update_rewards} from "../wallet-actions";
  import { TOKENS, TOKENS_MAP } from "./TOKENS";
  import * as SorobanClient from "soroban-client";
  import { xdr, StrKey } from "soroban-client";
  import { Buffer } from 'buffer';

  import { onMount } from 'svelte';


  onMount(async () => {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

    if (window.localStorage.getItem("xycloans-public") != null) {
      const public_key = window.localStorage.getItem("xycloans-public");
      const user_vaults = await get_user_vaults(server, public_key);
      
      if (user_vaults.length > 0) {
	document.getElementById("pools").innerHTML = `
    <div class="tbl-header">
      <table cellpadding="0" cellspacing="0" border="0">
	<thead>
          <tr>
            <th>Id</th>
	    <th>Asset</th>
	    <th>Deposited</th>
	    <th>Matured</th>
	    <th></th>
          </tr>
	</thead>
      </table>
    </div>

    <div class="tbl-content">
      
      <table id="user-vaults" cellpadding="0" cellspacing="0" border="0">
      </table>
    </div>
  </div>
`
      } else {
	document.getElementById("pools").innerHTML = `<p>Nothing supplied yet, <a href="/explore">explore the existing vaults</a>.</p>`
      }

      for (let user_vault of user_vaults) {
	let table = document.getElementById("user-vaults");
	const el = document.createElement("tr");
	el.innerHTML = `<tr>
    <td>
    <a href="/vault/${user_vault.id}">
    ${user_vault.id}
    </a>
    </td>
    <td>
    <p>${user_vault.asset}</p>
        </td>

    <td>
    <p>${user_vault.deposit} ${user_vault.asset}</p>
        </td>

    <td>
    <p>${user_vault.matured} ${user_vault.asset}</p>
        </td>

    <td>
<button class="action-btn-rev" id="update-rewards-${user_vault}">update rewards</button>
        </td>

    
</tr>`;
	table.appendChild(el);
	document.getElementById(`update-rewards-${user_vault}`).addEventListener("click", () => {update_rewards(user_vault.id)});
      }
    } else {
      document.getElementById("pools").innerHTML = `<p>Connect your wallet first</p>`
    }
  });

  function set_user_public(pk) {
    document.getElementById("user-pk").innerText = pk;
  }

  </script>

<svelte:head>
  <title>Xycloans</title>
  <meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>
  <!--
      <h4 id="user-pk"></h4>
      -->

      <h2>Your supplies</h2>

      <div id="pools">
      </div>

      
  <p id="tx-id"></p>
</section>

<style>

  :global(.action-btn-rev) {
    text-align: center;
    font-style: normal;
    border-radius: 5px;
    font-size: 13px;
    font-weight: bold;
    padding: 5px;
    height: 40px;
    background: #fff;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 0px 0px 0px #fff inset;
    color: white;
    width: 100%;
    max-width: 120px;
    transition: color 0.1s linear;
  }

  :global(.action-btn-rev:hover) {
    font-size: 0.8rem;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 2px 1000px 1px #fff inset;
    color: black;
  }


  #user-pk {
    font-size: .8rem;
  }

  #pools {
    margin-top: 40px;
  }
  

  
  
  h2 {

  }

  
</style>
