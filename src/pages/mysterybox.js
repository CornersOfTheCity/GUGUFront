// ═══════════════════════════════════════════
//          盲盒页
// ═══════════════════════════════════════════

import { Contract, MaxUint256 } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import {
  GUGUToken_ADDRESS, GUGUToken_ABI,
  MysteryBox_ADDRESS, MysteryBox_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

let pollInterval = null;
let quantity = 1;

export async function renderMysteryBoxPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">神秘盲盒</h1>
        <p class="page-subtitle">消耗 GUGU Token 购买盲盒，Chainlink VRF 保证公平随机</p>
      </div>

      <div class="mysterybox-layout">
        <!-- 左: 盲盒展示 -->
        <div class="card card-glass box-visual">
          <div class="box-emoji">🎁</div>
          <div class="box-price-display">
            <span id="box-price">100</span> <span class="token-label">GUGU / 个</span>
          </div>
          <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
            GUGU 余额: <strong id="gugu-balance" style="color: var(--accent-light)">—</strong>
          </div>
        </div>

        <!-- 右: 控制面板 -->
        <div class="card box-controls">
          <h3 style="font-family: var(--font-heading); font-weight: 700; margin-bottom: 0.5rem;">购买盲盒</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
            每个盲盒消耗 GUGU Token（销毁），使用 Chainlink VRF 随机决定 NFT 稀有度
          </p>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">数量 (1-5)</div>
          <div class="quantity-selector">
            <button class="qty-btn" id="qty-minus">−</button>
            <div class="qty-display" id="qty-display">1</div>
            <button class="qty-btn" id="qty-plus">+</button>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; font-size: 0.9rem;">
            <span style="color: var(--text-secondary);">总计消耗</span>
            <span style="font-weight: 700; color: var(--accent-light);" id="total-cost">100 GUGU</span>
          </div>

          <button class="btn btn-primary btn-lg btn-full" id="btn-buy-box">
            🎰 购买盲盒
          </button>

          <!-- 概率 -->
          <div class="probability-list" style="margin-top: 2rem;">
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 600;">稀有度概率</div>
            <div class="prob-item">
              <span class="prob-name"><span class="rarity-badge founder">${RARITY_EMOJIS[0]} Founder</span></span>
              <span class="prob-value" style="color: var(--rarity-founder);" id="prob-0">5%</span>
            </div>
            <div class="prob-item">
              <span class="prob-name"><span class="rarity-badge pro">${RARITY_EMOJIS[1]} Pro</span></span>
              <span class="prob-value" style="color: var(--rarity-pro);" id="prob-1">25%</span>
            </div>
            <div class="prob-item">
              <span class="prob-name"><span class="rarity-badge basic">${RARITY_EMOJIS[2]} Basic</span></span>
              <span class="prob-value" style="color: var(--rarity-basic);" id="prob-2">70%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 开箱记录 -->
      <div class="card" style="margin-top: 2rem;">
        <div class="staking-section-title">
          <span>📜</span> 盲盒记录
        </div>
        <div id="request-list" class="request-list">
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-text">暂无盲盒购买记录</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── 数量选择 ──
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const qtyDisplay = document.getElementById('qty-display');
  const totalCost = document.getElementById('total-cost');

  quantity = 1;

  function updateQty() {
    qtyDisplay.textContent = quantity;
    totalCost.textContent = `${quantity * 100} GUGU`;
  }

  qtyMinus.addEventListener('click', () => {
    if (quantity > 1) { quantity--; updateQty(); }
  });
  qtyPlus.addEventListener('click', () => {
    if (quantity < 5) { quantity++; updateQty(); }
  });

  // ── 购买按钮 ──
  document.getElementById('btn-buy-box').addEventListener('click', handleBuyBox);

  // ── 加载数据 ──
  if (isConnected()) {
    loadBoxData();
    pollInterval = setInterval(loadBoxData, 10000);
  }

  return () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}

async function loadBoxData() {
  if (!isConnected()) return;

  try {
    const provider = getProvider();
    const address = getAddress();
    const tokenContract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, provider);

    // GUGU 余额
    const balance = await tokenContract.balanceOf(address).catch(() => 0n);
    const balanceEl = document.getElementById('gugu-balance');
    if (balanceEl) balanceEl.textContent = fmtToken(balance) + ' GUGU';

    // 盒子价格 & 概率
    const boxContract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, provider);
    try {
      const price = await boxContract.currentBoxPrice();
      const priceEl = document.getElementById('box-price');
      if (priceEl) priceEl.textContent = fmtToken(price);
    } catch {}

    // 概率
    for (let i = 0; i < 3; i++) {
      try {
        const prob = await boxContract.probabilities(i);
        const probEl = document.getElementById(`prob-${i}`);
        if (probEl) probEl.textContent = `${Number(prob) / 100}%`;
      } catch {}
    }

    // 请求记录
    await loadRequestHistory(boxContract, address);
  } catch (err) {
    console.error('loadBoxData error:', err);
  }
}

async function loadRequestHistory(boxContract, address) {
  const listEl = document.getElementById('request-list');
  if (!listEl) return;

  try {
    const provider = getProvider();
    const currentBlock = await provider.getBlockNumber();
    // BSC ~3秒出块，50000 块 ≈ 42小时
    const fromBlock = Math.max(0, currentBlock - 50000);

    // 按用户地址过滤 BoxRequested 事件
    const buyFilter = boxContract.filters.BoxRequested(address);
    const buyEvents = await boxContract.queryFilter(buyFilter, fromBlock, 'latest');

    if (buyEvents.length === 0) return;

    // 按用户地址过滤 BoxOpened 事件
    const openFilter = boxContract.filters.BoxOpened(address);
    const openEvents = await boxContract.queryFilter(openFilter, fromBlock, 'latest');

    // 将 BoxOpened 按 requestId 分组（通过区块号和交易关联）
    const openedByTx = new Map();
    for (const evt of openEvents) {
      const key = evt.transactionHash;
      if (!openedByTx.has(key)) openedByTx.set(key, []);
      openedByTx.get(key).push({
        tokenId: evt.args[1],
        rarity: Number(evt.args[2]),
      });
    }

    // 倒序：最新的在前面，只取最近 10 条
    const recentEvents = buyEvents.reverse().slice(0, 10);
    let html = '';

    for (const evt of recentEvents) {
      const requestId = evt.args[1];
      const qty = Number(evt.args[2]);
      const blockTime = (await evt.getBlock()).timestamp;
      const timeStr = new Date(blockTime * 1000).toLocaleString('zh-CN');

      // 查询该请求的 VRF 状态
      let fulfilled = false;
      try {
        const [isFulfilled] = await boxContract.getRequestStatus(requestId);
        fulfilled = isFulfilled;
      } catch {}

      html += `
        <div class="request-item">
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">
              购买 ${qty} 个盲盒
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
              ${timeStr} · 请求 #${requestId.toString().slice(0, 10)}...
            </div>
          </div>
          <span class="request-status ${fulfilled ? 'fulfilled' : 'pending'}">
            ${fulfilled ? '✅ 已开箱' : '⏳ 等待 VRF'}
          </span>
        </div>
      `;
    }

    if (html) listEl.innerHTML = html;
  } catch (err) {
    console.error('loadRequestHistory error:', err);
  }
}

async function handleBuyBox() {
  if (!isConnected()) {
    showToast('请先连接钱包', 'error');
    return;
  }

  const btn = document.getElementById('btn-buy-box');

  try {
    setButtonLoading(btn, true);
    const signer = getSigner();
    const address = getAddress();

    const tokenContract = new Contract(GUGUToken_ADDRESS, GUGUToken_ABI, signer);
    const boxContract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, signer);

    // 获取盒子价格
    const boxPrice = await boxContract.currentBoxPrice();
    const totalCostWei = boxPrice * BigInt(quantity);

    // 检查余额
    const balance = await tokenContract.balanceOf(address);
    if (balance < totalCostWei) {
      showToast(`GUGU 余额不足！需要 ${fmtToken(totalCostWei)} GUGU`, 'error');
      return;
    }

    // 检查并授权
    const allowance = await tokenContract.allowance(address, MysteryBox_ADDRESS);
    if (allowance < totalCostWei) {
      showToast('授权 GUGU Token 给盲盒合约...', 'info');
      const approveTx = await tokenContract.approve(MysteryBox_ADDRESS, MaxUint256);
      await approveTx.wait();
      showToast('授权成功！', 'success');
    }

    // 购买盲盒
    const tx = await boxContract.buyBox(quantity);
    await waitForTx(tx, '🎰 盲盒已购买！等待 VRF 回调开箱...');

    // 刷新数据
    loadBoxData();

    // 开始轮询开箱结果
    showToast('⏳ 等待 Chainlink VRF 回调（通常 1-3 分钟）...', 'info');
  } catch (err) {
    handleError(err);
  } finally {
    setButtonLoading(btn, false, '🎰 购买盲盒');
  }
}
