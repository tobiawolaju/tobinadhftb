// Import necessary libraries
require('dotenv').config();
const { ethers } = require('ethers');

// --- Configuration ---
// Load environment variables from .env file
const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.MONAD_RPC_URL;

// Load the token contract addresses from bot.js
const MON_TOKEN_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'; // WARNING: This is a placeholder address!
const USDC_ADDRESS = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

// --- Validation ---
if (!privateKey || !rpcUrl) {
    console.error("🛑 Error: Missing PRIVATE_KEY or MONAD_RPC_URL in .env file.");
    console.error("Please ensure you have a .env file with the required variables set.");
    process.exit(1);
}

// --- Minimal ERC20 ABI ---
// We only need a few functions from the ERC20 standard to check balances and details.
const erc20Abi = [
    // A human-readable ABI for getting the balance
    "function balanceOf(address owner) view returns (uint256)",
    // A human-readable ABI for getting the token's decimals
    "function decimals() view returns (uint8)",
    // A human-readable ABI for getting the token's symbol
    "function symbol() view returns (string)",
];

// --- Blockchain Connection ---
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// --- Contract Instances ---
const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
const monTokenContract = new ethers.Contract(MON_TOKEN_ADDRESS, erc20Abi, provider);

/**
 * A helper function to get and print the balance of an ERC20 token.
 * @param {ethers.Contract} contract - The ethers contract instance.
 * @param {string} walletAddress - The address of the wallet to check.
 */
async function getTokenBalance(contract, walletAddress) {
    try {
        const [balance, decimals, symbol] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
            contract.symbol(),
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);
        console.log(`   ${symbol}: ${formattedBalance}`);
    } catch (error) {
        const symbol = await contract.symbol().catch(() => "Unknown Token");
        console.error(`   Could not fetch balance for ${symbol} (${contract.target}): ${error.message}`);
    }
}


/**
 * Main function to check and display all balances.
 */
async function checkBalances() {
    console.log(`\nChecking balances for wallet: ${wallet.address}\n`);

    // 1. Check Native MON Balance
    try {
        const nativeBalance = await provider.getBalance(wallet.address);
        console.log(`🔹 Native Currency:`);
        console.log(`   MON: ${ethers.formatEther(nativeBalance)}`);
    } catch (error) {
        console.error(`   Could not fetch native MON balance: ${error.message}`);
    }


    // 2. Check ERC20 Token Balances
    console.log(`\n🔹 ERC20 Tokens:`);
    await getTokenBalance(usdcContract, wallet.address);

    // Note: This will likely fail or show 0, as the address is a placeholder for a different network.
    console.log("\n   (Checking placeholder MON token address...)");
    await getTokenBalance(monTokenContract, wallet.address);

    console.log("\n✅ Balance check complete.");
}

// Run the balance check
checkBalances().catch(error => {
    console.error("\n🔥 A fatal error occurred during the balance check:", error);
    process.exit(1);
});
