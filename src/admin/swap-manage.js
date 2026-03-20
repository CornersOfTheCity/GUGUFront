// ═══════════════════════════════════════════
//      Admin — Swap 管理
// ═══════════════════════════════════════════

import { Contract, parseUnits } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import { TokenSwap_ADDRESS, TokenSwap_ABI } from '../config/contracts.js';
import { waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderSwapManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🔄 Swap 管理</h1>
        <p class="page-subtitle">管理交易对、流动性、手续费</p>
      </div>

      <div class="admin-grid">
        <!-- 合约信息 -->
        <div class="card">
          <div class="admin-section-title">📋 合约状态</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${TokenSwap_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="swap-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">手续费率</span>
            <span class="admin-info-value" id="swap-fee-rate">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">手续费接收地址</span>
            <span class="admin-info-value mono" id="swap-fee-recipient">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">交易对数量</span>
            <span class="admin-info-value" id="swap-pair-count">—</span>
          </div>
        </div>

        <!-- 手续费管理 -->
        <div class="card">
          <div class="admin-section-title">💸 手续费管理</div>
          <div class="admin-form">
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">手续费率 (‱, 最大 1000=10%)</label>
                <input class="input" id="new-fee-rate" type="number" placeholder="30 = 0.3%" />
              </div>
              <button class="btn btn-primary btn-sm" id="btn-set-fee-rate">更新</button>
            </div>
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">手续费接收地址</label>
                <input class="input" id="new-fee-recipient" placeholder="0x..." />
              </div>
              <button class="btn btn-primary btn-sm" id="btn-set-fee-recipient">更新</button>
            </div>
          </div>
        </div>

        <!-- 添加交易对 -->
        <div class="card">
          <div class="admin-section-title">➕ 添加交易对</div>
          <div class="admin-form">
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">Token A 地址</label>
                <input class="input" id="pair-token-a" placeholder="0x..." />
              </div>
              <div class="form-group">
                <label class="form-label">Token B 地址</label>
                <input class="input" id="pair-token-b" placeholder="0x..." />
              </div>
            </div>
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">A→B 比例 (1e18 精度)</label>
                <input class="input" id="pair-rate-a2b" type="text" placeholder="1000000000000000000 = 1:1" />
              </div>
              <div class="form-group">
                <label class="form-label">B→A 比例 (1e18 精度)</label>
                <input class="input" id="pair-rate-b2a" type="text" placeholder="1000000000000000000 = 1:1" />
              </div>
            </div>
            <button class="btn btn-accent" id="btn-add-pair">添加交易对</button>
          </div>
        </div>

        <!-- 流动性管理 -->
        <div class="card">
          <div class="admin-section-title">🏦 流动性管理</div>
          <div class="admin-form">
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">交易对 ID</label>
                <input class="input" id="liq-pair-id" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Token 地址</label>
                <input class="input" id="liq-token" placeholder="0x..." />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">数量 (完整单位, 如 1000)</label>
              <input class="input" id="liq-amount" type="number" placeholder="1000" />
            </div>
            <div class="admin-form-row">
              <button class="btn btn-accent" id="btn-add-liq">添加流动性</button>
              <button class="btn btn-outline" id="btn-remove-liq">移除流动性</button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">
              注意: 添加流动性前需先 approve Token 给 Swap 合约
            </p>
          </div>
        </div>
      </div>

      <!-- 交易对列表 -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="admin-section-title">📊 交易对列表</div>
        <div id="pair-list">
          <div class="loading-placeholder">
            <div class="loading-spinner-lg"></div>
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  loadSwapInfo();

  // 手续费率
  document.getElementById('btn-set-fee-rate').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-fee-rate');
    try {
      setButtonLoading(btn, true);
      const rate = document.getElementById('new-fee-rate').value.trim();
      if (!rate) return showToast('请填写费率', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.setFeeRate(parseInt(rate));
      await waitForTx(tx, '✅ 手续费率已更新');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新'); }
  });

  // 手续费接收地址
  document.getElementById('btn-set-fee-recipient').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-fee-recipient');
    try {
      setButtonLoading(btn, true);
      const addr = document.getElementById('new-fee-recipient').value.trim();
      if (!addr) return showToast('请填写地址', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.setFeeRecipient(addr);
      await waitForTx(tx, '✅ 手续费接收地址已更新');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新'); }
  });

  // 添加交易对
  document.getElementById('btn-add-pair').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-add-pair');
    try {
      setButtonLoading(btn, true);
      const tokenA = document.getElementById('pair-token-a').value.trim();
      const tokenB = document.getElementById('pair-token-b').value.trim();
      const rateA2B = document.getElementById('pair-rate-a2b').value.trim();
      const rateB2A = document.getElementById('pair-rate-b2a').value.trim();
      if (!tokenA || !tokenB || !rateA2B || !rateB2A) return showToast('请完整填写', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.addPair(tokenA, tokenB, rateA2B, rateB2A);
      await waitForTx(tx, '✅ 交易对已添加');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '添加交易对'); }
  });

  // 添加流动性
  document.getElementById('btn-add-liq').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-add-liq');
    try {
      setButtonLoading(btn, true);
      const pairId = document.getElementById('liq-pair-id').value.trim();
      const token = document.getElementById('liq-token').value.trim();
      const amount = document.getElementById('liq-amount').value.trim();
      if (!pairId || !token || !amount) return showToast('请完整填写', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.addLiquidity(parseInt(pairId), token, parseUnits(amount, 18));
      await waitForTx(tx, '✅ 流动性已添加');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '添加流动性'); }
  });

  // 移除流动性
  document.getElementById('btn-remove-liq').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-remove-liq');
    try {
      setButtonLoading(btn, true);
      const pairId = document.getElementById('liq-pair-id').value.trim();
      const token = document.getElementById('liq-token').value.trim();
      const amount = document.getElementById('liq-amount').value.trim();
      if (!pairId || !token || !amount) return showToast('请完整填写', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.removeLiquidity(parseInt(pairId), token, parseUnits(amount, 18));
      await waitForTx(tx, '✅ 流动性已移除');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '移除流动性'); }
  });

  return () => {};
}

async function loadSwapInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);

    const [owner, feeRate, feeRecipient, pairCount] = await Promise.all([
      contract.owner().catch(() => '—'),
      contract.feeRate().catch(() => 0n),
      contract.feeRecipient().catch(() => '—'),
      contract.pairCount().catch(() => 0n),
    ]);

    setVal('swap-owner', owner);
    setVal('swap-fee-rate', `${Number(feeRate)} (${Number(feeRate) / 100}%)`);
    setVal('swap-fee-recipient', feeRecipient);
    setVal('swap-pair-count', Number(pairCount).toString());

    // 加载交易对列表
    const listEl = document.getElementById('pair-list');
    const count = Number(pairCount);
    if (count === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">暂无交易对</div></div>`;
      return;
    }

    let html = '';
    for (let i = 0; i < count; i++) {
      try {
        const pair = await contract.getPair(i);
        const shortA = pair.tokenA.slice(0, 8) + '...' + pair.tokenA.slice(-4);
        const shortB = pair.tokenB.slice(0, 8) + '...' + pair.tokenB.slice(-4);
        html += `
          <div class="card pair-card">
            <div class="pair-card-header">
              <span class="pair-id-badge">Pair #${i}</span>
              <span class="pair-status ${pair.active ? 'active' : 'inactive'}">
                ${pair.active ? '● 活跃' : '○ 暂停'}
              </span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">Token A</span>
              <span class="admin-info-value mono">${shortA}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">Token B</span>
              <span class="admin-info-value mono">${shortB}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">A→B 比例</span>
              <span class="admin-info-value">${pair.rateAtoB.toString()}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">B→A 比例</span>
              <span class="admin-info-value">${pair.rateBtoA.toString()}</span>
            </div>
            <div class="pair-actions">
              <button class="btn btn-sm btn-outline" onclick="window.__togglePair(${i}, ${!pair.active})">
                ${pair.active ? '暂停' : '恢复'}
              </button>
            </div>
          </div>
        `;
      } catch {}
    }
    listEl.innerHTML = html;
  } catch (err) {
    console.error('loadSwapInfo error:', err);
  }
}

// 暂停/恢复交易对
window.__togglePair = async (pairId, active) => {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  try {
    const signer = getSigner();
    const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await contract.setPairActive(pairId, active);
    await waitForTx(tx, `✅ 交易对 #${pairId} 已${active ? '恢复' : '暂停'}`);
    loadSwapInfo();
  } catch (err) { handleError(err); }
};

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
