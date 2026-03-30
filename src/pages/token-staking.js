// ═══════════════════════════════════════════
//          Token 质押页
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import {
  GUGUToken_ADDRESS, GUGUToken_ABI,
  TokenStaking_ADDRESS, TokenStaking_ABI,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

let refreshInterval = null;
let countdownInterval = null;
let activeTab = 'stake'; // 'stake' | 'unstake'

export async function renderTokenStakingPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Token 质押</h1>
        <p class="page-subtitle">质押 GUGU Token，赚取年化收益，灵活存取</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid" id="ts-stats">
        <div class="card stat-card">
          <div class="stat-value" id="ts-apr">—</div>
          <div class="stat-label">年化收益率 (APR)</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="ts-my-staked">0</div>
          <div class="stat-label">我的质押 (GUGU)</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="ts-my-pending">0</div>
          <div class="stat-label">待领取奖励 (GUGU)</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" id="ts-total-staked">—</div>
          <div class="stat-label">全网总质押 (GUGU)</div>
        </div>
      </div>

      <!-- 主操作卡片 -->
      <div class="ts-container">
        <div class="card card-glass ts-main-card slide-up">
          <!-- Tab 切换 -->
          <div class="ts-tabs">
            <button class="ts-tab active" id="tab-stake" data-tab="stake">质押</button>
            <button class="ts-tab" id="tab-unstake" data-tab="unstake">解除质押</button>
          </div>

          <!-- 质押面板 -->
          <div class="ts-panel" id="panel-stake">
            <div class="swap-input-group">
              <div class="swap-input-header">
                <span class="swap-label">质押数量</span>
                <span class="swap-balance" id="ts-wallet-balance">余额: —</span>
              </div>
              <div class="swap-input-row">
                <input type="number" class="input swap-amount-input" id="ts-stake-amount" placeholder="0.0" min="0" step="any" />
                <div class="swap-token-badge">GUGU</div>
              </div>
              <button class="btn btn-ghost btn-sm swap-max-btn" id="ts-stake-max">MAX</button>
            </div>

            <!-- 锁仓提示 -->
            <div class="ts-lock-notice" id="ts-lock-notice" style="display:none">
              <span>🔒</span>
              <span id="ts-lock-text">最低锁仓期: —</span>
            </div>

            <button class="btn btn-primary btn-lg btn-full ts-action-btn" id="btn-do-stake">
              质押 GUGU
            </button>
          </div>

          <!-- 解除质押面板 -->
          <div class="ts-panel" id="panel-unstake" style="display:none">
            <div class="swap-input-group">
              <div class="swap-input-header">
                <span class="swap-label">取出数量</span>
                <span class="swap-balance" id="ts-staked-balance">已质押: —</span>
              </div>
              <div class="swap-input-row">
                <input type="number" class="input swap-amount-input" id="ts-unstake-amount" placeholder="0.0" min="0" step="any" />
                <div class="swap-token-badge">GUGU</div>
              </div>
              <button class="btn btn-ghost btn-sm swap-max-btn" id="ts-unstake-max">MAX</button>
            </div>

            <!-- 解锁倒计时 -->
            <div class="ts-lock-countdown" id="ts-countdown" style="display:none">
              <span class="ts-countdown-icon">⏳</span>
              <span id="ts-countdown-text">解锁中...</span>
            </div>

            <button class="btn btn-primary btn-lg btn-full ts-action-btn" id="btn-do-unstake">
              解除质押
            </button>
          </div>

          <!-- 收益详情 -->
          <div class="swap-details" id="ts-details" style="display:none">
            <div class="swap-detail-row">
              <span>年化利率</span>
              <span id="ts-detail-apr">—</span>
            </div>
            <div class="swap-detail-row">
              <span>锁仓时间</span>
              <span id="ts-detail-lock">—</span>
            </div>
            <div class="swap-detail-row">
              <span>奖励池余额</span>
              <span id="ts-detail-pool">—</span>
            </div>
            <div class="swap-detail-row">
              <span>合约状态</span>
              <span id="ts-detail-status">—</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作卡片组 -->
      <div class="ts-actions-grid slide-up" style="animation-delay: 0.15s">
        <!-- 领取奖励 -->
        <div class="card ts-action-card">
          <div class="ts-action-icon">💰</div>
          <div class="ts-action-title">领取奖励</div>
          <div class="ts-action-value" id="ts-claim-amount">0 GUGU</div>
          <div class="ts-action-desc">领取累积收益到钱包</div>
          <button class="btn btn-accent btn-full" id="btn-claim-rewards">💰 领取奖励</button>
        </div>

        <!-- 复投 -->
        <div class="card ts-action-card">
          <div class="ts-action-icon">🔄</div>
          <div class="ts-action-title">复投 (Compound)</div>
          <div class="ts-action-value" id="ts-compound-amount">0 GUGU</div>
          <div class="ts-action-desc">将奖励自动加入质押本金</div>
          <button class="btn btn-primary btn-full" id="btn-compound">🔄 一键复投</button>
        </div>

        <!-- 紧急提取 -->
        <div class="card ts-action-card">
          <div class="ts-action-icon">⚠️</div>
          <div class="ts-action-title">紧急提取</div>
          <div class="ts-action-value ts-action-warning" id="ts-emergency-amount">0 GUGU</div>
          <div class="ts-action-desc ts-action-warning-text">取回本金，放弃全部未领奖励</div>
          <button class="btn btn-outline btn-full" id="btn-emergency">⚠️ 紧急提取</button>
        </div>
      </div>
    </div>
  `;

  // ── Tab 切换 ──
  document.getElementById('tab-stake').addEventListener('click', () => switchTab('stake'));
  document.getElementById('tab-unstake').addEventListener('click', () => switchTab('unstake'));

  // ── MAX 按钮 ──
  document.getElementById('ts-stake-max').addEventListener('click', onStakeMax);
  document.getElementById('ts-unstake-max').addEventListener('click', onUnstakeMax);

  // ── 操作按钮 ──
  document.getElementById('btn-do-stake').addEventListener('click', handleStake);
  document.getElementById('btn-do-unstake').addEventListener('click', handleUnstake);
  document.getElementById('btn-claim-rewards').addEventListener('click', handleClaim);
  document.getElementById('btn-compound').addEventListener('click', handleCompound);
  document.getElementById('btn-emergency').addEventListener('click', handleEmergency);

  // ── 首次加载 ──
  if (isConnected()) {
    loadTokenStakingData();
    refreshInterval = setInterval(loadTokenStakingData, 10000);
  } else {
    showConnectPrompt();
  }

  return () => {
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  };
}

// ═══════════════════════════════════════════
//            Tab Switching
// ═══════════════════════════════════════════

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-stake').classList.toggle('active', tab === 'stake');
  document.getElementById('tab-unstake').classList.toggle('active', tab === 'unstake');
  document.getElementById('panel-stake').style.display = tab === 'stake' ? '' : 'none';
  document.getElementById('panel-unstake').style.display = tab === 'unstake' ? '' : 'none';
}

// ═══════════════════════════════════════════
//            Connect Prompt
// ═══════════════════════════════════════════

function showConnectPrompt() {
  // Just update the button states
  const stakeBtn = document.getElementById('btn-do-stake');
  const unstakeBtn = document.getElementById('btn-do-unstake');
  if (stakeBtn) { stakeBtn.textContent = '请先连接钱包'; stakeBtn.disabled = true; }
  if (unstakeBtn) { unstakeBtn.textContent = '请先连接钱包'; unstakeBtn.disabled = true; }
}

// ═══════════════════════════════════════════
//            Load Data
// ═══════════════════════════════════════════

async function loadTokenStakingData() {
  if (!isConnected()) return;

  try {
    const provider = getProvider();
    const address = getAddress();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, provider);
    const token = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);

    // 并行加载
    const [userInfo, aprBps, minLock, paused, totalStaked, poolBalance, walletBalance] = await Promise.all([
      staking.getUserInfo(address).catch(() => [0n, 0n, 0n, 0n]),
      staking.aprBps().catch(() => 0n),
      staking.minLockDuration().catch(() => 0n),
      staking.paused().catch(() => false),
      staking.totalStaked().catch(() => 0n),
      staking.rewardPoolBalance().catch(() => 0n),
      token.balanceOf(address).catch(() => 0n),
    ]);

    const [stakedAmount, pending, stakedAt, unlockTime] = userInfo;

    // ── 更新统计卡片 ──
    const aprPercent = (Number(aprBps) / 100).toFixed(1);
    setVal('ts-apr', aprPercent + '%');
    setVal('ts-my-staked', fmtToken(stakedAmount));
    setVal('ts-my-pending', fmtToken(pending));
    setVal('ts-total-staked', fmtToken(totalStaked));

    // ── 更新余额 ──
    setVal('ts-wallet-balance', '余额: ' + fmtToken(walletBalance));
    setVal('ts-staked-balance', '已质押: ' + fmtToken(stakedAmount));

    // ── 更新收益详情 ──
    const detailsEl = document.getElementById('ts-details');
    if (detailsEl) detailsEl.style.display = '';
    setVal('ts-detail-apr', aprPercent + '%');

    const lockSeconds = Number(minLock);
    setVal('ts-detail-lock', lockSeconds > 0 ? formatDuration(lockSeconds) : '无锁仓');
    setVal('ts-detail-pool', fmtToken(poolBalance) + ' GUGU');
    setVal('ts-detail-status', paused ? '⏸ 已暂停' : '🟢 运行中');

    // ── 锁仓提示 ──
    const lockNotice = document.getElementById('ts-lock-notice');
    if (lockNotice) {
      if (lockSeconds > 0) {
        lockNotice.style.display = '';
        setVal('ts-lock-text', '最低锁仓期: ' + formatDuration(lockSeconds));
      } else {
        lockNotice.style.display = 'none';
      }
    }

    // ── 解锁倒计时 ──
    updateCountdown(Number(unlockTime), Number(stakedAmount));

    // ── 操作卡片数值 ──
    const pendingStr = fmtToken(pending) + ' GUGU';
    setVal('ts-claim-amount', pendingStr);
    setVal('ts-compound-amount', pendingStr);
    setVal('ts-emergency-amount', fmtToken(stakedAmount) + ' GUGU');

  } catch (err) {
    console.error('loadTokenStakingData error:', err);
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDuration(seconds) {
  if (seconds <= 0) return '无';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天${hours > 0 ? ' ' + hours + ' 小时' : ''}`;
  if (hours > 0) return `${hours} 小时${mins > 0 ? ' ' + mins + ' 分' : ''}`;
  return `${mins} 分钟`;
}

function updateCountdown(unlockTime, stakedAmount) {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

  const countdownEl = document.getElementById('ts-countdown');
  const countdownText = document.getElementById('ts-countdown-text');
  if (!countdownEl || !countdownText) return;

  if (stakedAmount === 0 || unlockTime === 0) {
    countdownEl.style.display = 'none';
    return;
  }

  const tick = () => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = unlockTime - now;
    if (remaining <= 0) {
      countdownEl.style.display = 'none';
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      return;
    }
    countdownEl.style.display = '';
    countdownText.textContent = '解锁倒计时: ' + formatDuration(remaining);
  };

  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ═══════════════════════════════════════════
//            MAX Buttons
// ═══════════════════════════════════════════

async function onStakeMax() {
  if (!isConnected()) return;
  try {
    const provider = getProvider();
    const token = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);
    const balance = await token.balanceOf(getAddress());
    document.getElementById('ts-stake-amount').value = formatUnits(balance, 18);
  } catch (err) { handleError(err); }
}

async function onUnstakeMax() {
  if (!isConnected()) return;
  try {
    const provider = getProvider();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, provider);
    const info = await staking.getUserInfo(getAddress());
    document.getElementById('ts-unstake-amount').value = formatUnits(info[0], 18);
  } catch (err) { handleError(err); }
}

// ═══════════════════════════════════════════
//            Actions
// ═══════════════════════════════════════════

async function handleStake() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const amountStr = document.getElementById('ts-stake-amount').value;
  if (!amountStr || parseFloat(amountStr) <= 0) return showToast('请输入质押数量', 'error');

  const btn = document.getElementById('btn-do-stake');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const amount = parseUnits(amountStr, 18);

    // Check & approve
    const token = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, signer);
    const allowance = await token.allowance(getAddress(), TokenStaking_ADDRESS);
    if (allowance < amount) {
      showToast('授权 GUGU 中...', 'info');
      const approveTx = await token.approve(TokenStaking_ADDRESS, amount);
      await approveTx.wait();
      showToast('授权成功！', 'success');
    }

    // Stake
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.stake(amount);
    await waitForTx(tx, `✅ 已质押 ${amountStr} GUGU`);
    document.getElementById('ts-stake-amount').value = '';
    loadTokenStakingData();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '质押 GUGU'); }
}

async function handleUnstake() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const amountStr = document.getElementById('ts-unstake-amount').value;
  if (!amountStr || parseFloat(amountStr) <= 0) return showToast('请输入取出数量', 'error');

  const btn = document.getElementById('btn-do-unstake');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const amount = parseUnits(amountStr, 18);

    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.unstake(amount);
    await waitForTx(tx, `✅ 已取出 ${amountStr} GUGU + 奖励已发放`);
    document.getElementById('ts-unstake-amount').value = '';
    loadTokenStakingData();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '解除质押'); }
}

async function handleClaim() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-claim-rewards');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.claimRewards();
    await waitForTx(tx, '🎉 奖励已领取！');
    loadTokenStakingData();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '💰 领取奖励'); }
}

async function handleCompound() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-compound');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.compound();
    await waitForTx(tx, '🎉 奖励已复投到质押本金！');
    loadTokenStakingData();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '🔄 一键复投'); }
}

async function handleEmergency() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');

  // 二次确认
  if (!confirm('⚠️ 紧急提取会放弃所有未领取的奖励，是否继续？')) return;

  const btn = document.getElementById('btn-emergency');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const staking = new Contract(TokenStaking_ADDRESS, TokenStaking_ABI, signer);
    const tx = await staking.emergencyWithdraw();
    await waitForTx(tx, '✅ 紧急提取完成，本金已返回');
    loadTokenStakingData();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '⚠️ 紧急提取'); }
}
