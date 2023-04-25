import { error } from '@sveltejs/kit';
import SorobanClient from "soroban-client";
import {xdr} from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../TOKENS";

async function load_vaults() {
  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
  const contractId = "e2c37af75db0e7975360b13678f3dd3b733f2341019003b4b3692cd173111423";
  let vaults = [];


  
  for (let tok_id of TOKENS) {
    const token_id_key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Vault"), xdr.ScVal.scvBytes(Buffer.from(tok_id, 'hex'))]);
    
    let data = await server.getContractData(contractId.toString(), token_id_key);    
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    
    let val = from_xdr.value()._attributes.val.value().toString("hex");
    
    vaults.push([val, TOKENS_MAP[tok_id]]);
  }

  return vaults
}

export async function load({ params }) {
  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
  const contractId = "e2c37af75db0e7975360b13678f3dd3b733f2341019003b4b3692cd173111423";
  let vaults = await load_vaults();

  return {
    title: contractId,
    vaults: vaults,
  }

  throw error(404, 'Not found');
}
