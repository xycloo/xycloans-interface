<script>
  export let data;
  import {get_contract_bal} from "../../../soroban-helpers";
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
    
    let initial_deposit = await get_initial_deposit(server, data.title, lender);
    const increment = await get_increment(server, data.title, lender); 
    let batches = [];
    for (let i=0; i < increment; i++) {
      let batch = await get_batch(server, data.title, lender, i);
      console.log(batch);
      batches.push(batch)
    }
    console.log(parseInt(data.total_liquidity * 10000000) + parseInt(data.current_yield * 10000000));
    const total_shares = get_total_shares(batches);
    const percentage = total_shares * 100 / parseInt(data.shares_total_supply);
    const pool_balance = parseInt(data.total_liquidity * 10000000) + parseInt(data.current_yield * 10000000);
    let total_matured = 0;
    for (let batch of batches) {
      total_matured += compute_matured_batch(batch, data.shares_total_supply, pool_balance);
    }

    document.getElementById("provided-liquidity").innerText = "Deposited: " + initial_deposit.toString() + " " + data.asset;
    document.getElementById("total-shares").innerText = "Total shares: " + total_shares.toString() + ` (${Math.round((percentage + Number.EPSILON) * 100) / 100}% of total shares)`;
    document.getElementById("matured-yield").innerText = "Matured yield: " + (total_matured/10000000).toString()  + " " + data.asset;
  });

  function get_total_shares(batches) {
    const total_shares = batches.reduce((accumulator, object) => {
      return accumulator + parseInt(object.current_shares);
    }, 0);

    return total_shares
  }
  
  function compute_matured_batch(batch, tot_supply, balance) {
    const current_shares = parseInt(batch.current_shares);
    const deposit = parseInt(batch.deposit);
    const initial_shares = parseInt(batch.initial_shares);
    
    return Math.abs(parseInt(((balance * parseInt(current_shares)) / tot_supply) - (parseInt(deposit) * (parseInt(current_shares) / parseInt(initial_shares)))));
  }

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

  <h3>Vault {data.title}</h3>

  <div class="flex">
    <div class="card">
      <div class="card-buttons">
	<button on:click={() => {
	  document.getElementById("card-el-1").style.display = "block"
	  document.getElementById("card-el-2").style.display = "none"
	  }}
	  class="card-button">General</button>
	<div class="sep"></div>
	<button on:click={() => {
	  document.getElementById("card-el-2").style.display = "block"
	  document.getElementById("card-el-1").style.display = "none"
	  }} class="card-button logged-only">Your liquidity</button>
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

  <div class="logged-only" id="batches">
      <h3>Your fee batches</h3>
  </div>

</section>

<style>
  .flex {
    display: flex;
  }
  
  #connect {
    display: none
  }

  .sep {
    width: 3px;
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
    width: 200px;
    height: 250px;
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
    width: 100px;
    margin: auto;
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
    background: rgba(0,0,0,0.4);
    color: white;
    padding: 10px;
  }

  .logged-only {
    display: none;
  }
</style>
