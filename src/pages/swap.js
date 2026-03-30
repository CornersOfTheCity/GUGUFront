// ═══════════════════════════════════════════
//     Token Swap Page (Buy / Sell GUGU)
// ═══════════════════════════════════════════

import { Contract, parseUnits, formatUnits } from 'ethers';
import { getSigner, isConnected, getProvider, getAddress } from '../modules/wallet.js';
import {
  TokenSwap_ADDRESS, TokenSwap_ABI,
  GUGUToken_ABI, GUGUToken_ADDRESS,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

// ── State ──
let saleTokenAddr = null;
let saleSymbol = 'GUGU';
let saleDecimals = 18;
let payTokensList = [];      // [{address, symbol, decimals, buyPrice, sellPrice, enabled}]
let selectedPayToken = null;
let isPaused = false;
let isBuybackEnabled = false;
let activeMode = 'buy';      // 'buy' | 'sell'
let debounceTimer = null;

const ERC20_META = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
];

export async function renderSwapPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">GUGU 兑换</h1>
        <p class="page-subtitle">使用稳定币购买 GUGU，或将 GUGU 卖出兑换</p>
      </div>

      <div class="swap-container">
        <div class="card card-glass swap-card slide-up">
          <!-- Tab: Buy / Sell -->
          <div class="ts-tabs">
            <button class="ts-tab active" id="swap-tab-buy" data-mode="buy">💎 购买 GUGU</button>
            <button class="ts-tab" id="swap-tab-sell" data-mode="sell">💰 卖出 GUGU</button>
          </div>

          <!-- Token Selector -->
          <div class="swap-token-selector" id="token-selector-wrap">
            <label class="swap-label" style="margin-bottom: 0.4rem; display: block;">
              <span id="token-selector-label">支付代币</span>
            </label>
            <div class="swap-token-dropdown" id="token-selector">
              <span id="token-selector-text">选择代币...</span>
              <span class="swap-dropdown-arrow">▼</span>
            </div>
            <div class="swap-token-options" id="token-options" style="display:none"></div>
          </div>

          <!-- From Input -->
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

          <!-- Direction -->
          <div class="swap-direction-wrapper">
            <div class="swap-direction-btn" style="cursor: default;">
              <span class="swap-direction-icon">↓</span>
            </div>
          </div>

          <!-- To Output -->
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
              <span id="swap-remaining-label">GUGU 可售</span>
              <span id="swap-remaining">—</span>
            </div>
          </div>

          <!-- Sell-disabled notice -->
          <div class="ts-lock-notice" id="buyback-notice" style="display:none">
            <span>🔒</span>
            <span>回购功能暂未开放</span>
          </div>

          <!-- Action -->
          <button class="btn btn-primary btn-lg btn-full swap-action-btn" id="swap-btn" disabled>
            加载中...
          </button>
        </div>

        <!-- Stats -->
        <div class="swap-stats slide-up" style="animation-delay:0.15s">
          <div class="stats-grid">
            <div class="card stat-card">
              <div class="stat-value" id="stat-remaining">—</div>
              <div class="stat-label">GUGU 可售量</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value" id="stat-buyback">—</div>
              <div class="stat-label">回购状态</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value" id="stat-status">—</div>
              <div class="stat-label">合约状态</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Tab switch ──
  document.getElementById('swap-tab-buy').addEventListener('click', () => switchMode('buy'));
  document.getElementById('swap-tab-sell').addEventListener('click', () => switchMode('sell'));

  // ── Token selector dropdown ──
  document.getElementById('token-selector').addEventListener('click', toggleDropdown);

  // ── Events ──
  document.getElementById('from-amount').addEventListener('input', onAmountInput);
  document.getElementById('max-btn').addEventListener('click', onMaxClick);
  document.getElementById('swap-btn').addEventListener('click', handleSwap);

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('token-selector-wrap');
    if (wrap && !wrap.contains(e.target)) {
      const opts = document.getElementById('token-options');
      if (opts) opts.style.display = 'none';
    }
  });

  await loadSaleInfo();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ═══════════════════════════════════════════
//            Mode Switching
// ═══════════════════════════════════════════

function switchMode(mode) {
  activeMode = mode;
  document.getElementById('swap-tab-buy').classList.toggle('active', mode === 'buy');
  document.getElementById('swap-tab-sell').classList.toggle('active', mode === 'sell');

  // Update labels
  const isBuy = mode === 'buy';
  document.getElementById('token-selector-label').textContent = isBuy ? '支付代币' : '接收代币';
  document.getElementById('from-label').textContent = isBuy ? '支付' : '卖出';
  document.getElementById('to-label').textContent = isBuy ? '获得' : '接收';
  document.getElementById('swap-remaining-label').textContent = isBuy ? 'GUGU 可售' : '可兑换量';

  // Update token badges
  if (selectedPayToken) {
    document.getElementById('from-token-name').textContent = isBuy ? selectedPayToken.symbol : saleSymbol;
    document.getElementById('to-token-name').textContent = isBuy ? saleSymbol : selectedPayToken.symbol;
  }

  // Check buyback status
  const buybackNotice = document.getElementById('buyback-notice');
  if (!isBuy && !isBuybackEnabled) {
    buybackNotice.style.display = '';
  } else {
    buybackNotice.style.display = 'none';
  }

  // Clear and reset
  document.getElementById('from-amount').value = '';
  document.getElementById('to-amount').value = '';
  loadBalances();
  updateBtnState();
  updatePriceDisplay();
}

// ═══════════════════════════════════════════
//            Token Selector
// ═══════════════════════════════════════════

function toggleDropdown() {
  const opts = document.getElementById('token-options');
  opts.style.display = opts.style.display === 'none' ? '' : 'none';
}

function buildTokenOptions() {
  const container = document.getElementById('token-options');
  container.innerHTML = '';
  payTokensList.forEach((tk) => {
    const item = document.createElement('div');
    item.className = 'swap-token-option' + (selectedPayToken?.address === tk.address ? ' active' : '');
    const priceTxt = parseFloat(formatUnits(tk.buyPrice, 18));
    item.innerHTML = `
      <span class="swap-token-option-symbol">${tk.symbol}</span>
      <span class="swap-token-option-price">买入: ${priceTxt}</span>
    `;
    item.addEventListener('click', () => selectPayToken(tk));
    container.appendChild(item);
  });
}

function selectPayToken(tk) {
  selectedPayToken = tk;
  document.getElementById('token-selector-text').textContent = tk.symbol;
  document.getElementById('token-options').style.display = 'none';

  // Update badges
  const isBuy = activeMode === 'buy';
  document.getElementById('from-token-name').textContent = isBuy ? tk.symbol : saleSymbol;
  document.getElementById('to-token-name').textContent = isBuy ? saleSymbol : tk.symbol;

  // Reset amounts
  document.getElementById('from-amount').value = '';
  document.getElementById('to-amount').value = '';

  updatePriceDisplay();
  loadBalances();
  updateBtnState();
  buildTokenOptions(); // refresh active state
}

// ═══════════════════════════════════════════
//            Load Contract Data
// ═══════════════════════════════════════════

async function loadSaleInfo() {
  try {
    const provider = getProvider();
    if (!provider) { updateBtnState(); return; }

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);

    const [saleTkn, paused, buyback, remaining, tokenAddrs] = await Promise.all([
      swap.saleToken(),
      swap.paused(),
      swap.buybackEnabled(),
      swap.remainingSupply(),
      swap.getPayTokenList(),
    ]);

    saleTokenAddr = saleTkn;
    isPaused = paused;
    isBuybackEnabled = buyback;

    // Fetch sale token metadata
    try {
      const sc = new Contract(saleTkn, ERC20_META, provider);
      saleSymbol = await sc.symbol();
      saleDecimals = Number(await sc.decimals());
    } catch { saleSymbol = 'GUGU'; saleDecimals = 18; }

    // Fetch each pay token info
    payTokensList = [];
    for (const addr of tokenAddrs) {
      try {
        const [info, sym, dec] = await Promise.all([
          swap.getPayTokenInfo(addr),
          new Contract(addr, ERC20_META, provider).symbol().catch(() => '???'),
          new Contract(addr, ERC20_META, provider).decimals().catch(() => 18),
        ]);
        payTokensList.push({
          address: addr,
          symbol: sym,
          decimals: Number(dec),
          buyPrice: info[0],
          sellPrice: info[1],
          enabled: info[2],
        });
      } catch { /* skip broken tokens */ }
    }

    // Build dropdown
    buildTokenOptions();

    // Auto-select first token if none selected
    if (!selectedPayToken && payTokensList.length > 0) {
      selectPayToken(payTokensList[0]);
    }

    // Stats
    document.getElementById('stat-remaining').textContent = fmtToken(remaining, saleDecimals);
    document.getElementById('stat-buyback').textContent = isBuybackEnabled ? '🟢 已开启' : '🔴 未开启';
    document.getElementById('stat-status').textContent = isPaused ? '⏸ 已暂停' : '🟢 运行中';

    // Show details
    document.getElementById('swap-details').style.display = '';

    // Update remaining display
    document.getElementById('swap-remaining').textContent = fmtToken(remaining, saleDecimals) + ' ' + saleSymbol;

    await loadBalances();
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
    if (!provider || !address) return;

    const isBuy = activeMode === 'buy';

    if (isBuy && selectedPayToken) {
      // From: pay token balance
      try {
        const tc = new Contract(selectedPayToken.address, ERC20_META, provider);
        const bal = await tc.balanceOf(address);
        document.getElementById('from-balance').textContent = '余额: ' + fmtToken(bal, selectedPayToken.decimals);
      } catch { document.getElementById('from-balance').textContent = '余额: —'; }

      // To: GUGU balance
      try {
        const sc = new Contract(saleTokenAddr, ERC20_META, provider);
        const bal = await sc.balanceOf(address);
        document.getElementById('to-balance').textContent = '余额: ' + fmtToken(bal, saleDecimals);
      } catch { document.getElementById('to-balance').textContent = '余额: —'; }
    } else if (!isBuy && selectedPayToken) {
      // From: GUGU balance
      try {
        const sc = new Contract(saleTokenAddr, ERC20_META, provider);
        const bal = await sc.balanceOf(address);
        document.getElementById('from-balance').textContent = '余额: ' + fmtToken(bal, saleDecimals);
      } catch { document.getElementById('from-balance').textContent = '余额: —'; }

      // To: pay token balance
      try {
        const tc = new Contract(selectedPayToken.address, ERC20_META, provider);
        const bal = await tc.balanceOf(address);
        document.getElementById('to-balance').textContent = '余额: ' + fmtToken(bal, selectedPayToken.decimals);
      } catch { document.getElementById('to-balance').textContent = '余额: —'; }
    }
  } catch { /* ignore */ }
}

function updatePriceDisplay() {
  if (!selectedPayToken) return;
  const isBuy = activeMode === 'buy';
  const price = isBuy ? selectedPayToken.buyPrice : selectedPayToken.sellPrice;
  if (price > 0n) {
    const priceNum = parseFloat(formatUnits(price, 18));
    document.getElementById('swap-rate').textContent = `1 ${saleSymbol} = ${priceNum} ${selectedPayToken.symbol}`;
  } else {
    document.getElementById('swap-rate').textContent = '—';
  }
}

function updateBtnState() {
  const btn = document.getElementById('swap-btn');
  if (!btn) return;

  if (!isConnected()) {
    btn.textContent = '请先连接钱包';
    btn.disabled = true;
  } else if (isPaused) {
    btn.textContent = '合约已暂停';
    btn.disabled = true;
  } else if (!selectedPayToken) {
    btn.textContent = '请选择代币';
    btn.disabled = true;
  } else if (activeMode === 'sell' && !isBuybackEnabled) {
    btn.textContent = '回购暂未开放';
    btn.disabled = true;
  } else {
    btn.textContent = '输入金额';
    btn.disabled = true;
  }
}

// ═══════════════════════════════════════════
//            Events
// ═══════════════════════════════════════════

function onAmountInput(e) {
  const val = e.target.value;
  if (!val || parseFloat(val) <= 0) {
    document.getElementById('to-amount').value = '';
    updateBtnState();
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchQuote(val), 300);
}

async function onMaxClick() {
  try {
    const provider = getProvider();
    const address = getAddress();
    if (!provider || !address || !selectedPayToken) return showToast('请先选择代币', 'error');

    const isBuy = activeMode === 'buy';
    let balance, decimals;

    if (isBuy) {
      const tc = new Contract(selectedPayToken.address, ERC20_META, provider);
      balance = await tc.balanceOf(address);
      decimals = selectedPayToken.decimals;
    } else {
      const sc = new Contract(saleTokenAddr, ERC20_META, provider);
      balance = await sc.balanceOf(address);
      decimals = saleDecimals;
    }

    const formatted = formatUnits(balance, decimals);
    document.getElementById('from-amount').value = formatted;
    fetchQuote(formatted);
  } catch (err) { handleError(err); }
}

async function fetchQuote(amountStr) {
  if (!selectedPayToken) return;

  try {
    const provider = getProvider();
    if (!provider) return;

    const swap = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, provider);
    const isBuy = activeMode === 'buy';
    let fromDecimals, amountOut;

    if (isBuy) {
      fromDecimals = selectedPayToken.decimals;
      const payAmount = parseUnits(amountStr, fromDecimals);
      amountOut = await swap.getBuyAmountOut(selectedPayToken.address, payAmount);
    } else {
      fromDecimals = saleDecimals;
      const guguAmount = parseUnits(amountStr, fromDecimals);
      amountOut = await swap.getSellAmountOut(selectedPayToken.address, guguAmount);
    }

    const outDecimals = isBuy ? saleDecimals : selectedPayToken.decimals;
    document.getElementById('to-amount').value = parseFloat(formatUnits(amountOut, outDecimals)).toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false });

    const btn = document.getElementById('swap-btn');
    if (isConnected() && !isPaused && parseFloat(amountStr) > 0) {
      if (isBuy) {
        btn.disabled = false;
        btn.textContent = '购买 ' + saleSymbol;
      } else if (isBuybackEnabled) {
        btn.disabled = false;
        btn.textContent = '卖出 ' + saleSymbol;
      }
    }
  } catch {
    document.getElementById('to-amount').value = '';
    const btn = document.getElementById('swap-btn');
    btn.disabled = true;
    btn.textContent = '金额无效或余额不足';
  }
}

// ═══════════════════════════════════════════
//            Execute Swap
// ═══════════════════════════════════════════

async function handleSwap() {
  if (!isConnected()) return showToast('请先连接钱包', 'error');
  if (!selectedPayToken) return showToast('请选择代币', 'error');

  const amountStr = document.getElementById('from-amount').value;
  if (!amountStr || parseFloat(amountStr) <= 0) return showToast('请输入数量', 'error');

  const btn = document.getElementById('swap-btn');
  const isBuy = activeMode === 'buy';
  const originalText = isBuy ? '购买 ' + saleSymbol : '卖出 ' + saleSymbol;

  try {
    setButtonLoading(btn, true);
    const signer = getSigner();

    if (isBuy) {
      // ── Buy GUGU ──
      const payAmount = parseUnits(amountStr, selectedPayToken.decimals);

      // Approve pay token
      const tokenContract = new Contract(selectedPayToken.address, ERC20_META, signer);
      const allowance = await tokenContract.allowance(getAddress(), TokenSwap_ADDRESS);
      if (allowance < payAmount) {
        showToast('授权 ' + selectedPayToken.symbol + ' 中...', 'info');
        const approveTx = await tokenContract.approve(TokenSwap_ADDRESS, payAmount);
        await approveTx.wait();
        showToast('授权成功！', 'success');
      }

      const swapContract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await swapContract.buy(selectedPayToken.address, payAmount);
      const expectedOut = document.getElementById('to-amount').value;
      await waitForTx(tx, `🎉 使用 ${amountStr} ${selectedPayToken.symbol} 购买了 ${expectedOut} ${saleSymbol}！`);
    } else {
      // ── Sell GUGU ──
      const guguAmount = parseUnits(amountStr, saleDecimals);

      // Approve GUGU
      const guguContract = new Contract(saleTokenAddr, ERC20_META, signer);
      const allowance = await guguContract.allowance(getAddress(), TokenSwap_ADDRESS);
      if (allowance < guguAmount) {
        showToast('授权 ' + saleSymbol + ' 中...', 'info');
        const approveTx = await guguContract.approve(TokenSwap_ADDRESS, guguAmount);
        await approveTx.wait();
        showToast('授权成功！', 'success');
      }

      const swapContract = new Contract(TokenSwap_ADDRESS, TokenSwap_ABI, signer);
      const tx = await swapContract.sell(selectedPayToken.address, guguAmount);
      const expectedOut = document.getElementById('to-amount').value;
      await waitForTx(tx, `🎉 卖出 ${amountStr} ${saleSymbol}，获得 ${expectedOut} ${selectedPayToken.symbol}！`);
    }

    // Reset
    document.getElementById('from-amount').value = '';
    document.getElementById('to-amount').value = '';
    updateBtnState();
    loadSaleInfo();
  } catch (err) { handleError(err); }
  finally { setButtonLoading(btn, false, originalText); }
}
