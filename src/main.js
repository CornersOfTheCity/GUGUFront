// ═══════════════════════════════════════════
//          GUGU DeFi — 主入口
// ═══════════════════════════════════════════

import './style.css';
import { connectWallet, disconnectWallet, isConnected, formatAddress, getAddress, onWalletChange } from './modules/wallet.js';
import { registerRoute, initRouter } from './router.js';
import { renderMintPage } from './pages/mint.js';
import { renderStakingPage } from './pages/staking.js';
import { renderMysteryBoxPage } from './pages/mysterybox.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { showToast, handleError } from './modules/utils.js';

// ── 初始化应用 ──
function init() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <div class="navbar-logo" id="logo">GUGU DeFi</div>
        <ul class="navbar-nav" id="nav-links">
          <li><a href="#/mint" class="nav-link" id="nav-mint">
            <span class="nav-link-icon">💎</span>
            <span class="nav-link-text">铸造 NFT</span>
          </a></li>
          <li><a href="#/staking" class="nav-link" id="nav-staking">
            <span class="nav-link-icon">🔒</span>
            <span class="nav-link-text">质押</span>
          </a></li>
          <li><a href="#/mysterybox" class="nav-link" id="nav-mysterybox">
            <span class="nav-link-icon">🎁</span>
            <span class="nav-link-text">盲盒</span>
          </a></li>
          <li><a href="#/dashboard" class="nav-link" id="nav-dashboard">
            <span class="nav-link-icon">📊</span>
            <span class="nav-link-text">仪表盘</span>
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

  // ── 钱包按钮事件 ──
  const walletBtn = document.getElementById('btn-wallet');
  walletBtn.addEventListener('click', async () => {
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

  // ── 监听钱包状态变更 ──
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

  // ── Logo 点击回首页 ──
  document.getElementById('logo').addEventListener('click', () => {
    window.location.hash = '#/mint';
  });

  // ── 注册路由 ──
  registerRoute('/mint', renderMintPage);
  registerRoute('/staking', renderStakingPage);
  registerRoute('/mysterybox', renderMysteryBoxPage);
  registerRoute('/dashboard', renderDashboardPage);

  initRouter();
}

// ── 启动 ──
document.addEventListener('DOMContentLoaded', init);
