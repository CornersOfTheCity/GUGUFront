// ═══════════════════════════════════════════
//      Admin — 空投管理
// ═══════════════════════════════════════════

import { Contract, parseUnits, MaxUint256 } from 'ethers';
import { getSigner, isConnected, getAddress, getProvider } from '../modules/wallet.js';
import {
  Airdrop_ADDRESS, Airdrop_ABI,
  GUGUToken_ADDRESS, GUGUToken_ABI,
  GUGUNFT_ADDRESS,
  RARITY_NAMES, RARITY_EMOJIS,
} from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderAirdropManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🪂 批量空投</h1>
        <p class="page-subtitle">批量发放 ERC-20 Token 或铸造 NFT 给多个地址</p>
      </div>

      <div class="admin-grid">
        <!-- 合约状态 -->
        <div class="card">
          <div class="admin-section-title">📋 合约信息</div>
          <div class="admin-info-row">
            <span class="admin-info-label">空投合约</span>
            <span class="admin-info-value mono">${Airdrop_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Owner</span>
            <span class="admin-info-value mono" id="airdrop-owner">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">单次最大地址数</span>
            <span class="admin-info-value" id="airdrop-max-batch">200</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Token 已授权额度</span>
            <span class="admin-info-value" id="airdrop-allowance">—</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-approve-token" style="margin-top: 1rem;">
            授权 GUGU Token
          </button>
        </div>

        <!-- 使用说明 -->
        <div class="card">
          <div class="admin-section-title">📝 使用说明</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.7;">
            <p><strong>地址格式:</strong> 每行一个地址，支持以下两种格式：</p>
            <div class="admin-info-row" style="border: none; padding: 0.3rem 0;">
              <code style="color: var(--primary-light); font-size: 0.8rem;">0xAbC...123</code>
              <span style="font-size: 0.8rem;">等额模式</span>
            </div>
            <div class="admin-info-row" style="border: none; padding: 0.3rem 0;">
              <code style="color: var(--primary-light); font-size: 0.8rem;">0xAbC...123,500</code>
              <span style="font-size: 0.8rem;">自定义金额</span>
            </div>
            <p style="margin-top: 0.75rem;"><strong>前提条件:</strong></p>
            <p>• Token 空投: 需先点击「授权」按钮</p>
            <p>• NFT 空投: 需在 GUGUNFT 合约中将空投合约 addMinter</p>
          </div>
        </div>
      </div>

      <!-- Token 空投 -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="admin-section-title">🪙 Token 空投</div>
        <div class="admin-form">
          <div class="admin-form-row">
            <div class="form-group">
              <label class="form-label">Token 地址</label>
              <input class="input" id="airdrop-token-addr" value="${GUGUToken_ADDRESS}" />
            </div>
            <div class="form-group" style="max-width: 200px;">
              <label class="form-label">模式</label>
              <select class="input" id="airdrop-token-mode">
                <option value="equal">等额空投</option>
                <option value="custom">自定义金额</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="equal-amount-group">
            <label class="form-label">每人数量 (Token)</label>
            <input class="input" id="airdrop-equal-amount" type="number" placeholder="100" />
          </div>
          <div class="form-group">
            <label class="form-label">
              接收地址列表
              <span style="font-weight: 400; color: var(--text-muted);" id="addr-count-token">（0 个地址）</span>
            </label>
            <textarea class="input" id="airdrop-token-addresses" rows="8"
              placeholder="每行一个地址&#10;等额模式: 0xAbC...123&#10;自定义金额模式: 0xAbC...123,500"
              style="resize: vertical; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.82rem; line-height: 1.6;"></textarea>
          </div>
          <button class="btn btn-primary btn-lg" id="btn-airdrop-token">
            🚀 执行 Token 空投
          </button>
          <div id="token-summary" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;"></div>
        </div>
      </div>

      <!-- NFT 空投 -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="admin-section-title">💎 NFT 空投</div>
        <div class="admin-form">
          <div class="form-group" style="max-width: 250px;">
            <label class="form-label">稀有度</label>
            <select class="input" id="airdrop-nft-rarity">
              <option value="0">👑 Founder</option>
              <option value="1">⚡ Pro</option>
              <option value="2">🌟 Basic</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              接收地址列表
              <span style="font-weight: 400; color: var(--text-muted);" id="addr-count-nft">（0 个地址）</span>
            </label>
            <textarea class="input" id="airdrop-nft-addresses" rows="8"
              placeholder="每行一个地址&#10;0xAbC...123&#10;0xDeF...456"
              style="resize: vertical; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.82rem; line-height: 1.6;"></textarea>
          </div>
          <button class="btn btn-accent btn-lg" id="btn-airdrop-nft">
            🚀 执行 NFT 空投
          </button>
        </div>
      </div>
    </div>
  `;

  // 加载合约信息
  loadAirdropInfo();

  // 模式切换
  const modeSelect = document.getElementById('airdrop-token-mode');
  const equalGroup = document.getElementById('equal-amount-group');
  modeSelect.addEventListener('change', () => {
    equalGroup.style.display = modeSelect.value === 'equal' ? 'flex' : 'none';
  });

  // 实时统计地址数
  document.getElementById('airdrop-token-addresses').addEventListener('input', (e) => {
    const lines = parseAddresses(e.target.value);
    document.getElementById('addr-count-token').textContent = `（${lines.length} 个地址）`;
    updateTokenSummary();
  });
  document.getElementById('airdrop-equal-amount').addEventListener('input', updateTokenSummary);

  document.getElementById('airdrop-nft-addresses').addEventListener('input', (e) => {
    const lines = parseAddresses(e.target.value);
    document.getElementById('addr-count-nft').textContent = `（${lines.length} 个地址）`;
  });

  // 授权 Token
  document.getElementById('btn-approve-token').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-approve-token');
    try {
      setButtonLoading(btn, true);
      const tokenAddr = document.getElementById('airdrop-token-addr').value.trim();
      const signer = getSigner();
      const tokenContract = new Contract(tokenAddr, GUGUToken_ABI, signer);
      const tx = await tokenContract.approve(Airdrop_ADDRESS, MaxUint256);
      await waitForTx(tx, '✅ Token 已授权给空投合约');
      loadAirdropInfo();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '授权 GUGU Token'); }
  });

  // Token 空投
  document.getElementById('btn-airdrop-token').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-airdrop-token');
    try {
      setButtonLoading(btn, true);
      const tokenAddr = document.getElementById('airdrop-token-addr').value.trim();
      const mode = document.getElementById('airdrop-token-mode').value;
      const text = document.getElementById('airdrop-token-addresses').value;
      const lines = parseAddresses(text);

      if (lines.length === 0) return showToast('请填写至少一个地址', 'error');
      if (lines.length > 200) return showToast('单次最多 200 个地址', 'error');

      const signer = getSigner();
      const contract = new Contract(Airdrop_ADDRESS, Airdrop_ABI, signer);

      if (mode === 'equal') {
        const amount = document.getElementById('airdrop-equal-amount').value.trim();
        if (!amount) return showToast('请填写每人数量', 'error');
        const addresses = lines.map((l) => l.split(',')[0].trim());
        const tx = await contract.airdropTokenEqual(
          tokenAddr,
          addresses,
          parseUnits(amount, 18),
        );
        await waitForTx(tx, `✅ 等额空投完成！${addresses.length} 人各收到 ${amount} Token`);
      } else {
        // 自定义金额
        const addresses = [];
        const amounts = [];
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length < 2) {
            showToast(`格式错误: ${line}，自定义模式需用 地址,金额`, 'error');
            return;
          }
          addresses.push(parts[0].trim());
          amounts.push(parseUnits(parts[1].trim(), 18));
        }
        const tx = await contract.airdropTokenCustom(tokenAddr, addresses, amounts);
        await waitForTx(tx, `✅ 自定义金额空投完成！${addresses.length} 人已收到 Token`);
      }
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '🚀 执行 Token 空投'); }
  });

  // NFT 空投
  document.getElementById('btn-airdrop-nft').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-airdrop-nft');
    try {
      setButtonLoading(btn, true);
      const rarity = parseInt(document.getElementById('airdrop-nft-rarity').value);
      const text = document.getElementById('airdrop-nft-addresses').value;
      const lines = parseAddresses(text);

      if (lines.length === 0) return showToast('请填写至少一个地址', 'error');
      if (lines.length > 200) return showToast('单次最多 200 个地址', 'error');

      const addresses = lines.map((l) => l.split(',')[0].trim());
      const signer = getSigner();
      const contract = new Contract(Airdrop_ADDRESS, Airdrop_ABI, signer);
      const tx = await contract.airdropNFT(addresses, rarity);
      await waitForTx(tx, `✅ NFT 空投完成！${addresses.length} 人各收到 ${RARITY_EMOJIS[rarity]} ${RARITY_NAMES[rarity]} NFT`);
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '🚀 执行 NFT 空投'); }
  });

  return () => {};
}

function parseAddresses(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.startsWith('0x'));
}

function updateTokenSummary() {
  const mode = document.getElementById('airdrop-token-mode').value;
  const text = document.getElementById('airdrop-token-addresses').value;
  const lines = parseAddresses(text);
  const el = document.getElementById('token-summary');

  if (lines.length === 0) { el.textContent = ''; return; }

  if (mode === 'equal') {
    const amount = parseFloat(document.getElementById('airdrop-equal-amount').value) || 0;
    el.textContent = `总计: ${(amount * lines.length).toLocaleString()} Token`;
  } else {
    let total = 0;
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 2) total += parseFloat(parts[1].trim()) || 0;
    }
    el.textContent = `总计: ${total.toLocaleString()} Token`;
  }
}

async function loadAirdropInfo() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(Airdrop_ADDRESS, Airdrop_ABI, provider);

    const owner = await contract.owner().catch(() => '—');
    const ownerEl = document.getElementById('airdrop-owner');
    if (ownerEl) ownerEl.textContent = owner;

    // 查询当前用户对空投合约的 Token 授权额度
    if (isConnected()) {
      const address = getAddress();
      const tokenAddr = document.getElementById('airdrop-token-addr')?.value?.trim() || GUGUToken_ADDRESS;
      const tokenContract = new Contract(tokenAddr, GUGUToken_ABI, provider);
      const allowance = await tokenContract.allowance(address, Airdrop_ADDRESS).catch(() => 0n);
      const el = document.getElementById('airdrop-allowance');
      if (el) {
        el.textContent = allowance >= parseUnits('999999999', 18)
          ? '✅ 无限'
          : fmtToken(allowance) + ' GUGU';
      }
    }
  } catch {}
}
