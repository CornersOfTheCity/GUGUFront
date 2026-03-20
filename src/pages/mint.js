// ═══════════════════════════════════════════
//          NFT 铸造页
// ═══════════════════════════════════════════

import { Contract, parseEther } from 'ethers';
import { getSigner, isConnected, getProvider } from '../modules/wallet.js';
import {
  GUGUNFT_ADDRESS, GUGUNFT_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
  MINT_PRICES_ETH, MAX_SUPPLY, DAILY_REWARDS,
} from '../config/contracts.js';
import { waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderMintPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">铸造 GUGU NFT</h1>
        <p class="page-subtitle">选择你心仪的稀有度，铸造独一无二的 GUGU NFT，质押赚取 GUGU 代币</p>
      </div>

      <div class="mint-grid" id="mint-grid">
        ${[0, 1, 2].map((i) => {
          const rarityClass = RARITY_NAMES[i].toLowerCase();
          return `
            <div class="card rarity-card mint-card ${rarityClass} slide-up" style="animation-delay: ${i * 0.1}s">
              <div class="mint-card-header">
                <span class="rarity-badge ${rarityClass}">${RARITY_EMOJIS[i]} ${RARITY_NAMES[i]}</span>
                <span class="mint-card-emoji">${i === 0 ? '🏆' : i === 1 ? '⚡' : '✨'}</span>
              </div>

              <div class="mint-card-title">${RARITY_NAMES[i]} NFT</div>

              <div class="mint-card-price">
                ${MINT_PRICES_ETH[i]} <span class="eth-label">ETH</span>
              </div>

              <div class="mint-card-info">
                <div class="mint-info-row">
                  <span class="mint-info-label">最大供应</span>
                  <span class="mint-info-value">${MAX_SUPPLY[i].toLocaleString()}</span>
                </div>
                <div class="mint-info-row">
                  <span class="mint-info-label">已铸造</span>
                  <span class="mint-info-value" id="minted-${i}">—</span>
                </div>
                <div class="mint-info-row">
                  <span class="mint-info-label">质押日奖励</span>
                  <span class="mint-info-value">${DAILY_REWARDS[i]} GUGU/天</span>
                </div>

                <div class="progress-bar">
                  <div class="progress-fill ${rarityClass}" id="progress-${i}" style="width: 0%"></div>
                </div>
              </div>

              <button class="btn btn-${rarityClass} btn-lg btn-full" id="mint-btn-${i}">
                铸造 ${RARITY_NAMES[i]}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // ── 加载铸造进度 ──
  loadMintProgress();

  // ── 绑定铸造按钮 ──
  [0, 1, 2].forEach((rarity) => {
    const btn = document.getElementById(`mint-btn-${rarity}`);
    btn.addEventListener('click', () => handleMint(rarity));
  });

  // 返回 cleanup 函数
  return () => {};
}

async function loadMintProgress() {
  try {
    const provider = getProvider();
    if (!provider) return;

    const nftContract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, provider);

    for (let i = 0; i < 3; i++) {
      try {
        const minted = await nftContract.totalSupplyByRarity(i);
        const max = MAX_SUPPLY[i];
        const mintedNum = Number(minted);

        const mintedEl = document.getElementById(`minted-${i}`);
        const progressEl = document.getElementById(`progress-${i}`);

        if (mintedEl) mintedEl.textContent = `${mintedNum} / ${max}`;
        if (progressEl) progressEl.style.width = `${(mintedNum / max) * 100}%`;
      } catch {
        // 合约未部署时静默处理
      }
    }
  } catch {
    // 静默处理
  }
}

async function handleMint(rarity) {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  const btn = document.getElementById(`mint-btn-${rarity}`);
  const originalText = `铸造 ${RARITY_NAMES[rarity]}`;

  try {
    setButtonLoading(btn, true);

    const signer = getSigner();
    const nftContract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, signer);

    const price = parseEther(MINT_PRICES_ETH[rarity]);
    const tx = await nftContract.mintPublic(rarity, { value: price });

    await waitForTx(tx, `🎉 成功铸造 ${RARITY_NAMES[rarity]} NFT！`);

    // 刷新进度
    loadMintProgress();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, originalText);
  }
}
