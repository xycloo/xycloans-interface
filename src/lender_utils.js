import {get_contract_bal} from "./soroban-helpers";
  import SorobanClient from "soroban-client";
  import {StrKey, xdr} from "soroban-client";
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import { Buffer } from 'buffer';

  import { onMount } from 'svelte';

  import {xdr as js_xdr} from 'js-xdr'


export async function get_lender_shares(server, vault, lender) {
    const buf = StrKey.decodeEd25519PublicKey(lender);
    const key = xdr.ScVal.scvVec(
      [xdr.ScVal.scvSymbol("Balance"), 
       xdr.ScVal.scvAddress(
	 xdr.ScAddress.scAddressTypeAccount(
	   xdr.PublicKey.publicKeyTypeEd25519(buf)
	 ))]);
    
    let data = await server.getContractData(vault, key);
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().lo().toString();
    
    return parseInt(val)
  }

export async function get_lender_rewards(server, vault, lender) {
    const buf = StrKey.decodeEd25519PublicKey(lender);
    const key = xdr.ScVal.scvVec(
      [xdr.ScVal.scvSymbol("MaturedFeesParticular"), 
       xdr.ScVal.scvAddress(
	 xdr.ScAddress.scAddressTypeAccount(
	   xdr.PublicKey.publicKeyTypeEd25519(buf)
	 ))]);
    
    let data = await server.getContractData(vault, key);
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().lo().toString();
    
    return parseInt(val) / 10000000
  }

export async function update_rewards(vault) {

    const bridge = new xBullWalletConnect();
    const public_key = await bridge.connect();

    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);
    let account = new SorobanClient.Account(public_key, (sequence - 1).toString());

    const contract = new SorobanClient.Contract(vault);
    const fee = 100;

    //    const buf = StrKey.decodeEd25519PublicKey(public)

    const buf = StrKey.decodeEd25519PublicKey(public_key);
    let params = [
      xdr.ScVal.scvAddress(
	xdr.ScAddress.scAddressTypeAccount(
	  xdr.PublicKey.publicKeyTypeEd25519(buf)
	)
      ),
    ];
    
    let transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	.addOperation(contract.call("update_fee_rewards", ...params))
	.setTimeout(10000)
	.build();

    const sim = await server.simulateTransaction(transaction);

    console.log(sim);
    
    let footprint = sim.results[0].footprint;
    
    let s_transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	.addOperation(SorobanClient.Operation.invokeHostFunction({
          function: transaction.operations[0].function,
          footprint: xdr.LedgerFootprint.fromXDR(footprint, "base64"),
          auth: []
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

      document.getElementById("tx-id").innerText = "updating rewards ... tx id is " + result.hash;
      
      console.log("id:", result);
      console.log("error:", result.error);
    });
    
    
  bridge.closeConnections();

  }

