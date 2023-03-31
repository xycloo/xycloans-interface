// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
import { error } from '@sveltejs/kit';
import SorobanClient from "soroban-client";
import { xdr, StrKey } from "soroban-client";
import { Buffer } from 'buffer';
import { TOKENS, TOKENS_MAP } from "./TOKENS";

export const prerender = true;


