// ═══════════════════════════════════════════
//          GUGU Admin — 管理端入口
// ═══════════════════════════════════════════

import './style.css';
import './admin/admin.css';
import { connectWallet, disconnectWallet, isConnected, formatAddress, getAddress, onWalletChange, tryAutoConnect } from './modules/wallet.js';
import { showToast, handleError } from './modules/utils.js';
import { NETWORK_NAME, CHAIN_NAME } from './config/contracts.js';

// 导入所有管理页面
import { renderTokenManage } from './admin/token-manage.js';
import { renderNftManage } from './admin/nft-manage.js';
import { renderStakingManage } from './admin/staking-manage.js';
import { renderBoxManage } from './admin/box-manage.js';
import { renderSwapManage } from './admin/swap-manage.js';
import { renderAirdropManage } from './admin/airdrop-manage.js';

// ── 路由 ──
const routes = {
  '/token': renderTokenManage,
  '/nft': renderNftManage,
  '/staking': renderStakingManage,
  '/box': renderBoxManage,
  '/swap': renderSwapManage,
  '/airdrop': renderAirdropManage,
};

let currentCleanup = null;
let handleRoute = null;

function init() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <div class="navbar-logo" style="cursor: pointer;" onclick="location.href='/'">
          GUGU <span style="color: var(--warning);">Admin</span>
        </div>
        <ul class="navbar-nav">
          <li><a href="#/token" class="nav-link" id="nav-token">
            <span class="nav-link-icon">🪙</span>
            <span class="nav-link-text">Token</span>
          </a></li>
          <li><a href="#/nft" class="nav-link" id="nav-nft">
            <span class="nav-link-icon">💎</span>
            <span class="nav-link-text">NFT</span>
          </a></li>
          <li><a href="#/staking" class="nav-link" id="nav-staking">
            <span class="nav-link-icon">🔒</span>
            <span class="nav-link-text">质押</span>
          </a></li>
          <li><a href="#/box" class="nav-link" id="nav-box">
            <span class="nav-link-icon">🎁</span>
            <span class="nav-link-text">盲盒</span>
          </a></li>
          <li><a href="#/swap" class="nav-link" id="nav-swap">
            <span class="nav-link-icon">🔄</span>
            <span class="nav-link-text">Swap</span>
          </a></li>
          <li><a href="#/airdrop" class="nav-link" id="nav-airdrop">
            <span class="nav-link-icon">🪂</span>
            <span class="nav-link-text">空投</span>
          </a></li>
        </ul>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="network-badge ${NETWORK_NAME === 'mainnet' ? 'mainnet' : 'testnet'}">
            ${NETWORK_NAME === 'mainnet' ? '🟢' : '🟡'} ${CHAIN_NAME}
          </span>
          <button class="btn-connect" id="btn-wallet">
            <span>🔗</span>
            <span id="wallet-label">连接钱包</span>
          </button>
        </div>
      </div>
    </nav>
    <main id="page-content" class="page-container"></main>
  `;

  // 钱包按钮
  document.getElementById('btn-wallet').addEventListener('click', async () => {
    try {
      if (isConnected()) {
        disconnectWallet();
        showToast('钱包已断开', 'info');
      } else {
        const addr = await connectWallet();
        // 直接更新 UI，确保即时显示
        const label = document.getElementById('wallet-label');
        const btn = document.getElementById('btn-wallet');
        if (addr && label && btn) {
          label.textContent = formatAddress(addr);
          btn.classList.add('connected');
        }
        showToast('钱包已连接', 'success');
      }
    } catch (err) {
      handleError(err);
    }
  });

  onWalletChange(({ address, connected }) => {
    const label = document.getElementById('wallet-label');
    const btn = document.getElementById('btn-wallet');
    if (connected) {
      label.textContent = formatAddress(address);
      btn.classList.add('connected');
    } else {
      label.textContent = '连接钱包';
      btn.classList.remove('connected');
    }
    // 重新渲染当前页面
    handleRoute();
  });

  // 路由
  handleRoute = async () => {
    const hash = window.location.hash || '#/token';
    const path = hash.replace('#', '');
    const renderFn = routes[path] || routes['/token'];

    if (currentCleanup && typeof currentCleanup === 'function') currentCleanup();

    const container = document.getElementById('page-content');
    if (container && renderFn) {
      currentCleanup = await renderFn(container);
    }

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // 页面加载时尝试自动重连（不弹窗）
  tryAutoConnect();
}

document.addEventListener('DOMContentLoaded', init);
