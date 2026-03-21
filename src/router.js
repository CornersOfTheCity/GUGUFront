// ═══════════════════════════════════════════
//          简单 Hash 路由
// ═══════════════════════════════════════════

const routes = {};
let currentCleanup = null;

/**
 * 注册路由
 */
export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

/**
 * 导航到指定路由
 */
export function navigateTo(path) {
  window.location.hash = path;
}

/**
 * 初始化路由
 */
export function initRouter() {
  const handleRoute = async () => {
    const hash = window.location.hash || '#/mint';
    const path = hash.replace('#', '');
    const renderFn = routes[path] || routes['/mint'];

    // 清理上一个页面
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
    }

    const container = document.getElementById('page-content');
    if (container && renderFn) {
      currentCleanup = await renderFn(container);
    }

    // 更新导航高亮
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // 暴露刷新函数
  refreshCurrentPage = handleRoute;
}

/**
 * 刷新当前页面（钱包连接后调用）
 */
export let refreshCurrentPage = () => {};
