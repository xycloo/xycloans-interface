<script>
//	import Counter from './Counter.svelte';
import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
import { TOKENS, TOKENS_MAP } from "./TOKENS";
import SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';

import { onMount } from 'svelte';


onMount(async () => {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

    let user_vaults = [];

    if (window.localStorage.getItem("xycloans-public") == null) {
	document.getElementById("connect").classList = [];
    }  else {
	const public_key = window.localStorage.getItem("xycloans-public");
	set_user_public(public_key);

	
	let vaults = await load_vaults(server);

	for (let vault of vaults) {
	    let lender_obj = await get_lender(server, vault[0], vault[1], public_key);
	    if (lender_obj.deposit.amount != 0) {
		user_vaults.push(lender_obj);
	    }
	}
	

	for (let user_vault of user_vaults) {
	    let table = document.getElementById("user-vaults");
	    const el = document.createElement("tr");
	    el.innerHTML = `<tr>
    <td>
    <a href="/vault/${user_vault.id}">
    <p>${user_vault.id}</p>
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
    
</tr>`;
	    table.appendChild(el);
	}
    }
});

function set_user_public(pk) {
    document.getElementById("user-pk").innerText = pk;
}

async function load_vaults(server) {
    const contractId = "7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e";
    let vaults = [];

    for (let tok_id of TOKENS) {

	const token_id_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Vault"), xdr.ScVal.scvObject(xdr.ScObject.scoBytes(Buffer.from(tok_id, 'hex')))]));

	let data = await server.getContractData(contractId, token_id_key);

	let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
	let val = from_xdr.value()._attributes.val.value().value().toString("hex");
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
    
    const buf = StrKey.decodeEd25519PublicKey(lender_public);
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
	
    } catch (e) {
    }

    return obj
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
    const contractId = "7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e";

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



async function user_dashboard() {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

    let user_vaults = [];

    if (window.localStorage.getItem("xycloans-public") == null) {
	const bridge = new xBullWalletConnect();
	const public_key = await bridge.connect();
	window.localStorage.setItem("xycloans-public", public_key);
	bridge.closeConnections();
    } 


    const public_key = window.localStorage.getItem("xycloans-public");
    set_user_public(public_key);

    
    let vaults = await load_vaults(server);

    for (let vault of vaults) {
	let lender_obj = await get_lender(server, vault[0], vault[1], public_key);
	if (lender_obj.deposit.amount != 0) {
	    user_vaults.push(lender_obj);
	}
    }
    

    for (let user_vault of user_vaults) {
	let table = document.getElementById("user-vaults");
	const el = document.createElement("tr");
	el.innerHTML = `<tr>
    <td>
    <a href="/vault/${user_vault.id}">
    <p>${user_vault.id}</p>
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
    
</tr>`;
	table.appendChild(el);
    }
}

</script>

<svelte:head>
	<title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>
    <h4 id="user-pk"></h4>
    <h2>Your pools</h2>
    <button id="connect" on:click={user_dashboard}>connect wallet</button>

    <div class="tbl-header">
    <table cellpadding="0" cellspacing="0" border="0">
      <thead>
        <tr>
          <th>Id</th>
    <th>Asset</th>
    <th>Deposited</th>
    <th>Matured</th>
        </tr>
      </thead>
    </table>
    </div>

    <div class="tbl-content">
    
    <table id="user-vaults">
    </table>
    </div>
    

</section>

 <style>

#connect {
    display: none
}

#user-pk {
    font-size: .8rem;
}

:global(table){
  width:100%;
  table-layout: fixed;
}
:global(.tbl-header) {
  background-color: rgba(0,0,0,0.3);
 }
:global(.tbl-content) {
  overflow-x:auto;
  margin-top: 0px;
  border: 3px solid rgba(0,0,0,0.3);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}
:global(th) {
  padding: 20px 15px;
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  color: #fff;
  text-transform: uppercase;
}
:global(td) {
    word-wrap: break-word;
      background: #0d1016;
  padding: 15px;
  text-align: left;
  vertical-align:middle;
  font-weight: 300;
  font-size: 12px;
  color: #fff;
  border-bottom: solid 1px rgba(0,0,0,0.1);
}

 
 h2 {

 }

:global(.vault-list-item) {
     text-align: center;
     padding: 20px;
     background: #000000;
     border-radius: 10px;
     width: 550px;
     margin: auto;
     margin-top: 60px;

 }
 
</style>
