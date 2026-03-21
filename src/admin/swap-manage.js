// ═══════════════════════════════════════════
//      Admin — Swap 管理
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import { TokenSwap_ADDRESS, TokenSwap_ABI, GUGUToken_ABI } from '../config/contracts.js';
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
            <div class="form-group">
              <label class="form-label">汇率设置</label>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input class="input" id="pair-qty-a" type="number" placeholder="1" style="flex: 1; text-align: center;" />
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Token A</span>
                <span style="font-size: 1.2rem; font-weight: 700; color: var(--primary-light);">＝</span>
                <input class="input" id="pair-qty-b" type="number" placeholder="10" style="flex: 1; text-align: center;" />
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Token B</span>
              </div>
              <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">
                例如: 1 GUGU ＝ 10 USDT
              </p>
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
      const qtyA = document.getElementById('pair-qty-a').value.trim() || '1';
      const qtyB = document.getElementById('pair-qty-b').value.trim();
      if (!tokenA || !tokenB || !qtyB) return showToast('请完整填写', 'error');
      const a = parseFloat(qtyA);
      const b = parseFloat(qtyB);
      if (a <= 0 || b <= 0) return showToast('数量必须大于 0', 'error');
      const rateA2B = (b / a).toFixed(18);
      const rateB2A = (a / b).toFixed(18);
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.addPair(tokenA, tokenB, parseUnits(rateA2B, 18), parseUnits(rateB2A, 18));
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
      const amountWei = parseUnits(amount, 18);

      // 自动 approve
      const tokenContract = new Contract(token, GUGUToken_ABI, signer);
      const currentAllowance = await tokenContract.allowance(await signer.getAddress(), TokenSwap_ADDRESS);
      if (currentAllowance < amountWei) {
        showToast('正在授权 Token...', 'info');
        const approveTx = await tokenContract.approve(TokenSwap_ADDRESS, amountWei);
        await waitForTx(approveTx, '✅ Token 授权成功');
      }

      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.addLiquidity(parseInt(pairId), token, amountWei);
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

    // 读取 token symbol
    const ERC20_SYM = ['function symbol() view returns (string)'];
    async function getSymbol(addr) {
      try {
        const c = new Contract(addr, ERC20_SYM, provider);
        return await c.symbol();
      } catch { return addr.slice(0, 6) + '…' + addr.slice(-4); }
    }

    let html = '';
    for (let i = 0; i < count; i++) {
      try {
        const pair = await contract.getPair(i);
        const symA = await getSymbol(pair.tokenA);
        const symB = await getSymbol(pair.tokenB);
        const rateA2B = formatUnits(pair.rateAtoB, 18);
        const rateB2A = formatUnits(pair.rateBtoA, 18);
        html += `
          <div class="card pair-card">
            <div class="pair-card-header">
              <span class="pair-id-badge">Pair #${i}</span>
              <span class="pair-status ${pair.active ? 'active' : 'inactive'}">
                ${pair.active ? '● 活跃' : '○ 暂停'}
              </span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">Token A (${symA})</span>
              <span class="admin-info-value mono">${pair.tokenA.slice(0, 8)}...${pair.tokenA.slice(-4)}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">Token B (${symB})</span>
              <span class="admin-info-value mono">${pair.tokenB.slice(0, 8)}...${pair.tokenB.slice(-4)}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">${symA}→${symB} 汇率</span>
              <span class="admin-info-value">1 ${symA} = ${parseFloat(rateA2B)} ${symB}</span>
            </div>
            <div class="admin-info-row">
              <span class="admin-info-label">${symB}→${symA} 汇率</span>
              <span class="admin-info-value">1 ${symB} = ${parseFloat(rateB2A)} ${symA}</span>
            </div>
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
              <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">修改汇率</div>
              <div class="form-group">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <input class="input" id="rate-qty-a-${i}" type="number" placeholder="${parseFloat(rateB2A) === 1 ? '1' : '1'}" value="1" style="flex: 1; text-align: center;" />
                  <span style="font-size: 0.8rem; color: var(--text-secondary);">${symA}</span>
                  <span style="font-size: 1.2rem; font-weight: 700; color: var(--primary-light);">＝</span>
                  <input class="input" id="rate-qty-b-${i}" type="number" placeholder="${parseFloat(rateA2B)}" style="flex: 1; text-align: center;" />
                  <span style="font-size: 0.8rem; color: var(--text-secondary);">${symB}</span>
                </div>
              </div>
              <div class="pair-actions">
                <button class="btn btn-sm btn-primary" onclick="window.__updateRates(${i})">更新汇率</button>
                <button class="btn btn-sm btn-outline" onclick="window.__togglePair(${i}, ${!pair.active})">
                  ${pair.active ? '停用' : '启用'}
                </button>
              </div>
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
    await waitForTx(tx, `✅ 交易对 #${pairId} 已${active ? '启用' : '停用'}`);
    loadSwapInfo();
  } catch (err) { handleError(err); }
};

// 更新汇率
window.__updateRates = async (pairId) => {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  try {
    const qtyA = document.getElementById(`rate-qty-a-${pairId}`).value.trim() || '1';
    const qtyB = document.getElementById(`rate-qty-b-${pairId}`).value.trim();
    if (!qtyB) return showToast('请填写汇率', 'error');
    const a = parseFloat(qtyA);
    const b = parseFloat(qtyB);
    if (a <= 0 || b <= 0) return showToast('数量必须大于 0', 'error');
    const rateA2B = (b / a).toFixed(18);
    const rateB2A = (a / b).toFixed(18);
    const signer = getSigner();
    const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await contract.updatePairRates(pairId, parseUnits(rateA2B, 18), parseUnits(rateB2A, 18));
    await waitForTx(tx, `✅ 交易对 #${pairId} 汇率已更新`);
    loadSwapInfo();
  } catch (err) { handleError(err); }
};

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
