import { error } from '@sveltejs/kit';
import SorobanClient from "soroban-client";
import {xdr} from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../TOKENS";
import {load_vaults} from "../../soroban-helpers";


export async function load({ params }) {
  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
  const contractId = "e6a71d5cc69710aa8b9405752210fac3ca734583efaea28631ae20d6aa14a0d6";

  const vaults = await load_vaults(server);

  console.log(vaults);
  
  return {
    title: contractId,
    vaults: vaults,
  }

  throw error(404, 'Not found');
}

