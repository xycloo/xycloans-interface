import SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';


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

