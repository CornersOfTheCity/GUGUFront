// ═══════════════════════════════════════════
//      Admin — NFT 管理
// ═══════════════════════════════════════════

import { Contract } from 'ethers';
import { getSigner, isConnected, getProvider } from '../modules/wallet.js';
import {
  GUGUNFT_ADDRESS, GUGUNFT_ABI,
  RARITY_NAMES, RARITY_EMOJIS,
} from '../config/contracts.js';
import { fmtEth, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderNftManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">💎 NFT 管理</h1>
        <p class="page-subtitle">GUGUNFT 铸造、Minter 管理与收入提取</p>
      </div>

      <div class="admin-grid">
        <!-- 合约状态 -->
        <div class="card">
          <div class="admin-section-title">📋 合约状态</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${GUGUNFT_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="nft-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约余额</span>
            <span class="admin-info-value" id="nft-balance">—</span>
          </div>
          ${[0, 1, 2].map((i) => `
            <div class="admin-info-row">
              <span class="admin-info-label">${RARITY_EMOJIS[i]} ${RARITY_NAMES[i]} 已铸造</span>
              <span class="admin-info-value" id="nft-minted-${i}">—</span>
            </div>
          `).join('')}
        </div>

        <!-- 管理员铸造 NFT -->
        <div class="card">
          <div class="admin-section-title">🔨 管理员铸造 NFT</div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
            通过 Minter 权限免费铸造 NFT（盲盒合约也使用此接口）
          </p>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">接收地址</label>
              <input class="input" id="nft-mint-to" placeholder="0x..." />
            </div>
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">稀有度</label>
                <select class="input" id="nft-mint-rarity">
                  <option value="0">👑 Founder</option>
                  <option value="1">⚡ Pro</option>
                  <option value="2">🌟 Basic</option>
                </select>
              </div>
              <div class="form-group" style="max-width: 120px;">
                <label class="form-label">数量</label>
                <input class="input" id="nft-mint-qty" type="number" value="1" min="1" max="50" />
              </div>
            </div>
            <button class="btn btn-primary" id="btn-mint-nft">铸造 NFT</button>
          </div>
        </div>

        <!-- Minter 管理 -->
        <div class="card">
          <div class="admin-section-title">🔑 NFT Minter 管理</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">Minter 地址</label>
              <input class="input" id="nft-minter-addr" placeholder="0x..." />
            </div>
            <div class="admin-form-row">
              <button class="btn btn-accent" id="btn-add-nft-minter">授权</button>
              <button class="btn btn-outline" id="btn-remove-nft-minter">移除</button>
              <button class="btn btn-ghost" id="btn-check-nft-minter">查询</button>
            </div>
            <div id="nft-minter-status" style="font-size: 0.85rem; color: var(--text-secondary);"></div>
          </div>
        </div>

        <!-- Base URI -->
        <div class="card">
          <div class="admin-section-title">🔗 Base URI</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">设置 Base URI</label>
              <input class="input" id="base-uri" placeholder="https://api.example.com/metadata/" />
            </div>
            <button class="btn btn-outline" id="btn-set-uri">更新 Base URI</button>
          </div>
        </div>

        <!-- 提取收入 -->
        <div class="card">
          <div class="admin-section-title">💰 提取铸造收入</div>
          <div style="text-align: center; padding: 1rem 0;">
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">当前可提取余额</div>
            <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700; color: var(--primary-light);" id="nft-withdraw-balance">—</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">ETH</div>
          </div>
          <div class="admin-warning">⚠️ 提取操作会将合约中所有 ETH 转入 Owner 地址</div>
          <button class="btn btn-primary" id="btn-withdraw" style="width: 100%; margin-top: 0.75rem;">💰 提取</button>
        </div>
      </div>
    </div>
  `;

  loadNftInfo();

  // 铸造 NFT（支持批量）
  document.getElementById('btn-mint-nft').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-mint-nft');
    try {
      setButtonLoading(btn, true);
      const to = document.getElementById('nft-mint-to').value.trim();
      const rarity = parseInt(document.getElementById('nft-mint-rarity').value);
      const qty = parseInt(document.getElementById('nft-mint-qty').value) || 1;
      if (!to) return showToast('请填写地址', 'error');
      if (qty < 1 || qty > 50) return showToast('数量需在 1-50 之间', 'error');

      const signer = getSigner();
      const contract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, signer);

      if (qty === 1) {
        const tx = await contract.mint(to, rarity);
        await waitForTx(tx, `✅ 铸造 ${RARITY_EMOJIS[rarity]} ${RARITY_NAMES[rarity]} NFT 成功`);
      } else {
        const tx = await contract.mintBatch(to, rarity, qty);
        await waitForTx(tx, `✅ 批量铸造 ${qty} 个 ${RARITY_EMOJIS[rarity]} ${RARITY_NAMES[rarity]} NFT 成功`);
      }
      loadNftInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '铸造 NFT'); }
  });

  // Add/Remove/Check Minter
  bindMinterActions('nft-minter-addr', 'btn-add-nft-minter', 'btn-remove-nft-minter', 'btn-check-nft-minter', 'nft-minter-status', GUGUNFT_ADDRESS, GUGUNFT_ABI);

  // Set Base URI
  document.getElementById('btn-set-uri').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-uri');
    try {
      setButtonLoading(btn, true);
      const uri = document.getElementById('base-uri').value.trim();
      if (!uri) return showToast('请填写 URI', 'error');
      const signer = getSigner();
      const contract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, signer);
      const tx = await contract.setBaseURI(uri);
      await waitForTx(tx, '✅ Base URI 已更新');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新 Base URI'); }
  });

  // Withdraw
  document.getElementById('btn-withdraw').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-withdraw');
    try {
      setButtonLoading(btn, true);
      const signer = getSigner();
      const contract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, signer);
      const tx = await contract.withdraw();
      await waitForTx(tx, '✅ 收入已提取');
      loadNftInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '💰 提取铸造收入'); }
  });

  return () => {};
}

function bindMinterActions(inputId, addBtnId, removeBtnId, checkBtnId, statusId, contractAddr, contractAbi) {
  document.getElementById(addBtnId).addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById(addBtnId);
    try {
      setButtonLoading(btn, true);
      const addr = document.getElementById(inputId).value.trim();
      if (!addr) return showToast('请填写地址', 'error');
      const signer = getSigner();
      const contract = new Contract(contractAddr, contractAbi, signer);
      const tx = await contract.addMinter(addr);
      await waitForTx(tx, '✅ Minter 已授权');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '授权'); }
  });

  document.getElementById(removeBtnId).addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById(removeBtnId);
    try {
      setButtonLoading(btn, true);
      const addr = document.getElementById(inputId).value.trim();
      if (!addr) return showToast('请填写地址', 'error');
      const signer = getSigner();
      const contract = new Contract(contractAddr, contractAbi, signer);
      const tx = await contract.removeMinter(addr);
      await waitForTx(tx, '✅ Minter 已移除');
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '移除'); }
  });

  document.getElementById(checkBtnId).addEventListener('click', async () => {
    const addr = document.getElementById(inputId).value.trim();
    const el = document.getElementById(statusId);
    if (!addr) return;
    try {
      const provider = getProvider();
      const contract = new Contract(contractAddr, contractAbi, provider);
      const is = await contract.minters(addr);
      el.innerHTML = is
        ? `<span style="color: var(--success);">✅ 是 Minter</span>`
        : `<span style="color: var(--error);">❌ 不是 Minter</span>`;
    } catch { el.textContent = '查询失败'; }
  });
}

async function loadNftInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(GUGUNFT_ADDRESS, GUGUNFT_ABI, provider);

    const owner = await contract.owner().catch(() => '—');
    const el = document.getElementById('nft-owner');
    if (el) el.textContent = owner;

    // 合约 ETH 余额
    const bal = await provider.getBalance(GUGUNFT_ADDRESS).catch(() => 0n);
    const balEl = document.getElementById('nft-balance');
    if (balEl) balEl.textContent = fmtEth(bal) + ' ETH';
    const wdEl = document.getElementById('nft-withdraw-balance');
    if (wdEl) wdEl.textContent = fmtEth(bal);

    // 各稀有度铸造量
    for (let i = 0; i < 3; i++) {
      try {
        const minted = await contract.totalSupplyByRarity(i);
        const mintedEl = document.getElementById(`nft-minted-${i}`);
        if (mintedEl) mintedEl.textContent = Number(minted);
      } catch {}
    }
  } catch {}
}
