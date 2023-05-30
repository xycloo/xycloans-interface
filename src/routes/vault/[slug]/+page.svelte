<script>
  export let data;
  import {get_contract_bal} from "../../../soroban-helpers";
  import {get_lender_shares, get_lender_rewards} from "../../../lender_utils";
  import * as SorobanClient from "soroban-client";
  import {StrKey, xdr} from "soroban-client";
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import { Buffer } from 'buffer';
  import { StellarWalletsKit, WalletNetwork, WalletType } from 'stellar-wallets-kit';

  import { onMount } from 'svelte';

  //import * as js_xdr from 'js-xdr'
  import {PUBLIC_TEST_SECRET, PUBLIC_PROXY} from '$env/static/public'


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
      console.log(initial_deposit);
      let matured = await get_lender_rewards(server, data.title, lender);
      
      document.getElementById("shares-withdraw-indicator").innerHTML = "<strong>Your shares</strong>:  " + initial_deposit.toString();
      document.getElementById("shares").innerHTML = "<strong>Shares balance</strong>: " + initial_deposit.toString();
      document.getElementById("deposited").innerHTML = `<strong>Deposited</strong>: ${(initial_deposit / 10000000).toString()} ${data.asset}`;
      document.getElementById("matured").innerHTML = "<strong>Matured rewards</strong>: " + matured.toString() + ` ${data.asset}`;

      //      document.getElementById("total-shares").innerText = "Total shares: " + total_shares.toString() + ` (${Math.round((percentage + Number.EPSILON) * 100) / 100}% of total shares)`;
      //      document.getElementById("matured-yield").innerText = "Matured yield: " + (total_matured/10000000).toString()  + " " + data.asset;
    } catch (e) {
      document.getElementById("deposited").innerText = "Not a lender for this pool";
      //      document.getElementById("batches-message").style.display = "block";
      //      document.getElementById("batches-message").innerText = "Not a lender for this pool";
    }
  });


  async function deposit() {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.FUTURENET,
      selectedWallet: WalletType.XBULL
    });

    const public_key = await kit.getPublicKey();


    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);

    let str_amount = document.getElementById("amount").value;
    console.log(xdr);
    const amount = new xdr.Int128Parts({
      lo: xdr.Uint64.fromString(str_amount),
      hi: xdr.Int64.fromString("0"),
    })

    let account = new SorobanClient.Account(public_key, (sequence).toString());
    
    const contract = new SorobanClient.Contract(PUBLIC_PROXY);
    const fee = 100;

    //    const buf = StrKey.decodeEd25519PublicKey(public)

    const buf = StrKey.decodeEd25519PublicKey(public_key);
    let params = [
      xdr.ScVal.scvAddress(
	xdr.ScAddress.scAddressTypeAccount(
	  xdr.PublicKey.publicKeyTypeEd25519(buf)
	)
      ),
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(
          Buffer.from(data.token_id, "hex")
        )
      ),
      xdr.ScVal.scvI128(
	amount
      )
    ];

    let transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET,
      v1: true
    })
	.addOperation(contract.call("deposit", ...params))
	.setTimeout(10000)
	.build();

    
    const simulation = await server.simulateTransaction(transaction);
    const s_transaction = SorobanClient.assembleTransaction(transaction, SorobanClient.Networks.FUTURENET, simulation);

    console.log(s_transaction.toXDR());
    
    const { signedXDR } = await kit.sign({
      xdr: s_transaction.toXDR(),
      public_key,
    });

    let signed_tx = xdr.TransactionEnvelope.fromXDR(signedXDR, "base64");
    let newsig = Buffer.from(signed_tx._value._attributes.signatures[0]._attributes.signature).toString("base64");
    s_transaction.addSignature(public_key, newsig);

    server.sendTransaction(s_transaction).then(result => {
      document.getElementById("tx-id").innerText = "depositing ... tx id is " + result.hash;
      console.log("id:", result);
      console.log("error:", result.error);
    });
    
  }

  
  async function withdraw() {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.FUTURENET,
      selectedWallet: WalletType.XBULL
    });

    const public_key = await kit.getPublicKey();


    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);
    console.log(sequence);

    let str_amount = document.getElementById("withdraw-amount").value;
    const amount = new xdr.Int128Parts({
      lo: xdr.Uint64.fromString(str_amount),
      hi: xdr.Int64.fromString("0"),
    })

    let account = new SorobanClient.Account(public_key, sequence.toString());
    
    const contract = new SorobanClient.Contract(PUBLIC_PROXY);
    const fee = 100;

    const buf = StrKey.decodeEd25519PublicKey(public_key);
    let params = [
      xdr.ScVal.scvAddress(
	xdr.ScAddress.scAddressTypeAccount(
	  xdr.PublicKey.publicKeyTypeEd25519(buf)
	)
      ),
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(
          Buffer.from(data.token_id, "hex")
        )
      ),
      xdr.ScVal.scvI128(
	amount
      )
    ];

    console.log(PUBLIC_TEST_SECRET);
    console.log(public_key);
    
    let transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET
    })
	.addOperation(contract.call("withdraw_liquidity", ...params))
	.setTimeout(10000)
	.build();

    const simulation = await server.simulateTransaction(transaction);
    const s_transaction = SorobanClient.assembleTransaction(transaction, SorobanClient.Networks.FUTURENET, simulation);

    const { signedXDR } = await kit.sign({
      xdr: s_transaction.toXDR(),
      public_key,
    });

    let signed_tx = xdr.TransactionEnvelope.fromXDR(signedXDR, "base64");
    let newsig = Buffer.from(signed_tx._value._attributes.signatures[0]._attributes.signature).toString("base64");
    s_transaction.addSignature(public_key, newsig);
    
    server.sendTransaction(s_transaction).then(result => {

      document.getElementById("tx-id").innerText = "withdrawing liquidity position ... tx id is " + result.hash;
      
      console.log("id:", result);
      console.log("error:", result.error);
    });
  }

  async function update_rewards() {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.FUTURENET,
      selectedWallet: WalletType.XBULL
    });

    const public_key = await kit.getPublicKey();

    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);

    let account = new SorobanClient.Account(public_key, (sequence).toString());
    
    const contract = new SorobanClient.Contract(data.title);
    const fee = 100;

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

    const simulation = await server.simulateTransaction(transaction);

    console.log(simulation);
    
    if (simulation.error != null) {
      	document.getElementById("tx-id").innerText = "error processing update rewards request.";
    } else {
      
      const s_transaction = SorobanClient.assembleTransaction(transaction, SorobanClient.Networks.FUTURENET, simulation);

      const { signedXDR } = await kit.sign({
	xdr: s_transaction.toXDR(),
	public_key,
      });

      let signed_tx = xdr.TransactionEnvelope.fromXDR(signedXDR, "base64");
      let newsig = Buffer.from(signed_tx._value._attributes.signatures[0]._attributes.signature).toString("base64");
      s_transaction.addSignature(public_key, newsig);
      
      server.sendTransaction(s_transaction).then(result => {

	document.getElementById("tx-id").innerText = "updating rewards ... tx id is " + result.hash;
	
	console.log("id:", result);
	console.log("error:", result.error);
      });
    }

  }
  

  /*  async function update_rewards() {

      const bridge = new xBullWalletConnect();
      const public_key = await bridge.connect();

      let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

      let { sequence } = await server.getAccount(public_key);
      let account = new SorobanClient.Account(public_key, (sequence - 1).toString());

      const contract = new SorobanClient.Contract(data.title);
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

      document.getElementById("tx-id").innerText = "updating rewards ... tx id is " + result.id;
      
      console.log("id:", result);
      console.log("error:", result.error);
      });
      
      
      bridge.closeConnections();

      }*/

  async function collect_rewards() {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.FUTURENET,
      selectedWallet: WalletType.XBULL
    });

    const public_key = await kit.getPublicKey();

    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

    let { sequence } = await server.getAccount(public_key);

    let account = new SorobanClient.Account(public_key, (sequence).toString());
    
    const contract = new SorobanClient.Contract(data.title);
    const fee = 100;

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
	.addOperation(contract.call("withdraw_matured", ...params))
	.setTimeout(10000)
	.build();

    const simulation = await server.simulateTransaction(transaction);

    console.log(simulation);
    
    if (simulation.error != null) {
      document.getElementById("tx-id").innerText = "No fees to collect";
    } else {
      
      const s_transaction = SorobanClient.assembleTransaction(transaction, SorobanClient.Networks.FUTURENET, simulation);

      const { signedXDR } = await kit.sign({
	xdr: s_transaction.toXDR(),
	public_key,
      });

      let signed_tx = xdr.TransactionEnvelope.fromXDR(signedXDR, "base64");
      let newsig = Buffer.from(signed_tx._value._attributes.signatures[0]._attributes.signature).toString("base64");
      s_transaction.addSignature(public_key, newsig);
      
      server.sendTransaction(s_transaction).then(result => {

	document.getElementById("tx-id").innerText = "collecting rewards ... tx id is " + result.hash;
	
	console.log("id:", result);
	console.log("error:", result.error);
      });
    }

  }
  
</script>

<svelte:head>
  <title>Xycloans</title>
  <meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>

  <h2>${data.asset} vault</h2>
  <p class="small-subtitle">{data.title}</p>
  
  <div class="flex" id="content">
    <div>
      <div class="card-buttons" id="control-btns">
	<button on:click={() => {
	  document.getElementById("card-button-1").classList.add("active");
	  document.getElementById("card-button-2").classList.remove("active");
	  
	  document.getElementById("card-el-1").style.display = "block"
	  document.getElementById("card-el-2").style.display = "none"
	  }}
	  class="card-button active" id="card-button-1">Overview</button>
	<div class="sep"></div>
	<button on:click={() => {
	  document.getElementById("card-button-2").classList.add("active");
	  document.getElementById("card-button-1").classList.remove("active");
	  
	  document.getElementById("card-el-2").style.display = "block"
	  document.getElementById("card-el-1").style.display = "none"
	  }} class="card-button logged-only" id="card-button-2">Your info</button>
      </div>

      <div class="flex">
	<div class="card">
	  <div class="card-el" id="card-el-1">
	    <p><strong>Token</strong>: {data.token_id}</p>
	    <p><strong>Flash loan</strong>: {data.flash_loan}</p>
	    <p><strong>Total supply</strong>: {data.shares_total_supply}</p>
	    <p><strong>Liquidity</strong>: {data.total_liquidity} {data.asset}</p>
	    <p><strong>Current yield</strong>: {data.current_yield} {data.asset}</p>
	    
	  </div>
	  <div class="card-el" id="card-el-2">
	    <p id="shares"></p>
	    <p id="deposited"></p>
	    <p id="matured"></p>
	    <p id="total-shares"></p>
	  </div>
	  
	</div>

	<div class="block">
	  <div class="single-card">
	    <div class="card-buttons-small">
	      <button on:click={() => {
		document.getElementById("card-button-3").classList.add("small-active");
		document.getElementById("card-button-4").classList.remove("small-active");
		document.getElementById("card-el-3").style.display = "block"
		document.getElementById("card-el-4").style.display = "none"
		}}
		class="card-button small-active small-btn" id="card-button-3">Deposit</button>
	      <div class="sep"></div>
	      <button on:click={() => {
		document.getElementById("card-button-4").classList.add("small-active");
		document.getElementById("card-button-3").classList.remove("small-active");
		document.getElementById("card-el-4").style.display = "block"
		document.getElementById("card-el-3").style.display = "none"
		}} class="card-button small-btn logged-only" id="card-button-4">Withdraw</button>
	    </div>


	    <div class="card-el" id="card-el-3">
	      <input id="amount" placeholder="0" type="number">
	      <button on:click={deposit}>Deposit</button>
	    </div>
	    <div class="card-el" id="card-el-4">
	      <input id="withdraw-amount" placeholder="0" type="number">
	      <p id="shares-withdraw-indicator"></p>
	      <button on:click={withdraw}>Withdraw</button>
	    </div>

	  </div>

	</div>
	
      </div>
      <div id="rewards-banner">

	<div style="max-width: 64rem; margin: auto">
	  <div class="flex" style="width: 300px; position: relative; margin-left: 20px">
	    <button class="action-btn" id="update-rewards" on:click={() => update_rewards(data.title)}>Update rewards</button>
	    <div style="width: 40px;"></div>
	    <button class="action-btn" id="update-rewards" on:click={collect_rewards}>Collect rewards</button>
	  </div>
	</div>
      </div> 
    </div>
  </div>
  <p id="tx-id"></p>
  
</section>

<style>

  #rewards-banner {
    border-radius: 10px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    width: 100vw;
    background-color: #F1F1F3;

  }
  
  h2 {
    font-size: 1.8em;
  }

  .small-subtitle {
    font-size: .9em;
  }

  .flex {
    display: flex;
  }

  .block {
    display: block;
  }
  
  #connect {
    display: none
  }

  #content {
    margin-top: 50px;
  }

  .sep {
    width: 10px;
  }

  #control-btns {
    margin-bottom: 25px;
  }
  
  .card {
    width: 700px;
    height: 250px;

    border-radius: 10px;
    position: relative;
    margin: auto;

    margin-bottom: 20px;
    margin-right: 100px;
    margin-left: 0px;
  }
  
  .single-card {
    width: 92%;
    margin-top: 0px;
    padding: 10px;
    background: #fff;
    border-radius: 10px;
  }

  .single-card p {
    font-size: .8rem;
    color: #7c7c7c;
  }

  .single-card input {
    display: block;
    width: 95%;
    border: none;
    font-size: 20px;
    height: 50px;
    outline: 0;
    background-color: #f7f7f7;
    color: #7c7c7c;
    margin: auto;
    padding-left: 10px;
    margin-top: 10px;
    margin-bottom: 8px;
    border-radius: 5px;
    
  }

  .card-el button {
    text-align: center;
    font-style: normal;
    border-radius: 5px;
    font-size: 13px;
    font-weight: bold;
    padding: 5px;
    font-size: 0.8rem;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 0px 0px 0px #fff inset;
    color: white;
    width: 100%;
    height: 40px;
  }

  .card-el button:hover {
    text-align: center;
    font-style: normal;
    border-radius: 5px;
    font-size: 13px;
    font-weight: bold;
    padding: 5px;
    font-size: 0.8rem;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 2px 1000px 1px #fff inset;
    color: black;
    width: 100%;
    height: 40px;
  }

  .action-btn {
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
    box-shadow: 2px 1000px 1px #fff inset;
    width: 50%;
    transition: color 0.1s linear;
  }

  .action-btn:hover {
    color: white;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 0px 0px 0px #fff inset;
  }

  
  #update-rewards {
    margin-top: 20px;
    width: 100%;
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

  #card-el-3 {
    display: block;
    position: relative;
    padding-left: 0px;
  }
  
  #card-el-4 {
    display: none;
    position: relative;
    padding-left: 0px;
  }


  .card-buttons {
    display: flex;
    width: 200px;
    background: #fff;
    padding: 10px;
    border-radius: 10px;
  }

  .card-buttons-small {
    display: flex;
    width: 100%;
    background: #fff;
    border-radius: 10px;
    margin:auto;
  }


  .card-buttons button {
    font-weight: 600;
  }

  .card-buttons-small button {
    font-weight: 600;
  }

  
  .card-button {
    width: 100%;
    border: none;
    background: #fff;
    color: #000;
    padding: 5px;
    border-radius: 3px;	
  }

  .small-btn {
    font-size: 0.8rem;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 2px 1000px 1px #fff inset;
  }
  .small-active {
    font-size: 0.8rem;
    border: solid 3px transparent;
    background-image: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa);
    background-origin: border-box;
    background-clip: content-box, border-box;
    box-shadow: 0px 0px 0px #fff inset;
    color: white;
  }
  

  
  
  .active {
    background: #00ffae;
    color: #000000;
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
