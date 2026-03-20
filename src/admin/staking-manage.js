// ═══════════════════════════════════════════
//      Admin — 质押管理
// ═══════════════════════════════════════════

import { Contract, parseUnits } from 'ethers';
import { getSigner, isConnected, getProvider } from '../modules/wallet.js';
import {
  NFTStaking_ADDRESS, NFTStaking_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderStakingManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🔒 质押管理</h1>
        <p class="page-subtitle">配置各稀有度 NFT 的每日质押奖励</p>
      </div>

      <div class="admin-grid">
        <!-- 当前奖励配置 -->
        <div class="card">
          <div class="admin-section-title">📋 当前每日奖励</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${NFTStaking_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="staking-owner">—</span>
          </div>
          ${[0, 1, 2].map((i) => `
            <div class="admin-info-row">
              <span class="admin-info-label">${RARITY_EMOJIS[i]} ${RARITY_NAMES[i]}</span>
              <span class="admin-info-value" id="daily-reward-${i}">—</span>
            </div>
          `).join('')}
        </div>

        <!-- 修改奖励 -->
        <div class="card">
          <div class="admin-section-title">⚙️ 修改每日奖励</div>
          ${[0, 1, 2].map((i) => `
            <div class="admin-form" style="margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border);">
              <div class="admin-form-row">
                <div class="form-group">
                  <label class="form-label">${RARITY_EMOJIS[i]} ${RARITY_NAMES[i]} (GUGU/天)</label>
                  <input class="input" id="new-reward-${i}" type="number" placeholder="当前值" />
                </div>
                <button class="btn btn-primary btn-sm" id="btn-set-reward-${i}">更新</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  loadStakingInfo();

  // 绑定更新按钮
  [0, 1, 2].forEach((i) => {
    document.getElementById(`btn-set-reward-${i}`).addEventListener('click', async () => {
      if (!isConnected()) return showToast('请先连接钱包', 'error');
      const btn = document.getElementById(`btn-set-reward-${i}`);
      try {
        setButtonLoading(btn, true);
        const val = document.getElementById(`new-reward-${i}`).value.trim();
        if (!val) return showToast('请填写奖励值', 'error');

        const signer = getSigner();
        const contract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, signer);
        const tx = await contract.setDailyReward(i, parseUnits(val, 18));
        await waitForTx(tx, `✅ ${RARITY_NAMES[i]} 奖励已更新为 ${val} GUGU/天`);
        loadStakingInfo();
      } catch (err) { handleError(err); }
      finally { setButtonLoading(btn, false, '更新'); }
    });
  });

  return () => {};
}

async function loadStakingInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, provider);

    const owner = await contract.owner().catch(() => '—');
    const ownerEl = document.getElementById('staking-owner');
    if (ownerEl) ownerEl.textContent = owner;

    for (let i = 0; i < 3; i++) {
      try {
        const reward = await contract.dailyReward(i);
        const el = document.getElementById(`daily-reward-${i}`);
        if (el) el.textContent = fmtToken(reward) + ' GUGU/天';
      } catch {}
    }
  } catch {}
}
