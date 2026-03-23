# GUGU DeFi Frontend

GUGU DeFi 去中心化金融平台前端，基于 Vite + Ethers.js 构建。

## 功能模块

| 模块 | 用户端 | 管理端 |
|------|--------|--------|
| 🪙 Token | 仪表盘查看 | 铸造 / 转账 / 黑名单 |
| 💎 NFT | 铸造 (Founder/Pro/Basic) | 批量铸造 / Minter 管理 |
| 🔒 质押 | 质押 NFT / 领取奖励 | 设置日奖励 / Rescue Token |
| 🎁 盲盒 | 购买盲盒 (Chainlink VRF) | 价格 / 概率 / VRF 配置 |
| 🔄 兑换 | 代币兑换 | 创建交易对 / 修改汇率 / 流动性 |
| 🪂 空投 | — | 批量空投 NFT |
| 📊 仪表盘 | Tokenomics 可视化 | — |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认测试网）
npm run dev -- --host
```

## 多网络支持

项目支持 **BSC 主网** 和 **BSC 测试网** 两套环境，通过 `VITE_NETWORK` 环境变量切换：

```bash
# 测试网（默认）
npm run dev           # 或 npm run dev:testnet
npm run build:testnet

# 主网
npm run dev:mainnet
npm run build:mainnet
```

启动后导航栏会显示当前网络标识：
- 🟢 **BNB Smart Chain** — 主网
- 🟡 **BSC Testnet** — 测试网

### 网络配置

| 配置项 | 主网 (BSC) | 测试网 (BSC Testnet) |
|--------|-----------|---------------------|
| Chain ID | 56 | 97 |
| 代币 | BNB | tBNB |
| 浏览器 | bscscan.com | testnet.bscscan.com |

合约地址配置在 `src/config/contracts.js` 的 `NETWORKS` 对象中。

## 项目结构

```
src/
├── config/
│   └── contracts.js    # 合约地址 / ABI / 网络配置
├── modules/
│   ├── wallet.js       # MetaMask 钱包连接
│   └── utils.js        # 工具函数
├── pages/              # 用户端页面
│   ├── mint.js         # NFT 铸造
│   ├── staking.js      # NFT 质押
│   ├── mysterybox.js   # 盲盒
│   ├── swap.js         # 代币兑换
│   └── dashboard.js    # 仪表盘
├── admin/              # 管理端页面
│   ├── token-manage.js
│   ├── nft-manage.js
│   ├── staking-manage.js
│   ├── box-manage.js
│   ├── swap-manage.js
│   └── airdrop-manage.js
├── router.js           # Hash 路由
├── main.js             # 用户端入口
├── admin.js            # 管理端入口
└── style.css           # 全局样式
```

## 访问地址

- 用户端: `http://localhost:5173/`
- 管理端: `http://localhost:5173/admin.html`

## 技术栈

- **Vite 8** — 构建工具
- **Ethers.js 6** — 区块链交互
- **Vanilla JS** — 无框架，纯 JS 实现
