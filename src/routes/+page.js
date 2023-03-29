// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
import { StellarWalletsKit, WalletNetwork, WalletType } from 'stellar-wallets-kit';
import { browser } from '$app/environment'

export const prerender = true;

