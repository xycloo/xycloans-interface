<script>
  //	import Counter from './Counter.svelte';
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import {get_lender_shares, update_rewards, get_lender_rewards} from "../lender_utils";
  import { TOKENS, TOKENS_MAP } from "./TOKENS";
  import SorobanClient from "soroban-client";
  import { xdr, StrKey } from "soroban-client";
  import { Buffer } from 'buffer';

  import { onMount } from 'svelte';


  onMount(async () => {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

    let user_vaults = [];

    if (window.localStorage.getItem("xycloans-public") != null) {
      const public_key = window.localStorage.getItem("xycloans-public");
//      set_user_public(public_key);

      
      let vaults = await load_vaults(server);

      for (let vault of vaults) {
	let lender_obj = await get_lender(server, vault[0], vault[1], public_key);
	if (lender_obj.deposit != 0) {
	  user_vaults.push(lender_obj);
	}
      }
      
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
<button id="update-rewards-${user_vault}">update rewards</button>
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

  async function load_vaults(server) {
    const contractId = "e2c37af75db0e7975360b13678f3dd3b733f2341019003b4b3692cd173111423";
    let vaults = [];

    for (let tok_id of TOKENS) {

      const token_id_key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Vault"), xdr.ScVal.scvBytes(Buffer.from(tok_id, 'hex'))]);

      let data = await server.getContractData(contractId, token_id_key);

      let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
      let val = from_xdr.value()._attributes.val.value().toString("hex");
      vaults.push([val, TOKENS_MAP[tok_id]]);
    }

    return vaults
  }

  async function get_lender(server, vault, asset, lender_public) {

    let obj = {
      id: vault,
      asset: asset,
      deposit: 0,
      matured: 0
    }
    
//    const buf = StrKey.decodeEd25519PublicKey(lender_public);

    try {
      obj.deposit = await get_lender_shares(server, vault, lender_public) / 10000000;
      obj.matured = await get_lender_rewards(server, vault, lender_public);
    } catch (e) {
    }
    
    return obj
    
    /*
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("InitialDep"), xdr.ScVal.scvObject(
      xdr.ScObject.scoAddress(
	xdr.ScAddress.scAddressTypeAccount(
	  xdr.PublicKey.publicKeyTypeEd25519(buf)
	)
      )
    ),
							]))

    try {
      let data = await server.getContractData(vault, key);
      let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
      let val = from_xdr.value()._attributes.val.value().value().lo().toString();

      obj.deposit = val.slice(0, val.length - 7) + "." + val.slice(val.length - 7);

      if (obj.deposit != 0) {
	const increment_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Increment"), xdr.ScVal.scvObject(
	  xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeAccount(
	      xdr.PublicKey.publicKeyTypeEd25519(buf)
	    )
	  )
	),
								      ]))
	let increment_data = await server.getContractData(vault, increment_key);
	let increment_from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(increment_data.xdr, 'base64');
	let increment = parseInt(increment_from_xdr.value()._attributes.val.value().value().lo().toString());

	let matured = 0;

	const token_id = await get_token_id(server, vault);
	const balance = parseInt(await get_bal(server, vault, token_id)) + parseInt(await get_bal(server, await get_flash_loan(server, token_id), token_id))
	const tot_supply = (await get_tot_supply(server, vault, token_id)).toString();

	for (let i = 0; i < increment; i++) {
	  const batch_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvObject(
	    xdr.ScObject.scoAddress(
	      xdr.ScAddress.scAddressTypeAccount(
		xdr.PublicKey.publicKeyTypeEd25519(buf)
	      )
	    )
	  ), xdr.ScVal.scvObject(xdr.ScObject.scoI128(new xdr.Int128Parts({
	    lo: xdr.Uint64.fromString(i.toString()),
	    hi: xdr.Uint64.fromString("0"),
	  })))
								    ]));

	  const batch_obj_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Batch"), batch_key]));

	  try {
	    let batch_obj_data = await server.getContractData(vault, batch_obj_key);
	    let batch_obj_from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(batch_obj_data.xdr, 'base64');

	    const current_shares = batch_obj_from_xdr.value()._attributes.val._value._value[0]._attributes.val.value().value()._attributes.lo.toString();
	    const deposit = batch_obj_from_xdr.value()._attributes.val._value._value[1]._attributes.val.value().value()._attributes.lo.toString();
	    const initial_shares = batch_obj_from_xdr.value()._attributes.val._value._value[2]._attributes.val.value().value()._attributes.lo.toString();



	    const fees = Math.abs(parseInt(((balance * parseInt(current_shares)) / tot_supply) - (parseInt(deposit) * (parseInt(current_shares) / parseInt(initial_shares)))));

	    matured += fees;
	  } catch (e) {}
	}

	obj.matured = matured / 10000000
      }
      return obj
      
    } catch (e) {
    }*/
  }

  async function get_tot_supply(server, contractId) {
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("TotSupply")]))

    let resp = server.getContractData(contractId, key).then(data => {
      let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
      let val = from_xdr.value()._attributes.val.value().value().lo().toString();

      return val
    });

    return resp
  }

  async function get_flash_loan(server, tok_id) {
    const contractId = "e2c37af75db0e7975360b13678f3dd3b733f2341019003b4b3692cd173111423";

    const token_id_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("FlashLoan"), xdr.ScVal.scvObject(xdr.ScObject.scoBytes(Buffer.from(tok_id, 'hex')))]));

    let data = await server.getContractData(contractId, token_id_key);

    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().value().toString("hex");

    return val

  }


  async function get_token_id(server, contractId) {
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("TokenId")]))
    let data = await server.getContractData(contractId, key)
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');

    return from_xdr.value()._attributes.val.value().value().toString("hex")
  }

  async function get_bal(server, contractId, tokenId) {
    const vault_current_yield_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Balance"), xdr.ScVal.scvObject(
      xdr.ScObject.scoAddress(
	xdr.ScAddress.scAddressTypeContract(
	  Buffer.from(contractId, "hex")
	)
      )
    )]));

    
    let yield_resp = await server.getContractData(tokenId, vault_current_yield_key);
    let yield_from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(yield_resp.xdr, 'base64');
    let stroops = yield_from_xdr.value()._attributes.val.value().value()[0]._attributes.val.value().value()._attributes.lo.toString();

    //    let amount = stroops.slice(0, stroops.length - 7) + "." + stroops.slice(stroops.length - 7);

    return stroops
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


  #user-pk {
    font-size: .8rem;
  }

  #pools {
    margin-top: 40px;
  }
  

  
  
  h2 {

  }


  
</style>
