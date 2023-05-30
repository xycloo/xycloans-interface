import { error } from '@sveltejs/kit';
import * as SorobanClient from "soroban-client";
import {xdr} from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "../TOKENS";
import {load_vaults} from "../../lender_utils";


export async function load({ params }) {
  let server = new SorobanClient.Server("https://rpc-futurenet.stellar.org/")
  const contractId = "f4f568f344a139c919faef4243c42c635312a16eb2d434035782ad7eb899cb20";

  const vaults = await load_vaults(server);

  console.log(vaults);
  
  return {
    title: contractId,
    vaults: vaults,
  }

  throw error(404, 'Not found');
}

