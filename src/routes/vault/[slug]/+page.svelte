<script>
export let data;
import SorobanClient from "soroban-client";
import {StrKey, xdr} from "soroban-client";
import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
import { Buffer } from 'buffer';

import { onMount } from 'svelte';

import {xdr as js_xdr} from 'js-xdr'

function set_user_public(pk) {
    document.getElementById("user-pk").innerText = pk;
}

onMount(async () => {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

   
    if (window.localStorage.getItem("xycloans-public") == null) {
	document.getElementById("connect").classList = [];
    }  else {
	const public_key = window.localStorage.getItem("xycloans-public");
	set_user_public(public_key);
    }

    const lender = window.localStorage.getItem("xycloans-public");
    let initial_deposit = await get_initial_deposit(server, data.title, lender);

    document.getElementById("provided-liquidity").innerText = initial_deposit.toString() + " " + data.asset;

    const increment = await get_increment(server, data.title, lender); 

    for (let i=0; i < increment; i++) {
	let batch = await get_batch(server, data.title, lender, i);
	console.log(batch)
    }
    
});


async function get_increment(server, vault, lender) {
    const buf = StrKey.decodeEd25519PublicKey(lender);
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
    return increment
}

async function get_batch(server, vault, lender, increment) {
    const buf = StrKey.decodeEd25519PublicKey(lender);
    const batch_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvObject(
	xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeAccount(
		xdr.PublicKey.publicKeyTypeEd25519(buf)
	    )
	)
    ), xdr.ScVal.scvObject(xdr.ScObject.scoI128(new xdr.Int128Parts({
	lo: xdr.Uint64.fromString(increment.toString()),
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

	return {
	    current_shares: current_shares, deposit: deposit, initial_shares: initial_shares
	}
    } catch (e) {
	return null
    }

}

async function get_initial_deposit(server, vault, lender) {
    const buf = StrKey.decodeEd25519PublicKey(lender);
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("InitialDep"), xdr.ScVal.scvObject(
	xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeAccount(
		xdr.PublicKey.publicKeyTypeEd25519(buf)
	    )
	)
    ),
							]));
    let data = await server.getContractData(vault, key);
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().value().lo().toString();
    
    return parseInt(val) / 10000000
}

async function deposit() {

    const bridge = new xBullWalletConnect();
    const public_key = await bridge.connect();

    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);

    

    //    var big = js_xdr.Hyper.fromString('1099511627776');
    let str_amount = document.getElementById("amount").value;

    const amount = new xdr.Int128Parts({
	lo: xdr.Uint64.fromString(str_amount),
	hi: xdr.Uint64.fromString("0"),
    })

    let account = new SorobanClient.Account(public_key, (sequence - 1).toString());

    
    const contract = new SorobanClient.Contract("7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e");
    const fee = 100;

//    const buf = StrKey.decodeEd25519PublicKey(public)

    const buf = StrKey.decodeEd25519PublicKey(public_key);
    let params = [
	xdr.ScVal.scvObject(
	    xdr.ScObject.scoAddress(
		xdr.ScAddress.scAddressTypeAccount(
		    xdr.PublicKey.publicKeyTypeEd25519(buf)
		)
	    )
	),
	xdr.ScVal.scvObject(xdr.ScObject.scoBytes(Buffer.from(data.token_id, 'hex'))),
	xdr.ScVal.scvObject(xdr.ScObject.scoI128(
	    amount
	))
    ];
    
    let transaction = new SorobanClient.TransactionBuilder(account, {
	fee,
	networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	  .addOperation(contract.call("deposit", ...params))
	  .setTimeout(10000)
	  .build();

    const sim = await server.simulateTransaction(transaction);
    
    let auth = sim.results[0].auth;
    let footprint = sim.results[0].footprint;

    
    let s_transaction = new SorobanClient.TransactionBuilder(account, {
	fee,
	networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	.addOperation(SorobanClient.Operation.invokeHostFunction({
            function: transaction.operations[0].function,
            footprint: xdr.LedgerFootprint.fromXDR(footprint, "base64"),
            auth: [xdr.ContractAuth.fromXDR(auth[0], "base64")]
        }))
	.setTimeout(10000)
	.build();

    const signed_xdr = await bridge.sign({
	xdr: s_transaction.toXDR(),
	publicKey: public_key,
	network: "Test SDF Future Network ; October 2022",
    });
    
    let signed_tx = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");

    let newsig = Buffer.from(signed_tx._value._attributes.signatures[0]._attributes.signature).toString("base64");
    s_transaction.addSignature(public_key, newsig);
    
    server.sendTransaction(s_transaction).then(result => {

	document.getElementById("tx-id").innerText = "depositing ... tx id is " + result.id;
	
	console.log("id:", result);
	console.log("error:", result.error);
    });
    
    
    bridge.closeConnections();

}

</script>

    <svelte:head>
    <title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

    <section>

    <button id="connect" on:click={() => {}}>connect wallet</button>

    <h3>Vault {data.title}</h3>
    <p>Token: {data.token_id}</p>
    <p>Flash loan: {data.flash_loan}</p>
    <p>Minted fee shares: {data.shares_total_supply}</p>
    <p>Liquidity: {data.total_liquidity} {data.asset}</p>
    <p>Current yield: {data.current_yield} {data.asset}</p>

    <input id="amount" placeholder="amount">
    <button on:click={deposit}>Deposit</button>

    <p id="tx-id"></p>

    <h4 id="user-pk"></h4>
    <h2>Your liquidity</h2>
    <div id="provided-liquidity"></div>
    <div id="batches"></div>

</section>

<style>
#connect {
    display: none
}
</style>
