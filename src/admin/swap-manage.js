// ═══════════════════════════════════════════
//      Admin — Token Sale 管理
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import { TokenSwap_ADDRESS, TokenSwap_ABI, GUGUToken_ABI } from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

let saleSymbol = 'GUGU';
let paySymbol = 'USDT';
let saleDecimals = 18;
let payDecimals = 18;

export async function renderSwapManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🔄 代币销售管理</h1>
        <p class="page-subtitle">管理 GUGU 代币销售：价格、暂停、提取</p>
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
            <span class="admin-info-label">销售代币</span>
            <span class="admin-info-value mono" id="swap-sale-token">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">支付代币</span>
            <span class="admin-info-value mono" id="swap-pay-token">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">当前价格</span>
            <span class="admin-info-value" id="swap-price">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">剩余供应</span>
            <span class="admin-info-value" id="swap-remaining">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">销售状态</span>
            <span class="admin-info-value" id="swap-paused">—</span>
          </div>
        </div>

        <!-- 价格管理 -->
        <div class="card">
          <div class="admin-section-title">💰 价格管理</div>
          <div class="admin-form">
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">新价格 (1 GUGU = ? USDT，1e18 精度)</label>
                <input class="input" id="new-price" type="text" placeholder="如 0.1 表示 1 GUGU = 0.1 USDT" />
                <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">
                  输入人类可读数字，如 0.1, 0.05, 1 等
                </p>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-set-price">更新价格</button>
            </div>
          </div>
        </div>

        <!-- 暂停/恢复 -->
        <div class="card">
          <div class="admin-section-title">⏸ 销售控制</div>
          <div class="admin-form">
            <div class="admin-form-row">
              <button class="btn btn-accent" id="btn-pause">暂停销售</button>
              <button class="btn btn-primary" id="btn-resume">恢复销售</button>
            </div>
          </div>
        </div>

        <!-- 提取资金 -->
        <div class="card">
          <div class="admin-section-title">💸 提取资金</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">代币地址</label>
              <input class="input" id="withdraw-token" placeholder="0x... (ERC-20 代币地址)" />
            </div>
            <div class="form-group">
              <label class="form-label">提取数量 (完整单位，如 1000)</label>
              <input class="input" id="withdraw-amount" type="number" placeholder="1000" />
            </div>
            <div class="admin-form-row">
              <button class="btn btn-accent" id="btn-withdraw-token">提取代币</button>
              <button class="btn btn-outline" id="btn-withdraw-eth">提取 BNB</button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">
              提取代币需要填写代币地址和数量，提取 BNB 将提取合约中全部 BNB
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  loadSwapInfo();

  // 更新价格
  document.getElementById('btn-set-price').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-price');
    try {
      setButtonLoading(btn, true);
      const priceStr = document.getElementById('new-price').value.trim();
      if (!priceStr) return showToast('请填写价格', 'error');
      const priceWei = parseUnits(priceStr, 18);
      if (priceWei === 0n) return showToast('价格不能为 0', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.setPrice(priceWei);
      await waitForTx(tx, '✅ 价格已更新');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新价格'); }
  });

  // 暂停销售
  document.getElementById('btn-pause').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-pause');
    try {
      setButtonLoading(btn, true);
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.setPaused(true);
      await waitForTx(tx, '✅ 销售已暂停');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '暂停销售'); }
  });

  // 恢复销售
  document.getElementById('btn-resume').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-resume');
    try {
      setButtonLoading(btn, true);
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.setPaused(false);
      await waitForTx(tx, '✅ 销售已恢复');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '恢复销售'); }
  });

  // 提取代币
  document.getElementById('btn-withdraw-token').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-withdraw-token');
    try {
      setButtonLoading(btn, true);
      const token = document.getElementById('withdraw-token').value.trim();
      const amount = document.getElementById('withdraw-amount').value.trim();
      if (!token || !amount) return showToast('请完整填写', 'error');
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.withdrawToken(token, parseUnits(amount, 18));
      await waitForTx(tx, '✅ 代币已提取');
      loadSwapInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '提取代币'); }
  });

  // 提取 BNB
  document.getElementById('btn-withdraw-eth').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-withdraw-eth');
    try {
      setButtonLoading(btn, true);
      const signer = getSigner();
      const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await contract.withdrawETH();
      await waitForTx(tx, '✅ BNB 已提取');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '提取 BNB'); }
  });

  return () => {};
}

async function loadSwapInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);

    const ERC20_META = [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ];

    const [owner, saleTkn, payTkn, price, paused, remaining] = await Promise.all([
      contract.owner().catch(() => '—'),
      contract.saleToken().catch(() => null),
      contract.payToken().catch(() => null),
      contract.price().catch(() => 0n),
      contract.paused().catch(() => false),
      contract.remainingSupply().catch(() => 0n),
    ]);

    setVal('swap-owner', owner);
    setVal('swap-paused', paused ? '⏸ 已暂停' : '🟢 销售中');

    if (saleTkn) {
      try {
        const sc = new Contract(saleTkn, ERC20_META, provider);
        saleSymbol = await sc.symbol();
        saleDecimals = Number(await sc.decimals());
      } catch { saleSymbol = 'GUGU'; }
      setVal('swap-sale-token', `${saleSymbol} (${saleTkn.slice(0, 8)}...${saleTkn.slice(-4)})`);
    }

    if (payTkn) {
      try {
        const pc = new Contract(payTkn, ERC20_META, provider);
        paySymbol = await pc.symbol();
        payDecimals = Number(await pc.decimals());
      } catch { paySymbol = 'USDT'; }
      setVal('swap-pay-token', `${paySymbol} (${payTkn.slice(0, 8)}...${payTkn.slice(-4)})`);
    }

    const priceFormatted = formatUnits(price, 18);
    setVal('swap-price', `1 ${saleSymbol} = ${parseFloat(priceFormatted)} ${paySymbol}`);
    setVal('swap-remaining', `${fmtToken(remaining, saleDecimals)} ${saleSymbol}`);

  } catch (err) {
    console.error('loadSwapInfo error:', err);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
