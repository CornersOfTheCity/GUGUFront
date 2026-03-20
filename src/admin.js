// ═══════════════════════════════════════════
//          GUGU Admin — 管理端入口
// ═══════════════════════════════════════════

import './style.css';
import './admin/admin.css';
import { connectWallet, disconnectWallet, isConnected, formatAddress, getAddress, onWalletChange } from './modules/wallet.js';
import { showToast, handleError } from './modules/utils.js';

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
        <button class="btn-connect" id="btn-wallet">
          <span>🔗</span>
          <span id="wallet-label">连接钱包</span>
        </button>
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
        await connectWallet();
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
  });

  // 路由
  const handleRoute = async () => {
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
}

document.addEventListener('DOMContentLoaded', init);
