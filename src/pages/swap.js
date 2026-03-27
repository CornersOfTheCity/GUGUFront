// ═══════════════════════════════════════════
//          Token Sale Page (Buy GUGU)
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getProvider, getAddress } from '../modules/wallet.js';
import {
  TokenSwap_ADDRESS, TokenSwap_ABI,
  GUGUToken_ABI,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

// ── State ──
let saleTokenAddr = null;
let payTokenAddr = null;
let saleSymbol = 'GUGU';
let paySymbol = 'USDT';
let saleDecimals = 18;
let payDecimals = 18;
let currentPrice = 0n;
let isPaused = false;
let debounceTimer = null;

export async function renderSwapPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">购买 GUGU</h1>
        <p class="page-subtitle">使用稳定币购买 GUGU 代币，固定价格，即时到账</p>
      </div>

      <div class="swap-container">
        <div class="card card-glass swap-card slide-up">
          <!-- From: Pay token -->
          <div class="swap-input-group">
            <div class="swap-input-header">
              <span class="swap-label" id="from-label">支付</span>
              <span class="swap-balance" id="from-balance">余额: —</span>
            </div>
            <div class="swap-input-row">
              <input type="number" class="input swap-amount-input" id="from-amount" placeholder="0.0" min="0" step="any" />
              <div class="swap-token-badge" id="from-token-name">—</div>
            </div>
            <button class="btn btn-ghost btn-sm swap-max-btn" id="max-btn">MAX</button>
          </div>

          <!-- Direction indicator (static, no toggle) -->
          <div class="swap-direction-wrapper">
            <div class="swap-direction-btn" style="cursor: default;">
              <span class="swap-direction-icon">↓</span>
            </div>
          </div>

          <!-- To: Sale token (GUGU) -->
          <div class="swap-input-group">
            <div class="swap-input-header">
              <span class="swap-label" id="to-label">获得</span>
              <span class="swap-balance" id="to-balance">余额: —</span>
            </div>
            <div class="swap-input-row">
              <input type="number" class="input swap-amount-input" id="to-amount" placeholder="0.0" readonly />
              <div class="swap-token-badge" id="to-token-name">—</div>
            </div>
          </div>

          <!-- Details -->
          <div class="swap-details" id="swap-details" style="display:none">
            <div class="swap-detail-row">
              <span>单价</span>
              <span id="swap-rate">—</span>
            </div>
            <div class="swap-detail-row">
              <span>剩余供应</span>
              <span id="swap-remaining">—</span>
            </div>
          </div>

          <!-- Buy button -->
          <button class="btn btn-primary btn-lg btn-full swap-action-btn" id="swap-btn" disabled>
            加载中...
          </button>
        </div>

        <!-- Stats -->
        <div class="swap-stats slide-up" style="animation-delay:0.15s">
          <div class="stats-grid">
            <div class="card stat-card">
              <div class="stat-value" id="stat-price">—</div>
              <div class="stat-label">GUGU 单价</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value" id="stat-remaining">—</div>
              <div class="stat-label">剩余可售</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value" id="stat-status">—</div>
              <div class="stat-label">销售状态</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Load data ──
  await loadSaleInfo();

  // ── Event listeners ──
  document.getElementById('from-amount').addEventListener('input', onAmountInput);
  document.getElementById('max-btn').addEventListener('click', onMaxClick);
  document.getElementById('swap-btn').addEventListener('click', handleBuy);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ═══════════════════════════════════════════
//            Load Contract Data
// ═══════════════════════════════════════════

async function loadSaleInfo() {
  try {
    const provider = getProvider();
    if (!provider) {
      updateBtnState();
      return;
    }

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const ERC20_META = [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ];

    // Read contract state
    const [saleTkn, payTkn, price, paused, remaining] = await Promise.all([
      swap.saleToken(),
      swap.payToken(),
      swap.price(),
      swap.paused(),
      swap.remainingSupply(),
    ]);

    saleTokenAddr = saleTkn;
    payTokenAddr = payTkn;
    currentPrice = price;
    isPaused = paused;

    // Fetch token metadata
    try {
      const saleContract = new Contract(saleTkn, ERC20_META, provider);
      saleSymbol = await saleContract.symbol();
      saleDecimals = Number(await saleContract.decimals());
    } catch { saleSymbol = 'GUGU'; saleDecimals = 18; }

    try {
      const payContract = new Contract(payTkn, ERC20_META, provider);
      paySymbol = await payContract.symbol();
      payDecimals = Number(await payContract.decimals());
    } catch { paySymbol = 'USDT'; payDecimals = 18; }

    // Update token labels
    document.getElementById('from-token-name').textContent = paySymbol;
    document.getElementById('to-token-name').textContent = saleSymbol;

    // Update price display
    const priceFormatted = formatUnits(currentPrice, 18);
    const priceNum = parseFloat(priceFormatted);
    document.getElementById('swap-rate').textContent = `1 ${saleSymbol} = ${priceNum} ${paySymbol}`;
    document.getElementById('stat-price').textContent = `${priceNum} ${paySymbol}`;

    // Update remaining supply
    const remainingFormatted = fmtToken(remaining, saleDecimals);
    document.getElementById('swap-remaining').textContent = `${remainingFormatted} ${saleSymbol}`;
    document.getElementById('stat-remaining').textContent = remainingFormatted;

    // Update status
    document.getElementById('stat-status').textContent = isPaused ? '⏸ 已暂停' : '🟢 销售中';

    // Load user balances
    await loadBalances();

    // Show details section
    document.getElementById('swap-details').style.display = '';

    updateBtnState();
  } catch (err) {
    console.error('loadSaleInfo error:', err);
    updateBtnState();
  }
}

async function loadBalances() {
  try {
    const provider = getProvider();
    const address = getAddress();
    if (!provider || !address || !payTokenAddr || !saleTokenAddr) return;

    const payContract = new Contract(payTokenAddr, GUGUToken_ABI, provider);
    const saleContract = new Contract(saleTokenAddr, GUGUToken_ABI, provider);

    try {
      const payBal = await payContract.balanceOf(address);
      document.getElementById('from-balance').textContent = `余额: ${fmtToken(payBal, payDecimals)}`;
    } catch {
      document.getElementById('from-balance').textContent = '余额: —';
    }

    try {
      const saleBal = await saleContract.balanceOf(address);
      document.getElementById('to-balance').textContent = `余额: ${fmtToken(saleBal, saleDecimals)}`;
    } catch {
      document.getElementById('to-balance').textContent = '余额: —';
    }
  } catch {
    // silently handle
  }
}

function updateBtnState() {
  const btn = document.getElementById('swap-btn');
  if (!btn) return;

  if (!isConnected()) {
    btn.textContent = '请先连接钱包';
    btn.disabled = true;
  } else if (isPaused) {
    btn.textContent = '销售已暂停';
    btn.disabled = true;
  } else {
    btn.textContent = '输入金额';
    btn.disabled = true;
  }
}

// ═══════════════════════════════════════════
//            Event Handlers
// ═══════════════════════════════════════════

function onAmountInput(e) {
  const val = e.target.value;
  if (!val || parseFloat(val) <= 0) {
    document.getElementById('to-amount').value = '';
    updateBtnState();
    return;
  }

  // Debounce the quote request
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchQuote(val), 350);
}

async function onMaxClick() {
  try {
    const provider = getProvider();
    const address = getAddress();
    if (!provider || !address) {
      showToast('请先连接钱包', 'error');
      return;
    }

    if (!payTokenAddr) return;

    const tokenContract = new Contract(payTokenAddr, GUGUToken_ABI, provider);
    const balance = await tokenContract.balanceOf(address);
    const formatted = formatUnits(balance, payDecimals);

    document.getElementById('from-amount').value = formatted;
    fetchQuote(formatted);
  } catch (err) {
    handleError(err);
  }
}

async function fetchQuote(amountStr) {
  try {
    const provider = getProvider();
    if (!provider || currentPrice === 0n) return;

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const payAmount = parseUnits(amountStr, payDecimals);

    const amountOut = await swap.getAmountOut(payAmount);

    document.getElementById('to-amount').value = parseFloat(formatUnits(amountOut, saleDecimals)).toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false });

    // Enable buy button
    const btn = document.getElementById('swap-btn');
    if (!isPaused && isConnected() && parseFloat(amountStr) > 0) {
      btn.disabled = false;
      btn.textContent = '购买 ' + saleSymbol;
    }
  } catch (err) {
    document.getElementById('to-amount').value = '';
    const btn = document.getElementById('swap-btn');
    btn.disabled = true;
    btn.textContent = '供应不足或输入无效';
  }
}

// ═══════════════════════════════════════════
//            Execute Buy
// ═══════════════════════════════════════════

async function handleBuy() {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  const amountStr = document.getElementById('from-amount').value;
  if (!amountStr || parseFloat(amountStr) <= 0) {
    showToast('请输入支付数量', 'error');
    return;
  }

  if (isPaused) {
    showToast('销售已暂停', 'error');
    return;
  }

  const btn = document.getElementById('swap-btn');
  const originalText = '购买 ' + saleSymbol;

  try {
    setButtonLoading(btn, true);

    const signer = getSigner();
    const payAmount = parseUnits(amountStr, payDecimals);

    // 1. Check & approve pay token
    const tokenContract = new Contract(payTokenAddr, GUGUToken_ABI, signer);
    const allowance = await tokenContract.allowance(getAddress(), TokenSwap_ADDRESS);

    if (allowance < payAmount) {
      showToast('授权 ' + paySymbol + ' 中...', 'info');
      const approveTx = await tokenContract.approve(TokenSwap_ADDRESS, payAmount);
      await approveTx.wait();
      showToast('授权成功！', 'success');
    }

    // 2. Buy
    const swapContract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swapContract.buy(payAmount);

    const expectedOut = document.getElementById('to-amount').value;
    await waitForTx(tx, `🎉 成功使用 ${amountStr} ${paySymbol} 购买了 ${expectedOut} ${saleSymbol}！`);

    // 3. Refresh
    document.getElementById('from-amount').value = '';
    document.getElementById('to-amount').value = '';
    updateBtnState();
    loadBalances();
    // Refresh remaining supply
    loadSaleInfo();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, originalText);
  }
}
