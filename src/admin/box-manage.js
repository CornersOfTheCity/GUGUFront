// ═══════════════════════════════════════════
//      Admin — 盲盒管理
// ═══════════════════════════════════════════

import { Contract, parseUnits } from 'ethers';
import { getSigner, isConnected, getProvider } from '../modules/wallet.js';
import { MysteryBox_ADDRESS, MysteryBox_ABI } from '../config/contracts.js';
import { fmtToken, waitForTx, handleError, setButtonLoading, showToast } from '../modules/utils.js';

export async function renderBoxManage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🎁 盲盒管理</h1>
        <p class="page-subtitle">配置盲盒价格、概率分布和 VRF 参数</p>
      </div>

      <div class="admin-grid">
        <!-- 当前配置 -->
        <div class="card">
          <div class="admin-section-title">📋 当前配置</div>
          <div class="admin-info-row">
            <span class="admin-info-label">合约地址</span>
            <span class="admin-info-value mono">${MysteryBox_ADDRESS}</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">盲盒价格</span>
            <span class="admin-info-value" id="box-cur-price">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Founder 概率</span>
            <span class="admin-info-value" id="box-prob-0">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Pro 概率</span>
            <span class="admin-info-value" id="box-prob-1">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Basic 概率</span>
            <span class="admin-info-value" id="box-prob-2">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Subscription ID</span>
            <span class="admin-info-value mono" id="box-sub-id">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">Callback Gas</span>
            <span class="admin-info-value" id="box-gas-limit">—</span>
          </div>
          <div class="admin-info-row">
            <span class="admin-info-label">确认数</span>
            <span class="admin-info-value" id="box-confirmations">—</span>
          </div>
        </div>

        <!-- 设置价格 -->
        <div class="card">
          <div class="admin-section-title">💰 设置盲盒价格</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">新价格 (GUGU)</label>
              <input class="input" id="new-box-price" type="number" placeholder="100" />
            </div>
            <button class="btn btn-primary" id="btn-set-price">更新价格</button>
          </div>
        </div>

        <!-- 设置概率 -->
        <div class="card">
          <div class="admin-section-title">🎲 设置概率分布</div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
            三项总和必须 <strong>等于 10000</strong>（即 100.00%）
          </p>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">👑 Founder (‱)</label>
              <input class="input" id="prob-founder" type="number" placeholder="500 = 5%" />
            </div>
            <div class="form-group">
              <label class="form-label">⚡ Pro (‱)</label>
              <input class="input" id="prob-pro" type="number" placeholder="2500 = 25%" />
            </div>
            <div class="form-group">
              <label class="form-label">🌟 Basic (‱)</label>
              <input class="input" id="prob-basic" type="number" placeholder="7000 = 70%" />
            </div>
            <div id="prob-sum" style="font-size: 0.85rem; color: var(--text-secondary);">总和: —</div>
            <button class="btn btn-primary" id="btn-set-probs">更新概率</button>
          </div>
        </div>

        <!-- VRF 配置 -->
        <div class="card">
          <div class="admin-section-title">🔗 VRF 配置</div>
          <div class="admin-form">
            <div class="form-group">
              <label class="form-label">Subscription ID</label>
              <input class="input" id="vrf-sub-id" type="number" placeholder="Chainlink VRF Subscription ID" />
            </div>
            <button class="btn btn-outline" id="btn-set-sub-id" style="margin-bottom: 1rem;">更新 Subscription ID</button>

            <div class="form-group">
              <label class="form-label">Key Hash</label>
              <input class="input" id="vrf-key-hash" placeholder="0x..." />
            </div>
            <div class="admin-form-row">
              <div class="form-group">
                <label class="form-label">Callback Gas Limit</label>
                <input class="input" id="vrf-gas-limit" type="number" placeholder="500000" />
              </div>
              <div class="form-group">
                <label class="form-label">确认数</label>
                <input class="input" id="vrf-confirmations" type="number" placeholder="3" />
              </div>
            </div>
            <button class="btn btn-outline" id="btn-set-vrf">更新 VRF 配置</button>
          </div>
        </div>
      </div>
    </div>
  `;

  loadBoxConfig();

  // 实时计算概率总和
  ['prob-founder', 'prob-pro', 'prob-basic'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      const a = parseInt(document.getElementById('prob-founder').value) || 0;
      const b = parseInt(document.getElementById('prob-pro').value) || 0;
      const c = parseInt(document.getElementById('prob-basic').value) || 0;
      const sum = a + b + c;
      const el = document.getElementById('prob-sum');
      el.textContent = `总和: ${sum}`;
      el.style.color = sum === 10000 ? 'var(--success)' : 'var(--error)';
    });
  });

  // 设置价格
  document.getElementById('btn-set-price').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-price');
    try {
      setButtonLoading(btn, true);
      const price = document.getElementById('new-box-price').value.trim();
      if (!price) return showToast('请填写价格', 'error');
      const signer = getSigner();
      const contract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, signer);
      const tx = await contract.setBoxPrice(parseUnits(price, 18));
      await waitForTx(tx, `✅ 价格已更新为 ${price} GUGU`);
      loadBoxConfig();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新价格'); }
  });

  // 设置概率
  document.getElementById('btn-set-probs').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-probs');
    try {
      setButtonLoading(btn, true);
      const a = parseInt(document.getElementById('prob-founder').value) || 0;
      const b = parseInt(document.getElementById('prob-pro').value) || 0;
      const c = parseInt(document.getElementById('prob-basic').value) || 0;
      if (a + b + c !== 10000) return showToast('概率总和必须等于 10000', 'error');
      const signer = getSigner();
      const contract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, signer);
      const tx = await contract.setProbabilities([a, b, c]);
      await waitForTx(tx, '✅ 概率已更新');
      loadBoxConfig();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新概率'); }
  });

  // 设置 Subscription ID
  document.getElementById('btn-set-sub-id').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-sub-id');
    try {
      setButtonLoading(btn, true);
      const subId = document.getElementById('vrf-sub-id').value.trim();
      if (!subId) return showToast('请填写 Subscription ID', 'error');
      const signer = getSigner();
      const contract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, signer);
      const tx = await contract.setSubscriptionId(subId);
      await waitForTx(tx, '✅ Subscription ID 已更新');
      loadBoxConfig();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新 Subscription ID'); }
  });

  // 设置 VRF 配置
  document.getElementById('btn-set-vrf').addEventListener('click', async () => {
    if (!isConnected()) return showToast('请先连接钱包', 'error');
    const btn = document.getElementById('btn-set-vrf');
    try {
      setButtonLoading(btn, true);
      const keyHash = document.getElementById('vrf-key-hash').value.trim();
      const gasLimit = parseInt(document.getElementById('vrf-gas-limit').value) || 0;
      const confirmations = parseInt(document.getElementById('vrf-confirmations').value) || 0;
      if (!keyHash || !gasLimit) return showToast('请填写完整 VRF 配置', 'error');
      const signer = getSigner();
      const contract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, signer);
      const tx = await contract.setVRFConfig(keyHash, gasLimit, confirmations);
      await waitForTx(tx, '✅ VRF 配置已更新');
      loadBoxConfig();
    } catch (err) { handleError(err); }
    finally { setButtonLoading(btn, false, '更新 VRF 配置'); }
  });

  return () => {};
}

async function loadBoxConfig() {
  try {
    const provider = getProvider();
    if (!provider) return;
    const contract = new Contract(MysteryBox_ADDRESS, MysteryBox_ABI, provider);

    // 价格
    try {
      const price = await contract.boxPrice();
      const el = document.getElementById('box-cur-price');
      if (el) el.textContent = fmtToken(price) + ' GUGU';
    } catch {}

    // 概率
    for (let i = 0; i < 3; i++) {
      try {
        const prob = await contract.probabilities(i);
        const el = document.getElementById(`box-prob-${i}`);
        if (el) el.textContent = `${Number(prob)} (${Number(prob) / 100}%)`;
      } catch {}
    }

    // VRF 配置
    try {
      const subId = await contract.s_subscriptionId();
      const el = document.getElementById('box-sub-id');
      if (el) el.textContent = subId.toString();
    } catch {}
    try {
      const gas = await contract.s_callbackGasLimit();
      const el = document.getElementById('box-gas-limit');
      if (el) el.textContent = Number(gas).toLocaleString();
    } catch {}
    try {
      const conf = await contract.s_requestConfirmations();
      const el = document.getElementById('box-confirmations');
      if (el) el.textContent = Number(conf).toString();
    } catch {}
  } catch {}
}
