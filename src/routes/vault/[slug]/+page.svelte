<script>
export let data;
import SorobanClient from "soroban-client";
import {StrKey, xdr} from "soroban-client";
import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
import { Buffer } from 'buffer';


async function deposit() {
    const bridge = new xBullWalletConnect();
    const public_key = await bridge.connect();

    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");
    let { sequence } = await server.getAccount(public_key);

    let account = new SorobanClient.Account(public_key, sequence.toString());

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
	    new xdr.Int128Parts({
		lo: xdr.Uint64.fromString("1"),
		hi: xdr.Uint64.fromString("0"),
	    })
	))
    ];
    
    const transaction = new SorobanClient.TransactionBuilder(account, {
	fee,
	networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	  .addOperation(contract.call("deposit", ...params))
	  .setTimeout(30)
	  .build();


    console.log(transaction.toXDR())
    
    bridge.closeConnections();
}

</script>

<svelte:head>
	<title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>

    <h3>Vault {data.title}</h3>
    <p>Token: {data.token_id}</p>
    <p>Minted fee shares: {data.shares_total_supply}</p>
    <p>Current yield: {data.current_yield} {data.asset}</p>

    <button on:click={deposit}>Deposit</button>

</section>

<style>

</style>
