import { createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';

const STORAGE_KEYS = {
  WALLET_ADDRESS: 'anima_wallet_address',
  CHAIN_ID: 'anima_chain_id',
};

let client = null;
let activeAccount = null;

export function getClient() {
  if (client) return client;
  const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    console.warn('Missing VITE_THIRDWEB_CLIENT_ID');
    return null;
  }
  client = createThirdwebClient({ clientId });
  return client;
}

export function getSupportedChains() {
  return [base];
}

export function isWalletConnected() {
  return !!activeAccount || !!localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
}

export function getWalletAddress() {
  if (activeAccount?.address) return activeAccount.address;
  return localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
}

export function setActiveAccount(account) {
  activeAccount = account;
  if (account?.address) {
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, account.address);
  }
}

export function clearWalletConnection() {
  activeAccount = null;
  localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
  localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
}
