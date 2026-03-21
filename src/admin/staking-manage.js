// ═══════════════════════════════════════════
//      Admin — 质押管理
// ═══════════════════════════════════════════

import { Contract, parseUnits } from 'ethers';
import { getSigner, isConnected, getProvider, getAddress } from '../modules/wallet.js';
import {
  NFTStaking_ADDRESS, NFTStaking_ABI,
  GUGUToken_ADDRESS, GUGUToken_ABI,
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
          <div class="admin-info-row">
            <span class="admin-info-label">奖励池余额</span>
            <span class="admin-info-value" id="staking-pool-balance">—</span>
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

        <!-- 提取 Token -->
        <div class="card">
          <div class="admin-section-title">💰 提取奖励池 Token</div>
          <div style="text-align: center; padding: 1rem 0;">
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">当前奖励池余额</div>
            <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700; color: var(--primary-light);" id="rescue-pool-balance">—</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">GUGU</div>
          </div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">接收地址</label>
              <input class="input" id="rescue-to" placeholder="0x... (默认当前钱包)" />
            </div>
            <div class="form-group">
              <label class="form-label">提取数量 (GUGU)</label>
              <input class="input" id="rescue-amount" type="number" placeholder="输入数量" />
            </div>
            <div class="admin-warning">⚠️ 提取过多 Token 可能导致奖励池不足以支付用户质押奖励</div>
            <button class="btn btn-primary" id="btn-rescue-token" style="width: 100%; margin-top: 0.75rem;">💰 提取 Token</button>
          </div>
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

  // 提取 Token
  document.getElementById('btn-rescue-token').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-rescue-token');
    try {
      setButtonLoading(btn, true);
      const to = document.getElementById('rescue-to').value.trim() || getAddress();
      const amount = document.getElementById('rescue-amount').value.trim();
      if (!amount || Number(amount) <= 0) return showToast('请填写有效数量', 'error');

      const signer = getSigner();
      const contract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, signer);
      const tx = await contract.rescueToken(to, parseUnits(amount, 18));
      await waitForTx(tx, `✅ 已提取 ${amount} GUGU`);
      loadStakingInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '💰 提取 Token'); }
  });

  return () => {};
}

async function loadStakingInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(NFTStaking_ADDRESS, NFTStaking_ABI, provider);
    const tokenContract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);

    const owner = await contract.owner().catch(() => '—');
    const ownerEl = document.getElementById('staking-owner');
    if (ownerEl) ownerEl.textContent = owner;

    // 奖励池 GUGU 余额
    try {
      const poolBal = await tokenContract.balanceOf(NFTStaking_ADDRESS);
      const balText = fmtToken(poolBal) + ' GUGU';
      const el1 = document.getElementById('staking-pool-balance');
      const el2 = document.getElementById('rescue-pool-balance');
      if (el1) el1.textContent = balText;
      if (el2) el2.textContent = fmtToken(poolBal);
    } catch {}

    for (let i = 0; i < 3; i++) {
      try {
        const reward = await contract.dailyReward(i);
        const el = document.getElementById(`daily-reward-${i}`);
        if (el) el.textContent = fmtToken(reward) + ' GUGU/天';
      } catch {}
    }
  } catch {}
}
