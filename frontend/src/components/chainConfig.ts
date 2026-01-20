export const ARC_TESTNET_CONFIG = {
    // Contract Addresses
    USDC_ADDRESS: import.meta.env.VITE_USDC_ADDRESS || "0x3600000000000000000000000000000000000000",
    SESSION_CONTRACT_ADDRESS: import.meta.env.VITE_SESSION_CONTRACT_ADDRESS || "0x7AC7B17410641853C369874536a9248D0CD14947", // Current Deployment

    // Logic Constants
    HOURLY_RATE_USDC: "0.001",
    HOURLY_RATE_UNITS: 1000n, // 0.001 * 10^6
    USDC_DECIMALS: 6,

    // Network Info
    CHAIN_ID_DECIMAL: 5042002,
    CHAIN_ID_HEX: "0x4cef52", // 5042002 in hex (Corrected)
    NETWORK_PARAMS: {
        chainId: "0x4cef52",
        chainName: "Arc Testnet",
        nativeCurrency: {
            name: "USDC",
            symbol: "USDC", // Updated to USDC per screenshot
            decimals: 18
        },
        rpcUrls: ["https://rpc.testnet.arc.network"],
        blockExplorerUrls: ["https://testnet.arcscan.app"]
    },

    // ABIs
    ERC20_ABI: [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ],

    SESSION_ABI: [
        "function extendSession() external payable",
        "function paySessionFee(uint256 amount) external",
        "event SessionExtended(address indexed user, uint256 timestamp)"
    ]
};
