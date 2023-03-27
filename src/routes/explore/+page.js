import { error } from '@sveltejs/kit';
import SorobanClient from "soroban-client";
import {xdr} from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../TOKENS";

async function load_vaults() {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
    const contractId = "7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e";
    let vaults = [];

    for (let tok_id of TOKENS) {

	const token_id_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Vault"), xdr.ScVal.scvObject(xdr.ScObject.scoBytes(Buffer.from(tok_id, 'hex')))]));

	let data = await server.getContractData(contractId, token_id_key);

	let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
	let val = from_xdr.value()._attributes.val.value().value().toString("hex");
	vaults.push([val, TOKENS_MAP[tok_id]]);
    }

    return vaults
}

export async function load({ params }) {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
    const contractId = "7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e";
    let vaults = await load_vaults();

    return {
	title: contractId,
	vaults: vaults,
    }
    
    throw error(404, 'Not found');
}
