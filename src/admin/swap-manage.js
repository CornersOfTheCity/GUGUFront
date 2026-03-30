// ═══════════════════════════════════════════
//      Admin — TokenSwap 管理 (多币种+回购)
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import { TokenSwap_ADDRESS, TokenSwap_ABI, GUGUToken_ABI } from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

const ERC20_META = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

let saleSymbol = 'GUGU';
let saleDecimals = 18;

export async function renderSwapManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🔄 Swap 管理 (多币种)</h1>
        <p class="page-subtitle">管理支付代币、价格、回购、暂停与提取</p>
      </div>

      <div class="admin-grid">
        <!-- 合约信息 -->
        <div class="card">
          <div class="admin-section-title">📋 合约信息</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${TokenSwap_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="swap-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">销售代币</span>
            <span class="admin-info-value mono" id="swap-sale-token">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">GUGU 剩余库存</span>
            <span class="admin-info-value" id="swap-remaining">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约状态</span>
            <span class="admin-info-value" id="swap-paused">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">回购状态</span>
            <span class="admin-info-value" id="swap-buyback">—</span>
          </div>
        </div>

        <!-- 已添加的支付代币列表 -->
        <div class="card">
          <div class="admin-section-title">💱 已添加支付代币</div>
          <div id="pay-token-list" style="min-height: 60px;">
            <p style="color: var(--text-muted); text-align: center; padding: 1rem;">加载中...</p>
          </div>
        </div>

        <!-- 添加代币 -->
        <div class="card">
          <div class="admin-section-title">➕ 添加支付代币</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">代币合约地址</label>
              <input class="input" id="add-token-addr" placeholder="0x..." />
            </div>
            <div class="form-group">
              <label class="form-label">买入价 (1 GUGU = ? Token)</label>
              <input class="input" id="add-buy-price" type="text" placeholder="例: 0.1" />
            </div>
            <div class="form-group">
              <label class="form-label">回购价 (1 GUGU = ? Token, 0则不支持回购)</label>
              <input class="input" id="add-sell-price" type="text" placeholder="例: 0.08 或 0" />
            </div>
            <button class="btn btn-primary" id="btn-add-token" style="width: 100%; margin-top: 0.75rem;">➕ 添加代币</button>
          </div>
        </div>

        <!-- 控制面板 -->
        <div class="card">
          <div class="admin-section-title">⚙️ 控制面板</div>

          <!-- 回购开关 -->
          <div style="margin-bottom: 1.5rem;">
            <div class="form-label" style="margin-bottom: 0.5rem;">回购开关</div>
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-primary" id="btn-buyback-on" style="flex:1;">🟢 开启回购</button>
              <button class="btn btn-outline" id="btn-buyback-off" style="flex:1;">🔴 关闭回购</button>
            </div>
          </div>

          <!-- 暂停/恢复 -->
          <div style="margin-bottom: 1.5rem;">
            <div class="form-label" style="margin-bottom: 0.5rem;">合约暂停</div>
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-accent" id="btn-pause" style="flex:1;">⏸ 暂停</button>
              <button class="btn btn-primary" id="btn-resume" style="flex:1;">▶️ 恢复</button>
            </div>
          </div>

          <!-- 提取 -->
          <div style="border-top: 1px solid var(--border); padding-top: 1.25rem;">
            <div class="admin-section-title">💸 提取资金</div>
            <div class="form-group">
              <label class="form-label">代币地址</label>
              <input class="input" id="withdraw-token" placeholder="0x..." />
            </div>
            <div class="form-group">
              <label class="form-label">提取数量</label>
              <input class="input" id="withdraw-amount" type="number" placeholder="1000" />
            </div>
            <div style="display: flex; gap: 0.75rem; margin-top: 0.75rem;">
              <button class="btn btn-accent" id="btn-withdraw-token" style="flex:1;">提取代币</button>
              <button class="btn btn-outline" id="btn-withdraw-eth" style="flex:1;">提取 BNB</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Bind ──
  document.getElementById('btn-add-token').addEventListener('click', handleAddToken);
  document.getElementById('btn-buyback-on').addEventListener('click', () => toggleBuyback(true));
  document.getElementById('btn-buyback-off').addEventListener('click', () => toggleBuyback(false));
  document.getElementById('btn-pause').addEventListener('click', () => togglePause(true));
  document.getElementById('btn-resume').addEventListener('click', () => togglePause(false));
  document.getElementById('btn-withdraw-token').addEventListener('click', handleWithdrawToken);
  document.getElementById('btn-withdraw-eth').addEventListener('click', handleWithdrawETH);

  loadSwapInfo();
  return () => {};
}

// ═══════════════════════════════════════════
//            Load Info
// ═══════════════════════════════════════════

async function loadSwapInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);

    const [owner, saleTkn, paused, buyback, remaining, tokenAddrs] = await Promise.all([
      swap.owner().catch(() => '—'),
      swap.saleToken().catch(() => null),
      swap.paused().catch(() => false),
      swap.buybackEnabled().catch(() => false),
      swap.remainingSupply().catch(() => 0n),
      swap.getPayTokenList().catch(() => []),
    ]);

    setVal('swap-owner', owner);
    setVal('swap-paused', paused ? '⏸ 已暂停' : '🟢 运行中');
    setVal('swap-buyback', buyback ? '🟢 已开启' : '🔴 未开启');

    if (saleTkn) {
      try {
        const sc = new Contract(saleTkn, ERC20_META, provider);
        saleSymbol = await sc.symbol();
        saleDecimals = Number(await sc.decimals());
      } catch { saleSymbol = 'GUGU'; }
      setVal('swap-sale-token', `${saleSymbol} (${saleTkn.slice(0, 8)}...${saleTkn.slice(-4)})`);
    }

    setVal('swap-remaining', `${fmtToken(remaining, saleDecimals)} ${saleSymbol}`);

    // Build token list
    await buildTokenList(swap, tokenAddrs, provider);

  } catch (err) {
    console.error('loadSwapInfo error:', err);
  }
}

async function buildTokenList(swap, tokenAddrs, provider) {
  const container = document.getElementById('pay-token-list');
  if (!tokenAddrs || tokenAddrs.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无支付代币，请先添加</p>';
    return;
  }

  let html = '';
  for (const addr of tokenAddrs) {
    try {
      const info = await swap.getPayTokenInfo(addr);
      let sym = '???';
      try { sym = await new Contract(addr, ERC20_META, provider).symbol(); } catch {}

      const buyP = parseFloat(formatUnits(info[0], 18));
      const sellP = parseFloat(formatUnits(info[1], 18));
      const enabled = info[2];

      // Get contract balance of this token
      let bal = '—';
      try {
        const tc = new Contract(addr, ERC20_META, provider);
        const b = await tc.balanceOf(TokenSwap_ADDRESS);
        bal = fmtToken(b, 18);
      } catch {}

      html += `
        <div class="admin-token-row" data-addr="${addr}">
          <div class="admin-token-info">
            <div class="admin-token-symbol">${sym}</div>
            <div class="admin-token-addr">${addr.slice(0, 10)}...${addr.slice(-6)}</div>
            <div class="admin-token-meta">
              买入: ${buyP} | 回购: ${sellP || '—'} | 状态: ${enabled ? '✅' : '❌'} | 库存: ${bal}
            </div>
          </div>
          <div class="admin-token-actions">
            <button class="btn btn-sm btn-outline btn-edit-price" data-addr="${addr}" data-buy="${buyP}" data-sell="${sellP}">修改价格</button>
            <button class="btn btn-sm btn-outline btn-toggle-token" data-addr="${addr}" data-enabled="${enabled}">${enabled ? '禁用' : '启用'}</button>
            <button class="btn btn-sm btn-outline btn-remove-token" data-addr="${addr}">删除</button>
          </div>
        </div>
      `;
    } catch {}
  }

  container.innerHTML = html;

  // Bind edit/remove buttons
  container.querySelectorAll('.btn-edit-price').forEach(btn => {
    btn.addEventListener('click', () => handleEditPrice(btn.dataset.addr, btn.dataset.buy, btn.dataset.sell));
  });
  container.querySelectorAll('.btn-toggle-token').forEach(btn => {
    btn.addEventListener('click', () => handleToggleToken(btn.dataset.addr, btn.dataset.enabled === 'true'));
  });
  container.querySelectorAll('.btn-remove-token').forEach(btn => {
    btn.addEventListener('click', () => handleRemoveToken(btn.dataset.addr));
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═══════════════════════════════════════════
//            Handlers
// ═══════════════════════════════════════════

async function handleAddToken() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-add-token');
  try {
    setButtonLoading(btn, true);
    const addr = document.getElementById('add-token-addr').value.trim();
    const buyStr = document.getElementById('add-buy-price').value.trim();
    const sellStr = document.getElementById('add-sell-price').value.trim() || '0';

    if (!addr || !buyStr) return showToast('请填写地址和买入价', 'error');

    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.addPayToken(addr, parseUnits(buyStr, 18), parseUnits(sellStr, 18));
    await waitForTx(tx, '✅ 代币已添加');

    document.getElementById('add-token-addr').value = '';
    document.getElementById('add-buy-price').value = '';
    document.getElementById('add-sell-price').value = '';
    loadSwapInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '➕ 添加代币'); }
}

async function handleEditPrice(addr, oldBuy, oldSell) {
  const newBuy = prompt(`新买入价 (当前: ${oldBuy}):`, oldBuy);
  if (newBuy === null) return;
  const newSell = prompt(`新回购价 (当前: ${oldSell}):`, oldSell);
  if (newSell === null) return;

  if (!isConnected()) return showToast('请先连接钱包', 'error');

  try {
    showToast('更新价格中...', 'info');
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.setTokenPrices(addr, parseUnits(newBuy, 18), parseUnits(newSell, 18));
    await waitForTx(tx, '✅ 价格已更新');
    loadSwapInfo();
  } catch (err) { handleError(err); }
}

async function handleToggleToken(addr, currentlyEnabled) {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  try {
    showToast(currentlyEnabled ? '禁用中...' : '启用中...', 'info');
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.setTokenEnabled(addr, !currentlyEnabled);
    await waitForTx(tx, currentlyEnabled ? '✅ 已禁用' : '✅ 已启用');
    loadSwapInfo();
  } catch (err) { handleError(err); }
}

async function handleRemoveToken(addr) {
  if (!confirm('确认删除该支付代币？')) return;
  if (!isConnected()) return showToast('请先连接钱包', 'error');

  try {
    showToast('删除中...', 'info');
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.removePayToken(addr);
    await waitForTx(tx, '✅ 代币已删除');
    loadSwapInfo();
  } catch (err) { handleError(err); }
}

async function toggleBuyback(enabled) {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btnId = enabled ? 'btn-buyback-on' : 'btn-buyback-off';
  const btn = document.getElementById(btnId);
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.setBuybackEnabled(enabled);
    await waitForTx(tx, enabled ? '✅ 回购已开启' : '✅ 回购已关闭');
    loadSwapInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, enabled ? '🟢 开启回购' : '🔴 关闭回购'); }
}

async function togglePause(paused) {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btnId = paused ? 'btn-pause' : 'btn-resume';
  const btn = document.getElementById(btnId);
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.setPaused(paused);
    await waitForTx(tx, paused ? '⏸ 已暂停' : '▶️ 已恢复');
    loadSwapInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, paused ? '⏸ 暂停' : '▶️ 恢复'); }
}

async function handleWithdrawToken() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-withdraw-token');
  try {
    setButtonLoading(btn, true);
    const token = document.getElementById('withdraw-token').value.trim();
    const amount = document.getElementById('withdraw-amount').value.trim();
    if (!token || !amount) return showToast('请完整填写', 'error');

    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.withdrawToken(token, parseUnits(amount, 18));
    await waitForTx(tx, '✅ 代币已提取');
    loadSwapInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '提取代币'); }
}

async function handleWithdrawETH() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  const btn = document.getElementById('btn-withdraw-eth');
  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swap.withdrawETH();
    await waitForTx(tx, '✅ BNB 已提取');
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, '提取 BNB'); }
}
