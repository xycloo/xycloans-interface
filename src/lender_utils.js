import {get_contract_bal} from "./soroban-helpers";
  import SorobanClient from "soroban-client";
  import {StrKey, xdr} from "soroban-client";
  import {xBullWalletConnect}  from '@creit-tech/xbull-wallet-connect';
  import { Buffer } from 'buffer';

  import { onMount } from 'svelte';

  import {xdr as js_xdr} from 'js-xdr'


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
