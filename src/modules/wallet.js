// ═══════════════════════════════════════════
//          钱包连接模块
// ═══════════════════════════════════════════

import { BrowserProvider } from 'ethers';
import { CHAIN_ID, CHAIN_NAME, CHAIN_RPC, CHAIN_EXPLORER, CHAIN_CURRENCY } from '../config/contracts.js';

const DISCONNECT_KEY = 'gugu_wallet_disconnected';

let provider = null;
let signer = null;
let currentAddress = null;
let listeners = [];
let isConnecting = false; // 防止 chainChanged 在连接过程中触发 reload

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
 * 初始化 MetaMask 事件监听（仅注册一次）
 */
let eventsInitialized = false;
function initEvents() {
  if (eventsInitialized || !hasMetaMask()) return;
  eventsInitialized = true;

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', () => {
    // 如果正在连接过程中（切换链），不做 reload
    if (isConnecting) return;
    window.location.reload();
  });
}

/**
 * 连接钱包
 */
export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error('请安装 MetaMask 钱包扩展');
  }

  isConnecting = true;

  try {
    // 初始化事件监听（提前注册，避免连接过程中的事件丢失）
    initEvents();

    // 主动连接时清除断开标记
    localStorage.removeItem(DISCONNECT_KEY);

    // 直接使用 window.ethereum.request 请求账户（比 provider.send 更可靠）
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到钱包地址');
    }
    currentAddress = accounts[0];

    // 立即通知，UI 先显示地址
    notifyListeners();

    // 检查链 ID
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex, 16);

    if (currentChainId !== CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
        });
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

      // 链切换后等待 MetaMask 完成内部状态更新
      await new Promise((r) => setTimeout(r, 500));
    }

    // 链已正确后，创建 provider/signer
    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    currentAddress = await signer.getAddress();

    notifyListeners();
    return currentAddress;
  } finally {
    isConnecting = false;
  }
}

/**
 * 断开钱包
 */
export function disconnectWallet() {
  provider = null;
  signer = null;
  currentAddress = null;
  // 标记为主动断开，防止刷新后自动重连
  localStorage.setItem(DISCONNECT_KEY, '1');
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

export async function ensureSigner() {
  if (!signer && provider) {
    signer = await provider.getSigner();
  }
  return signer;
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

/**
 * 页面加载时自动重连 (如果已授权过，不弹窗)
 */
export async function tryAutoConnect() {
  if (!hasMetaMask()) return;

  // 如果用户主动断开过，不自动重连
  if (localStorage.getItem(DISCONNECT_KEY)) {
    initEvents();
    return;
  }

  try {
    // eth_accounts 不会弹出授权窗口，仅获取已授权的账户
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      provider = new BrowserProvider(window.ethereum);
      currentAddress = accounts[0];
      // 同时获取 signer，否则 getSigner() 返回 null 导致写操作报错
      try { signer = await provider.getSigner(); } catch {}
      initEvents();
      notifyListeners();
    } else {
      initEvents();
    }
  } catch {
    initEvents();
  }
}
