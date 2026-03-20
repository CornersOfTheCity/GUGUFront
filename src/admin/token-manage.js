// ═══════════════════════════════════════════
//      Admin — Token 管理
// ═══════════════════════════════════════════

import { Contract, parseUnits } from 'ethers';
import { getSigner, isConnected, getProvider } from '../modules/wallet.js';
import { GUGUToken_ADDRESS, GUGUToken_ABI } from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderTokenManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🪙 Token 管理</h1>
        <p class="page-subtitle">GUGUToken 铸造、销毁与黑名单管理</p>
      </div>

      <div class="admin-grid">
        <!-- 合约状态 -->
        <div class="card">
          <div class="admin-section-title">📋 合约状态</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${GUGUToken_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="token-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">当前总供应</span>
            <span class="admin-info-value" id="token-supply">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">总量上限</span>
            <span class="admin-info-value" id="token-max-supply">—</span>
          </div>
        </div>

        <!-- 铸造 -->
        <div class="card">
          <div class="admin-section-title">⛏ 铸造 Token</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">接收地址</label>
              <input class="input" id="mint-to" placeholder="0x..." />
            </div>
            <div class="form-group">
              <label class="form-label">数量 (GUGU)</label>
              <input class="input" id="mint-amount" type="number" placeholder="1000" />
            </div>
            <button class="btn btn-primary" id="btn-mint">铸造</button>
          </div>
        </div>
      </div>

      <!-- 黑名单管理 -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="admin-section-title">🚫 黑名单管理</div>
        <div class="admin-form">
          <div class="form-group">
            <label class="form-label">地址</label>
            <input class="input" id="blacklist-addr" placeholder="0x..." />
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-danger" id="btn-add-blacklist">加入黑名单</button>
            <button class="btn btn-outline" id="btn-remove-blacklist">移除黑名单</button>
          </div>

          <div style="margin-top: 1.5rem;">
            <label class="form-label">🔍 查询黑名单状态</label>
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <input class="input" id="check-blacklist-addr" placeholder="输入地址查询..." style="flex: 1;" />
              <button class="btn btn-outline btn-sm" id="btn-check-blacklist">查询</button>
            </div>
            <div id="blacklist-result" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 加载合约状态
  loadTokenStatus();

  // ── 铸造 ──
  document.getElementById('btn-mint').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-mint');
    try {
      setButtonLoading(btn, true);
      const to = document.getElementById('mint-to').value.trim();
      const amount = document.getElementById('mint-amount').value.trim();
      if (!to || !amount) return showToast('请填写地址和数量', 'error');

      const contract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, getSigner());
      const tx = await contract.mint(to, parseUnits(amount, 18));
      await waitForTx(tx, `✅ 铸造 ${amount} GUGU 成功`);
      loadTokenStatus();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '铸造'); }
  });

  // ── 加入黑名单 ──
  document.getElementById('btn-add-blacklist').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-add-blacklist');
    try {
      setButtonLoading(btn, true);
      const addr = document.getElementById('blacklist-addr').value.trim();
      if (!addr) return showToast('请填写地址', 'error');

      const contract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, getSigner());
      const tx = await contract.addBlacklist(addr);
      await waitForTx(tx, `✅ 已加入黑名单`);
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '加入黑名单'); }
  });

  // ── 移除黑名单 ──
  document.getElementById('btn-remove-blacklist').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-remove-blacklist');
    try {
      setButtonLoading(btn, true);
      const addr = document.getElementById('blacklist-addr').value.trim();
      if (!addr) return showToast('请填写地址', 'error');

      const contract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, getSigner());
      const tx = await contract.removeBlacklist(addr);
      await waitForTx(tx, `✅ 已移除黑名单`);
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '移除黑名单'); }
  });

  // ── 查询黑名单 ──
  document.getElementById('btn-check-blacklist').addEventListener('click', async () => {
    const addr = document.getElementById('check-blacklist-addr').value.trim();
    if (!addr) return showToast('请填写地址', 'error');
    const resultEl = document.getElementById('blacklist-result');
    try {
      const provider = getProvider();
      const contract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);
      const isBlacklisted = await contract.blacklisted(addr);
      resultEl.innerHTML = isBlacklisted
        ? `<span style="color: #ef4444;">🚫 该地址已被加入黑名单</span>`
        : `<span style="color: #10b981;">✅ 该地址正常</span>`;
    } catch (err) {
      resultEl.textContent = '查询失败';
      handleError(err);
    }
  });

  return () => {};
}

async function loadTokenStatus() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);

    const [owner, supply, maxSupply] = await Promise.all([
      contract.owner().catch(() => '—'),
      contract.totalSupply().catch(() => 0n),
      contract.MAX_SUPPLY().catch(() => 0n),
    ]);

    const ownerEl = document.getElementById('token-owner');
    const supplyEl = document.getElementById('token-supply');
    const maxEl = document.getElementById('token-max-supply');
    if (ownerEl) ownerEl.textContent = owner;
    if (supplyEl) supplyEl.textContent = fmtToken(supply) + ' GUGU';
    if (maxEl) maxEl.textContent = fmtToken(maxSupply) + ' GUGU';
  } catch {}
}
