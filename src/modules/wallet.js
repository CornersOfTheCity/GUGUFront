// ═══════════════════════════════════════════
//          钱包连接模块
// ═══════════════════════════════════════════

import { BrowserProvider } from 'ethers';
import { CHAIN_ID, CHAIN_NAME, CHAIN_RPC, CHAIN_EXPLORER, CHAIN_CURRENCY } from '../config/contracts.js';

let provider = null;
let signer = null;
let currentAddress = null;
let listeners = [];

/**
 * 注册钱包状态变更监听
 */
export function onWalletChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => cb({ address: currentAddress, connected: !!currentAddress }));
}

/**
 * 检测是否有 MetaMask
 */
export function hasMetaMask() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * 连接钱包
 */
export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error('请安装 MetaMask 钱包扩展');
  }

  provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  signer = await provider.getSigner();
  currentAddress = await signer.getAddress();

  // 检查链 ID
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
      });
      // 重新获取 provider/signer
      provider = new BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      currentAddress = await signer.getAddress();
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x' + CHAIN_ID.toString(16),
              chainName: CHAIN_NAME,
              rpcUrls: [CHAIN_RPC],
              blockExplorerUrls: [CHAIN_EXPLORER],
              nativeCurrency: {
                name: CHAIN_CURRENCY || 'ETH',
                symbol: CHAIN_CURRENCY || 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }

  // 监听事件
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', () => window.location.reload());

  notifyListeners();
  return currentAddress;
}

/**
 * 断开钱包
 */
export function disconnectWallet() {
  provider = null;
  signer = null;
  currentAddress = null;
  notifyListeners();
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else {
    currentAddress = accounts[0];
    if (provider) {
      provider.getSigner().then((s) => {
        signer = s;
        notifyListeners();
      });
    }
  }
}

// ── Getters ──

export function getProvider() {
  return provider;
}

export function getSigner() {
  return signer;
}

export function getAddress() {
  return currentAddress;
}

export function isConnected() {
  return !!currentAddress;
}

/**
 * 格式化地址: 0x1234...abcd
 */
export function formatAddress(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
