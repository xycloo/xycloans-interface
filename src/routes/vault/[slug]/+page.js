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

async function get_flash_loan(server, tok_id) {
    const contractId = "7fd59b4aa2c634157a08727406e37dc8b4a4b68c4ea4e747ea4bf17073f18f6e";

    const token_id_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("FlashLoan"), xdr.ScVal.scvObject(xdr.ScObject.scoBytes(Buffer.from(tok_id, 'hex')))]));

    let data = await server.getContractData(contractId, token_id_key);

    let from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().value().toString("hex");

    return val

}

async function get_bal(server, contractId, tokenId) {
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

    console.log(yield_from_xdr.value()._attributes.val.value().value()[0]._attributes.val.value().value()._attributes);
    console.log(yield_from_xdr.value()._attributes.val.value().value()[0]._attributes.val.value().value()._attributes.lo)
    
    let amount = stroops.slice(0, stroops.length - 7) + "." + stroops.slice(stroops.length - 7);

    return amount
}

export async function load({ params }) {
    let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
    const contractId = params.slug;

    let token_id_resp = await get_token_id(server, contractId);
    let totsupp_resp = await get_tot_supply(server, contractId);
    let current_yield = await get_bal(server, contractId, token_id_resp);
    let flash_loan = await get_flash_loan(server, token_id_resp);
    let total_liquidity = await get_bal(server, flash_loan, token_id_resp);
/*
    let test_pk = "GA4CK2DWNOSSKQMXUBKUTTFUQR7G64SGT4ZGY2WMNBITLWAP7G35FLQC"
    const buf = StrKey.decodeEd25519PublicKey(test_pk)
    
    const mypk_key = xdr.ScVal.scvObject(xdr.ScObject.scoVec([xdr.ScVal.scvSymbol("Balance"), xdr.ScVal.scvObject(
	xdr.ScObject.scoAddress(
	    xdr.ScAddress.scAddressTypeAccount(
		xdr.PublicKey.publicKeyTypeEd25519(buf)
	    )
	)
    )]));

    console.log(token_id_resp);
    console.log(mypk_key);
    let pk_resp = server.getContractData(token_id_resp, mypk_key).then(resp => {
	console.log(resp)
    });

  */  
//    let pk_from_xdr = SorobanClient.xdr.LedgerEntryData.fromXDR(pk_resp.xdr, 'base64');
    
    return {
	title: contractId,
	token_id: token_id_resp,
	shares_total_supply: totsupp_resp,
	current_yield: current_yield,
	asset: TOKENS_MAP[token_id_resp],
	flash_loan: flash_loan,
	total_liquidity: total_liquidity,
    }
    
    throw error(404, 'Not found');
}
