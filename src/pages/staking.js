// ═══════════════════════════════════════════
//          质押页
// ═══════════════════════════════════════════

import { Contract } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import {
  GUGUNFT_ADDRESS, GUGUNFT_ABI,
  NFTStaking_ADDRESS, NFTStaking_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

let refreshInterval = null;

export async function renderStakingPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">NFT 质押</h1>
        <p class="page-subtitle">质押你的 GUGU NFT，每日赚取 GUGU Token 奖励</p>
      </div>

      <div class="stats-grid" id="staking-stats">
        <div class="card stat-card">
          <div class="stat-value" id="stat-staked">0</div>
          <div class="stat-label">已质押 NFT</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="stat-pending">0</div>
          <div class="stat-label">待领取奖励 (GUGU)</div>
        </div>
        <div class="card stat-card">
          <button class="btn btn-accent btn-lg btn-full" id="btn-claim">
            💰 领取全部奖励
          </button>
        </div>
      </div>

      <div class="staking-layout">
        <!-- 未质押 NFT -->
        <div class="card">
          <div class="staking-section-title">
            <span>💎</span> 我的 NFT（未质押）
          </div>
          <div id="unstaked-nfts" class="nft-grid">
            <div class="loading-placeholder">
              <div class="loading-spinner-lg"></div>
              <span>加载中...</span>
            </div>
          </div>
        </div>

        <!-- 已质押 NFT -->
        <div class="card">
          <div class="staking-section-title">
            <span>🔒</span> 已质押 NFT
          </div>
          <div id="staked-nfts" class="nft-grid">
            <div class="loading-placeholder">
              <div class="loading-spinner-lg"></div>
              <span>加载中...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── 领取按钮 ──
  document.getElementById('btn-claim').addEventListener('click', handleClaimRewards);

  // ── 首次加载 ──
  if (isConnected()) {
    loadStakingData();
    refreshInterval = setInterval(loadStakingData, 15000);
  } else {
    showConnectPrompt();
  }

  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };
}

function showConnectPrompt() {
  const unstakedEl = document.getElementById('unstaked-nfts');
  const stakedEl = document.getElementById('staked-nfts');
  const prompt = `
    <div class="empty-state">
      <div class="empty-state-icon">🔗</div>
      <div class="empty-state-text">请先连接钱包</div>
    </div>
  `;
  if (unstakedEl) unstakedEl.innerHTML = prompt;
  if (stakedEl) stakedEl.innerHTML = prompt;
}

async function loadStakingData() {
  if (!isConnected()) return;

  try {
    const provider = getProvider();
    const address = getAddress();
    const nftContract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, provider);
    const stakingContract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, provider);

    // 并行加载
    const [stakedTokenIds, pendingRewardsRaw, nftBalance] = await Promise.all([
      stakingContract.stakedTokensOf(address).catch(() => []),
      stakingContract.pendingRewards(address).catch(() => 0n),
      nftContract.balanceOf(address).catch(() => 0n),
    ]);

    // ── 更新统计 ──
    const statStaked = document.getElementById('stat-staked');
    const statPending = document.getElementById('stat-pending');
    if (statStaked) statStaked.textContent = stakedTokenIds.length;
    if (statPending) statPending.textContent = fmtToken(pendingRewardsRaw);

    // ── 加载未质押的 NFT ──
    const unstakedTokens = [];
    const balanceNum = Number(nftBalance);
    for (let i = 0; i < balanceNum; i++) {
      try {
        const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
        const rarity = await nftContract.getRarity(tokenId);
        unstakedTokens.push({ tokenId: Number(tokenId), rarity: Number(rarity) });
      } catch {
        break;
      }
    }

    // ── 加载已质押 NFT 的稀有度 ──
    const stakedTokens = [];
    for (const tokenId of stakedTokenIds) {
      try {
        const rarity = await nftContract.getRarity(tokenId);
        stakedTokens.push({ tokenId: Number(tokenId), rarity: Number(rarity) });
      } catch {
        stakedTokens.push({ tokenId: Number(tokenId), rarity: 2 });
      }
    }

    // ── 渲染列表 ──
    renderNftList('unstaked-nfts', unstakedTokens, 'stake');
    renderNftList('staked-nfts', stakedTokens, 'unstake');
  } catch (err) {
    console.error('loadStakingData error:', err);
  }
}

function renderNftList(containerId, tokens, action) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tokens.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${action === 'stake' ? '📭' : '🔓'}</div>
        <div class="empty-state-text">${action === 'stake' ? '暂无可质押的 NFT' : '暂无已质押的 NFT'}</div>
      </div>
    `;
    return;
  }

  container.innerHTML = tokens.map((t) => {
    const rarityClass = RARITY_NAMES[t.rarity]?.toLowerCase() || 'basic';
    return `
      <div class="card nft-item rarity-card ${rarityClass}" data-token-id="${t.tokenId}" data-action="${action}">
        <div class="nft-item-id">#${t.tokenId}</div>
        <span class="rarity-badge ${rarityClass}">${RARITY_EMOJIS[t.rarity] || '🌟'} ${RARITY_NAMES[t.rarity] || 'Basic'}</span>
        <button class="btn btn-sm btn-${action === 'stake' ? 'primary' : 'outline'}" style="margin-top: 0.75rem; width: 100%;">
          ${action === 'stake' ? '质押' : '取消质押'}
        </button>
      </div>
    `;
  }).join('');

  // ── 绑定事件 ──
  container.querySelectorAll('.nft-item').forEach((item) => {
    const btn = item.querySelector('.btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tokenId = parseInt(item.dataset.tokenId);
      if (item.dataset.action === 'stake') {
        handleStake(tokenId, btn);
      } else {
        handleUnstake(tokenId, btn);
      }
    });
  });
}

async function handleStake(tokenId, btn) {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const address = getAddress();
    const nftContract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, signer);
    const stakingContract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, signer);

    // 检查是否已授权
    const isApproved = await nftContract.isApprovedForAll(address, NFTStaking_ADDRESS);
    if (!isApproved) {
      showToast('授权 NFT 给质押合约...', 'info');
      const approveTx = await nftContract.setApprovalForAll(NFTStaking_ADDRESS, true);
      await approveTx.wait();
    }

    const tx = await stakingContract.stake(tokenId);
    await waitForTx(tx, `✅ NFT #${tokenId} 已质押`);
    loadStakingData();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, '质押');
  }
}

async function handleUnstake(tokenId, btn) {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const stakingContract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, signer);

    const tx = await stakingContract.unstake(tokenId);
    await waitForTx(tx, `✅ NFT #${tokenId} 已取消质押，奖励已发放`);
    loadStakingData();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, '取消质押');
  }
}

async function handleClaimRewards() {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  const btn = document.getElementById('btn-claim');

  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const stakingContract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, signer);

    const tx = await stakingContract.claimRewards();
    await waitForTx(tx, '🎉 奖励已领取！');
    loadStakingData();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, '💰 领取全部奖励');
  }
}
