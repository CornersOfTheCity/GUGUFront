// ═══════════════════════════════════════════
//          仪表盘
// ═══════════════════════════════════════════

import { Contract } from 'ethers';
import { isConnected, getAddress, getProvider } from '../modules/wallet.js';
import {
  GUGUToken_ADDRESS, GUGUToken_ABI,
  GUGUNFT_ADDRESS, GUGUNFT_ABI,
  NFTStaking_ADDRESS, NFTStaking_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
  TOKENOMICS,
} from '../config/contracts.js';
import { fmtToken } from '../modules/utils.js';

let refreshInterval = null;

export async function renderDashboardPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">仪表盘</h1>
        <p class="page-subtitle">概览你的 GUGU DeFi 资产与活动</p>
      </div>

      <div class="stats-grid">
        <div class="card stat-card">
          <div class="stat-value" id="dash-gugu-balance">—</div>
          <div class="stat-label">GUGU Token 余额</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="dash-nft-count">—</div>
          <div class="stat-label">持有 NFT</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="dash-staked-count">—</div>
          <div class="stat-label">已质押 NFT</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="dash-pending-rewards">—</div>
          <div class="stat-label">待领取奖励 (GUGU)</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- 我的 NFT 列表 -->
        <div class="card">
          <div class="dashboard-card-title">
            <span>💎</span> 我的 NFT 收藏
          </div>
          <div id="dash-nft-list" class="nft-grid">
            <div class="loading-placeholder">
              <div class="loading-spinner-lg"></div>
              <span>加载中...</span>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="card">
          <div class="dashboard-card-title">
            <span>⚡</span> 快速操作
          </div>
          <div class="quick-actions">
            <a href="#/mint" class="quick-action-btn">
              <span class="quick-action-icon">💎</span>
              <span class="quick-action-label">铸造 NFT</span>
            </a>
            <a href="#/staking" class="quick-action-btn">
              <span class="quick-action-icon">🔒</span>
              <span class="quick-action-label">质押管理</span>
            </a>
            <a href="#/mysterybox" class="quick-action-btn">
              <span class="quick-action-icon">🎁</span>
              <span class="quick-action-label">开盲盒</span>
            </a>
            <a class="quick-action-btn" id="btn-explorer" style="cursor: pointer;">
              <span class="quick-action-icon">🔍</span>
              <span class="quick-action-label">查看合约</span>
            </a>
          </div>

          <!-- 全供应概览 -->
          <div style="margin-top: 2rem;">
            <div class="dashboard-card-title" style="font-size: 1rem;">
              <span>📊</span> NFT 供应总览
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${[0, 1, 2].map((i) => {
                const rarityClass = RARITY_NAMES[i].toLowerCase();
                return `
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="rarity-badge ${rarityClass}" style="min-width: 90px;">${RARITY_EMOJIS[i]} ${RARITY_NAMES[i]}</span>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);" id="dash-supply-${i}">— minted</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Tokenomics 图表 -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="dashboard-card-title">
          <span>📊</span> Token 经济模型
        </div>
        <div style="display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;">
          <!-- 环形图 -->
          <div style="position: relative; width: 220px; height: 220px; flex-shrink: 0;">
            <div id="donut-chart" style="width: 220px; height: 220px; border-radius: 50%; position: relative;"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        width: 120px; height: 120px; border-radius: 50%;
                        background: var(--bg-primary); display: flex; flex-direction: column;
                        align-items: center; justify-content: center;">
              <div style="font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem;">1 亿</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">GUGU 总量</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;" id="dash-token-circulating"></div>
            </div>
          </div>
          <!-- 图例 -->
          <div style="flex: 1; min-width: 200px;">
            ${TOKENOMICS.allocations.map((a) => `
              <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;
                          border-bottom: 1px solid hsla(230, 20%, 20%, 0.3);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: ${a.color}; flex-shrink: 0;"></div>
                <span style="flex: 1; font-size: 0.85rem;">${a.name}</span>
                <span style="font-weight: 600; font-family: var(--font-heading); font-size: 0.85rem; min-width: 70px; text-align: right;">
                  ${(a.amount / 10000).toLocaleString()} 万
                </span>
                <span style="font-size: 0.8rem; color: var(--text-muted); min-width: 35px; text-align: right;">
                  ${a.pct}%
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // ── 查看合约按钮 ──
  document.getElementById('btn-explorer').addEventListener('click', () => {
    import('../config/contracts.js').then(({ CHAIN_EXPLORER, GUGUNFT_ADDRESS }) => {
      window.open(`${CHAIN_EXPLORER}/address/${GUGUNFT_ADDRESS}`, '_blank');
    });
  });

  // ── 渲染 Tokenomics 环形图 ──
  renderDonutChart();

  // ── 加载数据 ──
  if (isConnected()) {
    loadDashboard();
    refreshInterval = setInterval(loadDashboard, 20000);
  } else {
    showDashConnectPrompt();
  }

  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };
}

function showDashConnectPrompt() {
  const nftList = document.getElementById('dash-nft-list');
  if (nftList) {
    nftList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔗</div>
        <div class="empty-state-text">连接钱包查看你的资产</div>
      </div>
    `;
  }
}

async function loadDashboard() {
  if (!isConnected()) return;

  const provider = getProvider();
  const address = getAddress();

  try {
    const tokenContract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);
    const nftContract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, provider);
    const stakingContract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, provider);

    // 并行请求
    const [guguBalance, nftBalance, stakedCount, pendingRewards] = await Promise.all([
      tokenContract.balanceOf(address).catch(() => 0n),
      nftContract.balanceOf(address).catch(() => 0n),
      stakingContract.stakedCountOf(address).catch(() => 0n),
      stakingContract.pendingRewards(address).catch(() => 0n),
    ]);

    // 更新统计
    setDashValue('dash-gugu-balance', fmtToken(guguBalance));
    setDashValue('dash-nft-count', Number(nftBalance).toString());
    setDashValue('dash-staked-count', Number(stakedCount).toString());
    setDashValue('dash-pending-rewards', fmtToken(pendingRewards));

    // NFT 列表
    await loadDashNfts(nftContract, address, Number(nftBalance));

    // 供应进度
    await loadSupplyProgress(nftContract);

    // Token 流通量
    try {
      const [totalSupply, maxSupply] = await Promise.all([
        tokenContract.totalSupply(),
        tokenContract.MAX_SUPPLY(),
      ]);
      const el = document.getElementById('dash-token-circulating');
      if (el) el.textContent = `已铸: ${fmtToken(totalSupply)}`;
    } catch {}

  } catch (err) {
    console.error('loadDashboard error:', err);
  }
}

function setDashValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadDashNfts(nftContract, address, balance) {
  const container = document.getElementById('dash-nft-list');
  if (!container) return;

  if (balance === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无 NFT，去铸造页铸造吧！</div>
      </div>
    `;
    return;
  }

  const tokens = [];
  for (let i = 0; i < balance; i++) {
    try {
      const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
      const rarity = await nftContract.getRarity(tokenId);
      tokens.push({ tokenId: Number(tokenId), rarity: Number(rarity) });
    } catch { break; }
  }

  container.innerHTML = tokens.map((t) => {
    const rarityClass = RARITY_NAMES[t.rarity]?.toLowerCase() || 'basic';
    return `
      <div class="card nft-item rarity-card ${rarityClass}">
        <div class="nft-item-id">#${t.tokenId}</div>
        <span class="rarity-badge ${rarityClass}">${RARITY_EMOJIS[t.rarity] || '🌟'} ${RARITY_NAMES[t.rarity] || 'Basic'}</span>
      </div>
    `;
  }).join('');
}

async function loadSupplyProgress(nftContract) {
  for (let i = 0; i < 3; i++) {
    try {
      const minted = await nftContract.totalSupplyByRarity(i);
      setDashValue(`dash-supply-${i}`, `${Number(minted)} minted`);
    } catch {}
  }
}

function renderDonutChart() {
  const el = document.getElementById('donut-chart');
  if (!el) return;

  // 构建 conic-gradient
  let cumulative = 0;
  const stops = [];
  for (const a of TOKENOMICS.allocations) {
    const start = cumulative;
    cumulative += a.pct;
    stops.push(`${a.color} ${start}% ${cumulative}%`);
  }

  el.style.background = `conic-gradient(${stops.join(', ')})`;
}
