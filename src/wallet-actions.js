import {PUBLIC_TEST_SECRET, PUBLIC_PROXY} from '$env/static/public'
import {get_lender_shares, get_lender_rewards} from "./lender_utils";
import * as SorobanClient from "soroban-client";
import {StrKey, xdr} from "soroban-client";
import { Buffer } from 'buffer';
import { StellarWalletsKit, WalletNetwork, WalletType } from 'stellar-wallets-kit';


export async function deposit(tokenIdAddress) {
  const kit = new StellarWalletsKit({
    network: WalletNetwork.FUTURENET,
    selectedWallet: WalletType.XBULL
  });

  const public_key = await kit.getPublicKey();


  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

  let { sequence } = await server.getAccount(public_key);

  let str_amount = document.getElementById("amount").value; // not in stroops
  let stroops = BigInt(parseInt(str_amount) * 1e7);
  
  
  const amount = new xdr.Int128Parts({
    lo: xdr.Uint64.fromString((Number(stroops & BigInt(0xFFFFFFFFFFFFFFFFn))).toString()),
    hi: xdr.Int64.fromString((Number((stroops >> BigInt(64)) & BigInt(0xFFFFFFFFFFFFFFFFn))).toString()),
  })

  let account = new SorobanClient.Account(public_key, (sequence).toString());
  
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
        Buffer.from(tokenIdAddress, "hex")
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


export async function withdraw(tokenIdAddress) {
  const kit = new StellarWalletsKit({
    network: WalletNetwork.FUTURENET,
    selectedWallet: WalletType.XBULL
  });

  const public_key = await kit.getPublicKey();


  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

  let { sequence } = await server.getAccount(public_key);

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
        Buffer.from(tokenIdAddress, "hex")
      )
    ),
    xdr.ScVal.scvI128(
      amount
    )
  ];

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


export  async function update_rewards(vaultAddress) {
  const kit = new StellarWalletsKit({
    network: WalletNetwork.FUTURENET,
    selectedWallet: WalletType.XBULL
  });

  const public_key = await kit.getPublicKey();

  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

  let { sequence } = await server.getAccount(public_key);

  let account = new SorobanClient.Account(public_key, (sequence).toString());
  
  const contract = new SorobanClient.Contract(vaultAddress);
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

export async function collect_rewards(vaultAddress) {
  const kit = new StellarWalletsKit({
    network: WalletNetwork.FUTURENET,
    selectedWallet: WalletType.XBULL
  });

  const public_key = await kit.getPublicKey();

  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/");

  let { sequence } = await server.getAccount(public_key);

  let account = new SorobanClient.Account(public_key, (sequence).toString());
  
  const contract = new SorobanClient.Contract(vaultAddress);
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
