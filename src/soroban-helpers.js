import * as SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';
import {get_lender_shares, update_rewards, get_lender_rewards} from "./lender_utils";
import { TOKENS, TOKENS_MAP } from "./routes/TOKENS";


export async function get_contract_bal(server, contractId, tokenId) {
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

  return stroops
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
  const contractId = "f4f568f344a139c919faef4243c42c635312a16eb2d434035782ad7eb899cb20";
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


