// ═══════════════════════════════════════════
//         GUGU DeFi — 合约地址 & ABI
// ═══════════════════════════════════════════

// ── 网络配置 ──

const NETWORKS = {
  mainnet: {
    CHAIN_ID: 56,
    CHAIN_NAME: 'BNB Smart Chain',
    CHAIN_RPC: 'https://bsc-dataseed1.binance.org',
    CHAIN_EXPLORER: 'https://bscscan.com',
    CHAIN_CURRENCY: 'BNB',
    GUGUToken_ADDRESS:  '0xD3ff9f7F301A7b5e56A2171D09adCBfB8446Df97',
    GUGUNFT_ADDRESS:    '0x485726cdbc7D388896aaED7aCF9D02f3d7339dff',
    NFTStaking_ADDRESS: '0x4Fe07dBA8dc600BAD8843FfB0C7C316895145b8D',
    MysteryBox_ADDRESS: '0xd5A512152B1736a2808dDdB7139E05E445de044B',
    TokenSwap_ADDRESS:  '0x923d923d5b4201d1F6cb38Acc7159C7dAdB76A52',
    Airdrop_ADDRESS:    '0x513DFF2bdccabcc9B65241F1211DC243c11f1684',
  },
  testnet: {
    CHAIN_ID: 97,
    CHAIN_NAME: 'BSC Testnet',
    CHAIN_RPC: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    CHAIN_EXPLORER: 'https://testnet.bscscan.com',
    CHAIN_CURRENCY: 'tBNB',
    GUGUToken_ADDRESS:  '0x04BdeA7C305aCBdC05072DA1Ce29729d6880f89a',
    GUGUNFT_ADDRESS:    '0x764f16e89FE34E3DE8Fab2b0f21003a5Ee31210B',
    NFTStaking_ADDRESS: '0xCee4A2B098d9BfEAe91Bd942Af21Ca257683fE7C',
    MysteryBox_ADDRESS: '0xf07255d83bAdE34eCf1e64775c30B7D751d5D914',
    TokenSwap_ADDRESS:  '0x5cD6520090d623695aE44391DB9110F12Af0449E',
    Airdrop_ADDRESS:    '0xff0b91F7eEE1d6E0771d84369791eCB8876E4567',
  },
};

// 通过 VITE_NETWORK 环境变量选择网络 (默认 testnet)
const network = import.meta.env.VITE_NETWORK || 'testnet';
const config = NETWORKS[network] || NETWORKS.testnet;

export const NETWORK_NAME     = network;
export const CHAIN_ID         = config.CHAIN_ID;
export const CHAIN_NAME       = config.CHAIN_NAME;
export const CHAIN_RPC        = config.CHAIN_RPC;
export const CHAIN_EXPLORER   = config.CHAIN_EXPLORER;
export const CHAIN_CURRENCY   = config.CHAIN_CURRENCY;

export const GUGUToken_ADDRESS  = config.GUGUToken_ADDRESS;
export const GUGUNFT_ADDRESS    = config.GUGUNFT_ADDRESS;
export const NFTStaking_ADDRESS = config.NFTStaking_ADDRESS;
export const MysteryBox_ADDRESS = config.MysteryBox_ADDRESS;
export const TokenSwap_ADDRESS  = config.TokenSwap_ADDRESS;
export const Airdrop_ADDRESS    = config.Airdrop_ADDRESS;

// ── ABI 片段 ──

export const GUGUNFT_ABI = [
  'function mintPublic(uint8 rarity) external payable',
  'function getRarity(uint256 tokenId) external view returns (uint8)',
  'function totalSupplyByRarity(uint8) external view returns (uint256)',
  'function mintPriceByRarity(uint8) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'event NFTMinted(address indexed to, uint256 indexed tokenId, uint8 rarity)',
  // ── Admin ──
  'function owner() external view returns (address)',
  'function addMinter(address minter) external',
  'function removeMinter(address minter) external',
  'function minters(address) external view returns (bool)',
  'function mint(address to, uint8 rarity) external returns (uint256)',
  'function mintBatch(address to, uint8 rarity, uint256 quantity) external',
  'function setBaseURI(string calldata baseURI) external',
  'function setMintPrice(uint8 rarity, uint256 price) external',
  'function withdraw() external',
];

export const GUGUToken_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function MAX_SUPPLY() external view returns (uint256)',
  // ── Admin ──
  'function owner() external view returns (address)',
  'function mint(address to, uint256 amount) external',
  'function addBlacklist(address account) external',
  'function removeBlacklist(address account) external',
  'function blacklisted(address) external view returns (bool)',
];

export const NFTStaking_ABI = [
  'function stake(uint256 tokenId) external',
  'function stakeBatch(uint256[] calldata tokenIds) external',
  'function unstake(uint256 tokenId) external',
  'function unstakeBatch(uint256[] calldata tokenIds) external',
  'function claimRewards() external',
  'function pendingRewards(address user) external view returns (uint256)',
  'function stakedTokensOf(address user) external view returns (uint256[])',
  'function stakedCountOf(address user) external view returns (uint256)',
  'function dailyReward(uint8 rarity) external view returns (uint256)',
  'event Staked(address indexed user, uint256 indexed tokenId, uint8 rarity)',
  'event Unstaked(address indexed user, uint256 indexed tokenId, uint256 reward)',
  'event RewardsClaimed(address indexed user, uint256 reward)',
  // ── Admin ──
  'function owner() external view returns (address)',
  'function setDailyReward(uint8 rarity, uint256 rewardPerDay) external',
  'function rescueToken(address to, uint256 amount) external',
];

export const MysteryBox_ABI = [
  'function buyBox(uint256 quantity) external',
  'function currentBoxPrice() external view returns (uint256)',
  'function basePrice() external view returns (uint256)',
  'function maxPrice() external view returns (uint256)',
  'function totalBoxOpened() external view returns (uint256)',
  'function probabilities(uint256 index) external view returns (uint256)',
  'function getRequestStatus(uint256 requestId) external view returns (bool fulfilled, uint256[] memory randomWords)',
  'function getRequestIds() external view returns (uint256[])',
  'function MAX_PER_TX() external view returns (uint256)',
  'event BoxRequested(address indexed buyer, uint256 indexed requestId, uint256 quantity, uint256 totalCost)',
  'event BoxOpened(address indexed buyer, uint256 indexed tokenId, uint8 rarity)',
  // ── Admin ──
  'function s_subscriptionId() external view returns (uint256)',
  'function s_keyHash() external view returns (bytes32)',
  'function s_callbackGasLimit() external view returns (uint32)',
  'function s_requestConfirmations() external view returns (uint16)',
  'function setBasePrice(uint256 _basePrice) external',
  'function setMaxPrice(uint256 _maxPrice) external',
  'function setProbabilities(uint256[3] calldata probs) external',
  'function setVRFConfig(bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations) external',
  'function setSubscriptionId(uint256 subscriptionId) external',
];

export const TokenSwap_ABI = [
  // ── User Functions ──
  'function buy(uint256 payAmount) external',
  'function getAmountOut(uint256 payAmount) external view returns (uint256)',
  'function remainingSupply() external view returns (uint256)',
  'function saleToken() external view returns (address)',
  'function payToken() external view returns (address)',
  'function price() external view returns (uint256)',
  'function paused() external view returns (bool)',
  // ── Admin ──
  'function owner() external view returns (address)',
  'function setPrice(uint256 _price) external',
  'function setPaused(bool _paused) external',
  'function withdrawToken(address token, uint256 amount) external',
  'function withdrawETH() external',
  // ── Events ──
  'event TokensPurchased(address indexed buyer, uint256 payAmount, uint256 saleAmount)',
  'event PriceUpdated(uint256 oldPrice, uint256 newPrice)',
  'event SalePaused(bool paused)',
];

// ── 稀有度常量 ──

export const Airdrop_ABI = [
  'function owner() external view returns (address)',
  'function guguNFT() external view returns (address)',
  'function MAX_BATCH_SIZE() external view returns (uint256)',
  'function airdropTokenEqual(address token, address[] calldata recipients, uint256 amountEach) external',
  'function airdropTokenCustom(address token, address[] calldata recipients, uint256[] calldata amounts) external',
  'function airdropNFT(address[] calldata recipients, uint8 rarity) external',
  'function rescueToken(address token) external',
  'event TokenAirdropped(address indexed token, uint256 totalRecipients, uint256 totalAmount)',
  'event NFTAirdropped(uint256 totalRecipients, uint8 rarity)',
];


export const RARITY = {
  Founder: 0,
  Pro: 1,
  Basic: 2,
};

export const RARITY_NAMES = ['Founder', 'Pro', 'Basic'];
export const RARITY_COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4'];
export const RARITY_EMOJIS = ['👑', '⚡', '🌟'];

export const MINT_PRICES_ETH = ['0.25', '0.025', '0.0025'];

export const DAILY_REWARDS = ['50', '15', '3'];

// ── Tokenomics ──

export const TOKENOMICS = {
  total: 100_000_000,
  allocations: [
    { name: 'Uniswap 流动性池', amount: 30_000_000, pct: 30, color: '#8b5cf6' },
    { name: 'NFT 质押产出',     amount: 40_000_000, pct: 40, color: '#06b6d4' },
    { name: '团队持有',         amount: 15_000_000, pct: 15, color: '#f59e0b' },
    { name: '盲盒运营',         amount: 10_000_000, pct: 10, color: '#ec4899' },
    { name: '预留',             amount:  5_000_000, pct:  5, color: '#10b981' },
  ],
};
