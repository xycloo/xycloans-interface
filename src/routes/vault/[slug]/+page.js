import { error } from '@sveltejs/kit';
import SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../../TOKENS";

function accountIdentifier(account) {
    const buf = Buffer.from(account);
    return xdr.ScVal.scvObject(
	xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeContract(
		xdr.ContractIdType.contractIdFromEd25519PublicKey(account)
	    )
	)
    )
}

async function get_token_id(server, contractId) {
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("TokenId")]))
    let data = await server.getContractData(contractId, key)
    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');

    return from_xdr.value()._attributes.val.value().value().toString("hex")
}

async function get_tot_supply(server, contractId) {
    const key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("TotSupply")]))

    let resp = server.getContractData(contractId, key).then(data => {
	let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
	let val = from_xdr.value()._attributes.val.value().value().lo().toString();

	return val
    });

    return resp
}

async function get_current_yield(server, contractId, tokenId) {
    const vault_current_yield_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Balance"), xdr.ScVal.scvObject(
	xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeContract(
		Buffer.from(contractId, "hex")
	    )
	)
    )]));
    
    let yield_resp = await server.getContractData(tokenId, vault_current_yield_key);
    let yield_from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(yield_resp.xdr, 'base64');
    return yield_from_xdr.value()._attributes.val.value().value()[0]._attributes.val.value().value()._attributes.lo.toString()
}

export async function load({ params }) {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
    const contractId = params.slug;

    let token_id_resp = await get_token_id(server, contractId);
    let totsupp_resp = await get_tot_supply(server, contractId);
    let current_yield = await get_current_yield(server, contractId, token_id_resp);

    return {
	title: contractId,
	token_id: token_id_resp,
	shares_total_supply: totsupp_resp,
	current_yield: current_yield,
	asset: TOKENS_MAP[token_id_resp]
    }
    
    throw error(404, 'Not found');
}
