<script>
  export let data;
  import {get_contract_bal} from "../../../soroban-helpers";
  import {get_lender_shares} from "../../../lender_utils";
  import SorobanClient from "soroban-client";
  import {StrKey, xdr} from "soroban-client";
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import { Buffer } from 'buffer';

  import { onMount } from 'svelte';

  import {xdr as js_xdr} from 'js-xdr'


  onMount(async () => {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")

    const lender = window.localStorage.getItem("xycloans-public");
    if (lender != null) {
      const elements = document.querySelectorAll('.logged-only');

      elements.forEach(el => {
	el.style.display = 'block';
      });
    }

    try {
      let initial_deposit = await get_lender_shares(server, data.title, lender);
      
      document.getElementById("provided-liquidity").innerText = "Shares balance: " + initial_deposit.toString() + `\nDeposited: ${(initial_deposit / 10000000).toString()} XLM`;
//      document.getElementById("total-shares").innerText = "Total shares: " + total_shares.toString() + ` (${Math.round((percentage + Number.EPSILON) * 100) / 100}% of total shares)`;
      //      document.getElementById("matured-yield").innerText = "Matured yield: " + (total_matured/10000000).toString()  + " " + data.asset;
    } catch (e) {
      document.getElementById("provided-liquidity").innerText = "Not a lender for this pool";
//      document.getElementById("batches-message").style.display = "block";
//      document.getElementById("batches-message").innerText = "Not a lender for this pool";
    }
  });

/*  async function get_lender_shares(server, vault, lender) {
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
  }*/

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

    
    const contract = new SorobanClient.Contract("03bc11e8d978c6cd257469de2a447f3a4181c3410e79b610c7528db280bd27d8");
    const fee = 100;

    //    const buf = StrKey.decodeEd25519PublicKey(public)

    const buf = StrKey.decodeEd25519PublicKey(public_key);
    let params = [
      xdr.ScVal.scvAddress(
	xdr.ScAddress.scAddressTypeAccount(
	  xdr.PublicKey.publicKeyTypeEd25519(buf)
	)
      ),
      xdr.ScVal.scvBytes(Buffer.from(data.token_id, 'hex')),
      xdr.ScVal.scvI128(
	amount
      )
    ];
    
    let transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	.addOperation(contract.call("deposit", ...params))
	.setTimeout(10000)
	.build();

    const sim = await server.simulateTransaction(transaction);

    console.log(sim);
    
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

  <h3>Vault {data.title}</h3>

  <div class="flex">
    <div class="card">
      <div class="card-buttons">
	<button on:click={() => {
	  document.getElementById("card-el-1").style.display = "block"
	  document.getElementById("card-el-2").style.display = "none"
	  }}
	  class="card-button" id="card-button-1">General</button>
	<div class="sep"></div>
	<button on:click={() => {
	  document.getElementById("card-el-2").style.display = "block"
	  document.getElementById("card-el-1").style.display = "none"
	  }} class="card-button logged-only" id="card-button-2">Your liquidity</button>
      </div>
      <div class="card-el" id="card-el-1">
	<p>Token: {data.token_id}</p>
	<p>Flash loan: {data.flash_loan}</p>
	<p>Minted fee shares: {data.shares_total_supply}</p>
	<p>Liquidity: {data.total_liquidity} {data.asset}</p>
	<p>Current yield: {data.current_yield} {data.asset}</p>
      </div>
      <div class="card-el" id="card-el-2">
	<p id="provided-liquidity"></p>
	<p id="total-shares"></p>
	<p id="matured-yield"></p>
      </div>
    </div>
    <div class="single-card">
      <h4>Deposit</h4>
      <input id="amount" placeholder="amount">
      <button on:click={deposit}>Deposit</button>
    </div>
  </div>
  <p id="tx-id"></p>
  
</section>

<style>
  .flex {
    display: flex;
  }
  
  #connect {
    display: none
  }

  .sep {
    width: 6px;
    background: rgba(0,0,0,0.1);
  }

  .card {
    width: 800px;
    height: 250px;
    background: rgba(0,0,0,0.3);
    border-radius: 10px;
    position: relative;
    margin: auto;
    margin-top: 30px;
    margin-bottom: 50px;
    margin-right: 20px;
    margin-left: 20px;
  }
  
  .single-card {
    width: 250px;
    height: 200px;
    background: rgba(0,0,0,0.3);
    border-radius: 10px;
    position: relative;
    margin: auto;
    margin-top: 30px;
    margin-bottom: 50px;
    margin-left: 20px;
    margin-right: 20px;
    text-align: center;
  }

  .single-card input {
    display: block;
    width: 50%;
    background: rgba(255,255,255,0.1);
    border: none;
    font-size: 13px;
    height: 5px;
    outline: 0;
    padding: 15px;
    background-color: #e8eeef;
    color: #8a97a0;
    box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
    margin: auto;
    margin-top: 40px;
    margin-bottom: 20px;
    border-radius: 5px;
	
  }

  .single-card button {
    text-align: center;
    font-style: normal;
    border-radius: 5px;
    font-size: 13px;
    font-weight: bold;
    padding: 5px;
    background: #00ffae;
    width: 50%;
    border: none;
  }
  
  .card-el {
    position: absolute;
    padding-left: 15px;
  }

  #card-el-1 {
    display: block;
  }
  
  #card-el-2 {
    display: none
  }

  .card-buttons {
    display: flex;
  }

  .card-button {
    width: 100%;
    border: none;
    background: #00ffae;
    padding: 10px;
    border-radius: 3px;	
  }

  .logged-only {
    display: none;
  }

  #card-button-2 {
  }

  #batches-message {
    display: none;
  }
</style>
