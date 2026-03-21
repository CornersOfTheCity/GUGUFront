// ═══════════════════════════════════════════
//          Token Swap Page
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getProvider, getAddress } from '../modules/wallet.js';
import {
  TokenSwap_ADDRESS, TokenSwap_ABI,
  GUGUToken_ADDRESS, GUGUToken_ABI,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

// ── State ──
let pairs = [];
let selectedPairId = 0;
let isReversed = false; // false = A→B, true = B→A
let debounceTimer = null;
const symbolCache = {}; // address -> symbol

export async function renderSwapPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">代币兑换</h1>
        <p class="page-subtitle">按固定汇率在代币之间快速兑换，低手续费</p>
      </div>

      <div class="swap-container">
        <div class="card card-glass swap-card slide-up">
          <!-- Pair selector -->
          <div class="swap-pair-selector" id="pair-selector-area">
            <label class="swap-label">交易对</label>
            <select class="input swap-select" id="pair-select">
              <option value="">加载中...</option>
            </select>
          </div>

          <!-- From -->
          <div class="swap-input-group">
            <div class="swap-input-header">
              <span class="swap-label" id="from-label">支出</span>
              <span class="swap-balance" id="from-balance">余额: —</span>
            </div>
            <div class="swap-input-row">
              <input type="number" class="input swap-amount-input" id="from-amount" placeholder="0.0" min="0" step="any" />
              <div class="swap-token-badge" id="from-token-name">—</div>
            </div>
            <button class="btn btn-ghost btn-sm swap-max-btn" id="max-btn">MAX</button>
          </div>

          <!-- Direction toggle -->
          <div class="swap-direction-wrapper">
            <button class="swap-direction-btn" id="direction-btn" title="切换方向">
              <span class="swap-direction-icon">⇅</span>
            </button>
          </div>

          <!-- To -->
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
              <span>汇率</span>
              <span id="swap-rate">—</span>
            </div>
            <div class="swap-detail-row">
              <span>手续费</span>
              <span id="swap-fee">—</span>
            </div>
            <div class="swap-detail-row">
              <span>手续费率</span>
              <span id="swap-fee-rate">—</span>
            </div>
          </div>

          <!-- Swap button -->
          <button class="btn btn-primary btn-lg btn-full swap-action-btn" id="swap-btn" disabled>
            选择交易对
          </button>
        </div>

        <!-- Stats -->
        <div class="swap-stats slide-up" style="animation-delay:0.15s">
          <div class="stats-grid">
            <div class="card stat-card">
              <div class="stat-value" id="stat-pairs">—</div>
              <div class="stat-label">交易对数量</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value" id="stat-fee-rate">—</div>
              <div class="stat-label">手续费率</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Load data ──
  await loadPairs();
  await loadFeeRate();

  // ── Event listeners ──
  document.getElementById('pair-select').addEventListener('change', onPairChange);
  document.getElementById('direction-btn').addEventListener('click', toggleDirection);
  document.getElementById('from-amount').addEventListener('input', onAmountInput);
  document.getElementById('max-btn').addEventListener('click', onMaxClick);
  document.getElementById('swap-btn').addEventListener('click', handleSwap);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ═══════════════════════════════════════════
//            Load Contract Data
// ═══════════════════════════════════════════

async function loadPairs() {
  try {
    const provider = getProvider();
    if (!provider) {
      setPairOptions([]);
      return;
    }

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const count = Number(await swap.pairCount());

    document.getElementById('stat-pairs').textContent = count;

    pairs = [];
    for (let i = 0; i < count; i++) {
      const pair = await swap.getPair(i);
      pairs.push({
        id: i,
        tokenA: pair.tokenA,
        tokenB: pair.tokenB,
        rateAtoB: pair.rateAtoB,
        rateBtoA: pair.rateBtoA,
        active: pair.active,
      });

      // Fetch and cache token symbols
      await fetchTokenSymbol(pair.tokenA, provider);
      await fetchTokenSymbol(pair.tokenB, provider);
    }

    setPairOptions(pairs);

    if (pairs.length > 0) {
      selectedPairId = 0;
      isReversed = false;
      updateTokenDisplay();
      loadBalances();
    }
  } catch {
    setPairOptions([]);
    document.getElementById('stat-pairs').textContent = '0';
  }
}

async function fetchTokenSymbol(address, provider) {
  if (symbolCache[address.toLowerCase()]) return;
  // Known tokens
  if (address.toLowerCase() === GUGUToken_ADDRESS.toLowerCase()) {
    symbolCache[address.toLowerCase()] = 'GUGU';
    return;
  }
  try {
    const tokenContract = new Contract(address, ['function symbol() view returns (string)'], provider);
    const sym = await tokenContract.symbol();
    symbolCache[address.toLowerCase()] = sym;
  } catch {
    symbolCache[address.toLowerCase()] = address.slice(0, 6) + '…' + address.slice(-4);
  }
}

async function loadFeeRate() {
  try {
    const provider = getProvider();
    if (!provider) return;

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const feeRate = Number(await swap.feeRate());
    const pct = (feeRate / 100).toFixed(2) + '%';

    document.getElementById('stat-fee-rate').textContent = pct;
    const feeRateEl = document.getElementById('swap-fee-rate');
    if (feeRateEl) feeRateEl.textContent = pct;
  } catch {
    // silently handle
  }
}

function setPairOptions(pairList) {
  const select = document.getElementById('pair-select');
  if (pairList.length === 0) {
    select.innerHTML = '<option value="">暂无交易对</option>';
    document.getElementById('swap-btn').textContent = '暂无可用交易对';
    return;
  }

  select.innerHTML = pairList.map((p, i) => {
    const labelA = shortAddr(p.tokenA);
    const labelB = shortAddr(p.tokenB);
    const status = p.active ? '' : ' (已暂停)';
    return `<option value="${i}">${getTokenSymbol(p.tokenA)} ⇄ ${getTokenSymbol(p.tokenB)}${status}</option>`;
  }).join('');
}

// ═══════════════════════════════════════════
//            UI Update Helpers
// ═══════════════════════════════════════════

function getTokenSymbol(address) {
  return symbolCache[address.toLowerCase()] || shortAddr(address);
}

function shortAddr(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function getFromToken() {
  const pair = pairs[selectedPairId];
  if (!pair) return null;
  return isReversed ? pair.tokenB : pair.tokenA;
}

function getToToken() {
  const pair = pairs[selectedPairId];
  if (!pair) return null;
  return isReversed ? pair.tokenA : pair.tokenB;
}

function updateTokenDisplay() {
  const fromToken = getFromToken();
  const toToken = getToToken();
  if (!fromToken || !toToken) return;

  document.getElementById('from-token-name').textContent = getTokenSymbol(fromToken);
  document.getElementById('to-token-name').textContent = getTokenSymbol(toToken);

  // Update rate display
  const pair = pairs[selectedPairId];
  const rate = isReversed ? pair.rateBtoA : pair.rateAtoB;
  const rateFormatted = formatUnits(rate, 18);
  const rateEl = document.getElementById('swap-rate');
  if (rateEl) {
    rateEl.textContent = `1 ${getTokenSymbol(fromToken)} = ${parseFloat(rateFormatted).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${getTokenSymbol(toToken)}`;
  }

  // Update swap button
  const btn = document.getElementById('swap-btn');
  if (pair.active) {
    btn.textContent = '兑换';
  } else {
    btn.textContent = '交易对已暂停';
    btn.disabled = true;
  }
}

async function loadBalances() {
  try {
    const provider = getProvider();
    const address = getAddress();
    if (!provider || !address) return;

    const fromToken = getFromToken();
    const toToken = getToToken();
    if (!fromToken || !toToken) return;

    const fromContract = new Contract(fromToken, GUGUToken_ABI, provider);
    const toContract = new Contract(toToken, GUGUToken_ABI, provider);

    try {
      const fromBal = await fromContract.balanceOf(address);
      document.getElementById('from-balance').textContent = `余额: ${fmtToken(fromBal)}`;
    } catch {
      document.getElementById('from-balance').textContent = '余额: —';
    }

    try {
      const toBal = await toContract.balanceOf(address);
      document.getElementById('to-balance').textContent = `余额: ${fmtToken(toBal)}`;
    } catch {
      document.getElementById('to-balance').textContent = '余额: —';
    }
  } catch {
    // silently handle
  }
}

// ═══════════════════════════════════════════
//            Event Handlers
// ═══════════════════════════════════════════

function onPairChange(e) {
  selectedPairId = Number(e.target.value);
  isReversed = false;
  updateTokenDisplay();
  loadBalances();
  clearAmounts();
}

function toggleDirection() {
  isReversed = !isReversed;
  updateTokenDisplay();
  loadBalances();

  // Animate
  const btn = document.getElementById('direction-btn');
  btn.classList.add('swap-direction-spin');
  setTimeout(() => btn.classList.remove('swap-direction-spin'), 300);

  // Recalculate if there's an amount
  const fromVal = document.getElementById('from-amount').value;
  if (fromVal) {
    fetchQuote(fromVal);
  } else {
    clearAmounts();
  }
}

function onAmountInput(e) {
  const val = e.target.value;
  if (!val || parseFloat(val) <= 0) {
    clearAmounts();
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

    const fromToken = getFromToken();
    if (!fromToken) return;

    const tokenContract = new Contract(fromToken, GUGUToken_ABI, provider);
    const balance = await tokenContract.balanceOf(address);
    const formatted = formatUnits(balance, 18);

    document.getElementById('from-amount').value = formatted;
    fetchQuote(formatted);
  } catch (err) {
    handleError(err);
  }
}

async function fetchQuote(amountStr) {
  try {
    const provider = getProvider();
    if (!provider || pairs.length === 0) return;

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const fromToken = getFromToken();
    const amountIn = parseUnits(amountStr, 18);

    const [amountOut, fee] = await swap.getAmountOut(selectedPairId, fromToken, amountIn);

    document.getElementById('to-amount').value = parseFloat(formatUnits(amountOut, 18)).toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false });
    document.getElementById('swap-fee').textContent = fmtToken(fee) + ' ' + getTokenSymbol(getToToken());

    // Show details
    document.getElementById('swap-details').style.display = '';

    // Enable swap button
    const btn = document.getElementById('swap-btn');
    const pair = pairs[selectedPairId];
    if (pair && pair.active && parseFloat(amountStr) > 0) {
      btn.disabled = false;
      btn.textContent = '兑换';
    }
  } catch (err) {
    document.getElementById('to-amount').value = '';
    document.getElementById('swap-details').style.display = 'none';
    const btn = document.getElementById('swap-btn');
    btn.disabled = true;
    btn.textContent = '流动性不足或输入无效';
  }
}

function clearAmounts() {
  document.getElementById('to-amount').value = '';
  document.getElementById('swap-details').style.display = 'none';
  const btn = document.getElementById('swap-btn');
  const pair = pairs[selectedPairId];
  if (pair && pair.active) {
    btn.textContent = '输入金额';
    btn.disabled = true;
  }
}

// ═══════════════════════════════════════════
//            Execute Swap
// ═══════════════════════════════════════════

async function handleSwap() {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  const amountStr = document.getElementById('from-amount').value;
  if (!amountStr || parseFloat(amountStr) <= 0) {
    showToast('请输入兑换数量', 'error');
    return;
  }

  const pair = pairs[selectedPairId];
  if (!pair || !pair.active) {
    showToast('交易对不可用', 'error');
    return;
  }

  const btn = document.getElementById('swap-btn');
  const originalText = '兑换';

  try {
    setButtonLoading(btn, true);

    const signer = getSigner();
    const fromToken = getFromToken();
    const amountIn = parseUnits(amountStr, 18);

    // 1. Check & approve
    const tokenContract = new Contract(fromToken, GUGUToken_ABI, signer);
    const allowance = await tokenContract.allowance(getAddress(), TokenSwap_ADDRESS);

    if (allowance < amountIn) {
      showToast('授权代币中...', 'info');
      const approveTx = await tokenContract.approve(TokenSwap_ADDRESS, amountIn);
      await approveTx.wait();
      showToast('授权成功！', 'success');
    }

    // 2. Swap
    const swapContract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
    const tx = await swapContract.swap(selectedPairId, fromToken, amountIn);

    const toSymbol = getTokenSymbol(getToToken());
    const fromSymbol = getTokenSymbol(fromToken);
    await waitForTx(tx, `🎉 成功将 ${amountStr} ${fromSymbol} 兑换为 ${toSymbol}！`);

    // 3. Refresh
    document.getElementById('from-amount').value = '';
    clearAmounts();
    loadBalances();
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, originalText);
  }
}
