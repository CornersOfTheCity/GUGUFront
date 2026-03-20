// ═══════════════════════════════════════════
//          工具函数
// ═══════════════════════════════════════════

import { formatEther, formatUnits } from 'ethers';

/**
 * 格式化 ETH (wei → ETH)
 */
export function fmtEth(wei) {
  if (!wei) return '0';
  return formatEther(wei);
}

/**
 * 格式化 Token (18位精度)
 */
export function fmtToken(amount, decimals = 18) {
  if (!amount) return '0';
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.01) return '< 0.01';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * 显示 toast 通知
 */
export function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.className = `toast-container toast-${type}`;
  container.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</div>
    <div class="toast-message">${message}</div>
  `;
  document.body.appendChild(container);

  requestAnimationFrame(() => container.classList.add('toast-visible'));

  setTimeout(() => {
    container.classList.remove('toast-visible');
    setTimeout(() => container.remove(), 300);
  }, 4000);
}

/**
 * 等待交易确认并显示反馈
 */
export async function waitForTx(tx, successMsg = '交易成功！') {
  showToast('交易已提交，等待确认...', 'info');
  const receipt = await tx.wait();
  if (receipt.status === 1) {
    showToast(successMsg, 'success');
  } else {
    showToast('交易失败！', 'error');
  }
  return receipt;
}

/**
 * 统一错误处理
 */
export function handleError(err) {
  console.error(err);
  let msg = '操作失败';
  if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
    msg = '用户取消了操作';
  } else if (err.reason) {
    msg = err.reason;
  } else if (err.message) {
    msg = err.message.length > 100 ? err.message.slice(0, 100) + '...' : err.message;
  }
  showToast(msg, 'error');
}

/**
 * 创建 loading 按钮状态
 */
export function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> 处理中...';
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.originalText || '确认';
  }
}
