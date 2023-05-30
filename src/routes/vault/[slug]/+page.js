import { error } from '@sveltejs/kit';
import { Server } from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../../TOKENS";
import {PUBLIC_PROXY} from '$env/static/public'


function accountIdentifier(account) {
  const buf = Buffer.from(account);
  return xdr.ScVal.scvAddress(
    xdr.ScAddress.scAddressTypeContract(
      xdr.ContractIdType.contractIdFromEd25519PublicKey(account)
    )
  )
}

async function get_token_id(server, contractId) {
  const key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("TokenId")])
  let data = await server.getContractData(contractId, key)
  let from_xdr = xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');

  return from_xdr.value()._attributes.val.value().value().toString("hex")
}

async function get_vault_id(server, contractId) {
  const key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("FlashLoan")])
  let data = await server.getContractData(contractId, key)
  let from_xdr = xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');

  return from_xdr.value()._attributes.val.value().value().toString("hex")
}


async function get_tot_supply(server, contractId) {
  const key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("TotSupply")])
  
  let tot_supp;
  
  try {
    let data = await server.getContractData(contractId, key);
    let from_xdr = xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
    let val = from_xdr.value()._attributes.val.value().lo().toString();

    tot_supp = val

  } catch (e) {
    tot_supp = 0
  }


  return tot_supp
}

async function get_flash_loan(server, tok_id) {
  const token_id_key = xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol("FlashLoan"), 
          xdr.ScVal.scvAddress(
            xdr.ScAddress.scAddressTypeContract(
              Buffer.from(tok_id, "hex")
            )
          )
    ]);

  let data = await server.getContractData(PUBLIC_PROXY, token_id_key);

  let from_xdr = xdr.LedgerEntryData.fromXDR(data.xdr, 'base64');
  let val = from_xdr.value()._attributes.val.value().value().toString("hex");

  return val

}

async function get_bal(server, contractId, tokenId) {
  const vault_current_yield_key = xdr.ScVal.scvVec(
    [xdr.ScVal.scvSymbol("Balance"), 
     xdr.ScVal.scvAddress(
       xdr.ScAddress.scAddressTypeContract(
	 Buffer.from(contractId, "hex")
       )
     )
    ]);

  let amount;
  try {
    let yield_resp = await server.getContractData(tokenId, vault_current_yield_key);
    let yield_from_xdr = xdr.LedgerEntryData.fromXDR(yield_resp.xdr, 'base64');
    let stroops = yield_from_xdr.value()._attributes.val.value()[0]._attributes.val.value()._attributes.lo.toString();
    amount = parseInt(stroops);
  } catch (e) {
    amount = 0
  }

  return amount
}

export async function load({ params }) {
  let server = new Server("https://rpc-futurenet.stellar.org/")
  const contractId = params.slug;
  let token_id_resp = await get_token_id(server, contractId);
  let totsupp_resp = await get_tot_supply(server, contractId);
  let current_yield = await get_bal(server, contractId, token_id_resp);
  let flash_loan = await get_flash_loan(server, token_id_resp);
  let total_liquidity = await get_bal(server, flash_loan, token_id_resp);

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
