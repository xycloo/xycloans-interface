import {get_contract_bal} from "./soroban-helpers";
import * as SorobanClient from "soroban-client";
import {StrKey, xdr} from "soroban-client";
import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "./routes/TOKENS";
import { onMount } from 'svelte';
import {PUBLIC_PROXY} from '$env/static/public'


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


export async function get_user_vaults(server, lender) {
  let user_vaults = [];
  let vaults = await load_vaults(server);

  for (let vault of vaults) {
    let lender_obj = await get_lender(server, vault[0], vault[1], lender);
    if (lender_obj.deposit != 0) {
      user_vaults.push(lender_obj);
    }
  }

  return user_vaults
}

export async function load_vaults(server) {
  const contractId = PUBLIC_PROXY;
  let vaults = [];

  for (let tok_id of TOKENS) {

    const token_id_key = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Vault"), 
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(
          Buffer.from(tok_id, "hex")
        )
      )
    ]);
    
    let data = await server.getContractData(contractId, token_id_key);

    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().value().toString("hex");
    console.log(val);
    vaults.push([val, TOKENS_MAP[tok_id]]);
  }

  return vaults
}


export async function get_lender(server, vault, asset, lender_public) {
  let obj = {
    id: vault,
    asset: asset,
    deposit: 0,
    matured: 0
  }
  
  try {
    obj.deposit = await get_lender_shares(server, vault, lender_public) / 10000000;
    obj.matured = await get_lender_rewards(server, vault, lender_public);
  } catch (e) {
  }
  
  return obj
}
