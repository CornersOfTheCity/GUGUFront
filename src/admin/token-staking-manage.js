// ═══════════════════════════════════════════
//      Admin — Token 质押管理
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getProvider, getAddress } from '../modules/wallet.js';
import {
  TokenStaking_ADDRESS, TokenStaking_ABI,
  GUGUToken_ADDRESS, GUGUToken_ABI,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderTokenStakingManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🏦 Token 质押管理</h1>
        <p class="page-subtitle">管理 GUGU Token 质押合约参数</p>
      </div>

      <div class="admin-grid">
        <!-- 合约信息 -->
        <div class="card">
          <div class="admin-section-title">📋 合约信息</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${TokenStaking_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="tsa-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">当前 APR</span>
            <span class="admin-info-value" id="tsa-apr">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">最大 APR</span>
            <span class="admin-info-value" id="tsa-max-apr">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">锁仓时间</span>
            <span class="admin-info-value" id="tsa-lock">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约状态</span>
            <span class="admin-info-value" id="tsa-paused">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">全网总质押</span>
            <span class="admin-info-value" id="tsa-total-staked">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">奖励池余额</span>
            <span class="admin-info-value" id="tsa-pool-balance">—</span>
          </div>
        </div>

        <!-- 设置 APR -->
        <div class="card">
          <div class="admin-section-title">📈 设置年化利率 (APR)</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">新 APR (基点, 100 = 1%, 1000 = 10%)</label>
              <input class="input" id="tsa-new-apr" type="number" placeholder="例: 1000 = 10%" min="0" />
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem">
              预览: <span id="tsa-apr-preview">—</span>%
            </div>
            <button class="btn btn-primary" id="btn-set-apr" style="width: 100%; margin-top: 0.75rem;">📈 更新 APR</button>
          </div>
        </div>

        <!-- 设置锁仓时间 -->
        <div class="card">
          <div class="admin-section-title">🔒 设置锁仓时间</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">锁仓天数 (0 = 无锁仓)</label>
              <input class="input" id="tsa-new-lock" type="number" placeholder="例: 7" min="0" />
            </div>
            <button class="btn btn-primary" id="btn-set-lock" style="width: 100%; margin-top: 0.75rem;">🔒 更新锁仓时间</button>
          </div>

          <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1.25rem;">
            <div class="admin-section-title">⏸ 暂停 / 恢复</div>
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-outline" id="btn-pause" style="flex:1;">⏸ 暂停质押</button>
              <button class="btn btn-primary" id="btn-unpause" style="flex:1;">▶️ 恢复质押</button>
            </div>
          </div>
        </div>

        <!-- 奖励池管理 -->
        <div class="card">
          <div class="admin-section-title">💰 奖励池管理</div>
          <div style="text-align: center; padding: 1rem 0;">
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">当前奖励池余额</div>
            <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700; color: var(--primary-light);" id="tsa-pool-display">—</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">GUGU</div>
          </div>

          <!-- 注入奖励池 -->
          <div class="admin-form" style="margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border);">
            <div class="form-group">
              <label class="form-label">注入数量 (GUGU)</label>
              <input class="input" id="tsa-fund-amount" type="number" placeholder="输入数量" />
            </div>
            <button class="btn btn-accent" id="btn-fund-pool" style="width: 100%; margin-top: 0.75rem;">📥 注入奖励池</button>
          </div>

          <!-- 提取奖励池 -->
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">接收地址</label>
              <input class="input" id="tsa-drain-to" placeholder="0x... (默认当前钱包)" />
            </div>
            <div class="form-group">
              <label class="form-label">提取数量 (GUGU)</label>
              <input class="input" id="tsa-drain-amount" type="number" placeholder="输入数量" />
            </div>
            <div class="admin-warning">⚠️ 提取过多 Token 可能导致奖励池不足以支付用户质押奖励</div>
            <button class="btn btn-primary" id="btn-drain-pool" style="width: 100%; margin-top: 0.75rem;">📤 提取奖励池</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // APR preview
  document.getElementById('tsa-new-apr').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const preview = document.getElementById('tsa-apr-preview');
    if (preview) preview.textContent = (isNaN(val) ? 0 : val / 100).toFixed(1);
  });

  // 绑定按钮
  document.getElementById('btn-set-apr').addEventListener('click', handleSetApr);
  document.getElementById('btn-set-lock').addEventListener('click', handleSetLock);
  document.getElementById('btn-pause').addEventListener('click', handlePause);
  document.getElementById('btn-unpause').addEventListener('click', handleUnpause);
  document.getElementById('btn-fund-pool').addEventListener('click', handleFundPool);
  document.getElementById('btn-drain-pool').addEventListener('click', handleDrainPool);

  loadInfo();
  return () => {};
}

// ═══════════════════════════════════════════

async function loadInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;

    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, provider);

    const [owner, aprBps, maxApr, minLock, paused, totalStaked, poolBalance] = await Promise.all([
      staking.owner().catch(() => '—'),
      staking.aprBps().catch(() => 0n),
      staking.MAX_APR_BPS().catch(() => 5000n),
      staking.minLockDuration().catch(() => 0n),
      staking.paused().catch(() => false),
      staking.totalStaked().catch(() => 0n),
      staking.rewardPoolBalance().catch(() => 0n),
    ]);

    setVal('tsa-owner', owner);
    setVal('tsa-apr', (Number(aprBps) / 100).toFixed(1) + '%');
    setVal('tsa-max-apr', (Number(maxApr) / 100).toFixed(1) + '%');

    const lockSec = Number(minLock);
    if (lockSec === 0) { setVal('tsa-lock', '无锁仓'); }
    else {
      const days = Math.floor(lockSec / 86400);
      const hrs = Math.floor((lockSec % 86400) / 3600);
      setVal('tsa-lock', `${days} 天 ${hrs} 小时 (${lockSec}s)`);
    }

    setVal('tsa-paused', paused ? '⏸ 已暂停' : '🟢 运行中');
    setVal('tsa-total-staked', fmtToken(totalStaked) + ' GUGU');
    setVal('tsa-pool-balance', fmtToken(poolBalance) + ' GUGU');
    setVal('tsa-pool-display', fmtToken(poolBalance));
  } catch (err) {
    console.error('loadInfo error:', err);
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Handlers ──

async function handleSetApr() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-set-apr');
  try {
    setButtonLoading(btn, true);
    const val = document.getElementById('tsa-new-apr').value.trim();
    if (!val || Number(val) < 0) return showToast('请填写有效 APR', 'error');

    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.setApr(BigInt(val));
    await waitForTx(tx, `✅ APR 已更新为 ${(Number(val) / 100).toFixed(1)}%`);
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '📈 更新 APR'); }
}

async function handleSetLock() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-set-lock');
  try {
    setButtonLoading(btn, true);
    const days = document.getElementById('tsa-new-lock').value.trim();
    if (!days || Number(days) < 0) return showToast('请填写有效天数', 'error');

    const seconds = BigInt(Math.round(Number(days) * 86400));
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.setMinLockDuration(seconds);
    await waitForTx(tx, `✅ 锁仓时间已更新为 ${days} 天`);
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '🔒 更新锁仓时间'); }
}

async function handlePause() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-pause');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.pause();
    await waitForTx(tx, '⏸ 质押已暂停');
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '⏸ 暂停质押'); }
}

async function handleUnpause() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-unpause');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.unpause();
    await waitForTx(tx, '▶️ 质押已恢复');
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '▶️ 恢复质押'); }
}

async function handleFundPool() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-fund-pool');
  try {
    setButtonLoading(btn, true);
    const amountStr = document.getElementById('tsa-fund-amount').value.trim();
    if (!amountStr || Number(amountStr) <= 0) return showToast('请填写有效数量', 'error');

    const signer = getSigner();
    const amount = parseUnits(amountStr, 18);

    // Approve first
    const token = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, signer);
    const allowance = await token.allowance(getAddress(), TokenStaking_ADDRESS);
    if (allowance < amount) {
      showToast('授权 GUGU 中...', 'info');
      const approveTx = await token.approve(TokenStaking_ADDRESS, amount);
      await approveTx.wait();
    }

    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.fundRewardPool(amount);
    await waitForTx(tx, `✅ 已注入 ${amountStr} GUGU 到奖励池`);
    document.getElementById('tsa-fund-amount').value = '';
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '📥 注入奖励池'); }
}

async function handleDrainPool() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-drain-pool');
  try {
    setButtonLoading(btn, true);
    const to = document.getElementById('tsa-drain-to').value.trim() || getAddress();
    const amountStr = document.getElementById('tsa-drain-amount').value.trim();
    if (!amountStr || Number(amountStr) <= 0) return showToast('请填写有效数量', 'error');

    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.drainRewardPool(to, parseUnits(amountStr, 18));
    await waitForTx(tx, `✅ 已提取 ${amountStr} GUGU`);
    document.getElementById('tsa-drain-amount').value = '';
    loadInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '📤 提取奖励池'); }
}
