// ═══════════════════════════════════════════
//         GUGU DeFi — 合约地址 & ABI
// ═══════════════════════════════════════════
// 部署后将实际地址填入此处

export const CHAIN_ID = 11155111; // Sepolia
export const CHAIN_NAME = 'Sepolia Testnet';
export const CHAIN_RPC = 'https://rpc.sepolia.org';
export const CHAIN_EXPLORER = 'https://sepolia.etherscan.io';

// ── 合约地址 (占位) ──

export const GUGUNFT_ADDRESS = '0x0000000000000000000000000000000000000001';
export const GUGUToken_ADDRESS = '0x0000000000000000000000000000000000000002';
export const NFTStaking_ADDRESS = '0x0000000000000000000000000000000000000003';
export const MysteryBox_ADDRESS = '0x0000000000000000000000000000000000000004';
export const TokenSwap_ADDRESS = '0x0000000000000000000000000000000000000005';
export const Airdrop_ADDRESS = '0x0000000000000000000000000000000000000006';

// ── ABI 片段 ──

export const GUGUNFT_ABI = [
  'function mintPublic(uint8 rarity) external payable',
  'function getRarity(uint256 tokenId) external view returns (uint8)',
  'function totalSupplyByRarity(uint8) external view returns (uint256)',
  'function maxSupplyByRarity(uint8) external view returns (uint256)',
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
];

export const MysteryBox_ABI = [
  'function buyBox(uint256 quantity) external',
  'function boxPrice() external view returns (uint256)',
  'function probabilities(uint256 index) external view returns (uint256)',
  'function getRequestStatus(uint256 requestId) external view returns (bool fulfilled, uint256[] memory randomWords)',
  'function getRequestIds() external view returns (uint256[])',
  'function MAX_PER_TX() external view returns (uint256)',
  'event BoxRequested(address indexed buyer, uint256 indexed requestId, uint256 quantity)',
  'event BoxOpened(address indexed buyer, uint256 indexed tokenId, uint8 rarity)',
  // ── Admin ──
  'function s_subscriptionId() external view returns (uint256)',
  'function s_keyHash() external view returns (bytes32)',
  'function s_callbackGasLimit() external view returns (uint32)',
  'function s_requestConfirmations() external view returns (uint16)',
  'function setBoxPrice(uint256 price) external',
  'function setProbabilities(uint256[3] calldata probs) external',
  'function setVRFConfig(bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations) external',
  'function setSubscriptionId(uint256 subscriptionId) external',
];

export const TokenSwap_ABI = [
  'function swap(uint256 pairId, address fromToken, uint256 amount) external',
  'function getAmountOut(uint256 pairId, address fromToken, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee)',
  'function pairCount() external view returns (uint256)',
  'function getPair(uint256 pairId) external view returns (tuple(address tokenA, address tokenB, uint256 rateAtoB, uint256 rateBtoA, bool active))',
  'function feeRate() external view returns (uint256)',
  // ── Admin ──
  'function owner() external view returns (address)',
  'function feeRecipient() external view returns (address)',
  'function addPair(address tokenA, address tokenB, uint256 rateAtoB, uint256 rateBtoA) external returns (uint256)',
  'function updatePairRates(uint256 pairId, uint256 rateAtoB, uint256 rateBtoA) external',
  'function setPairActive(uint256 pairId, bool active) external',
  'function addLiquidity(uint256 pairId, address token, uint256 amount) external',
  'function removeLiquidity(uint256 pairId, address token, uint256 amount) external',
  'function setFeeRate(uint256 feeRate) external',
  'function setFeeRecipient(address feeRecipient) external',
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

export const MINT_PRICES_ETH = ['0.5', '0.1', '0.02'];
export const MAX_SUPPLY = [100, 500, 2000];
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
