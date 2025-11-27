// Monad Swap Library
// A simple library for swapping MON and USDC on Monad mainnet

require('dotenv').config();
const { ethers } = require('ethers');

// --- Configuration ---
const USDC_ADDRESS = '0x754704bc059f8c67012fed69bc8a327a5aafb603'; // Official USDC on Monad
const ROUTER_ADDRESS = '0x4b2ab38dbf28d31d467aa8993f6c2585981d6804'; // Uniswap V2 Router02
const WMON_ADDRESS = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A'; // Wrapped MON

const DEFAULT_SLIPPAGE = 1; // 1%
const DEFAULT_DEADLINE_MINUTES = 10;

// --- ABIs ---
const erc20Abi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const routerAbi = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
];

// --- Initialize Connection ---
let provider, wallet, usdcContract, routerContract;

function initialize(privateKey = null, rpcUrl = null) {
    const key = privateKey || process.env.PRIVATE_KEY;
    const url = rpcUrl || process.env.MONAD_RPC_URL;

    if (!key || !url) {
        throw new Error("Missing PRIVATE_KEY or MONAD_RPC_URL");
    }

    provider = new ethers.JsonRpcProvider(url);
    wallet = new ethers.Wallet(key, provider);
    usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, wallet);
    routerContract = new ethers.Contract(ROUTER_ADDRESS, routerAbi, wallet);

    return {
        walletAddress: wallet.address,
        routerAddress: ROUTER_ADDRESS,
        usdcAddress: USDC_ADDRESS,
        wmonAddress: WMON_ADDRESS
    };
}

// --- Helper Functions ---

function calculateMinAmountOut(expectedAmount, slippagePercent) {
    const slippage = BigInt(Math.floor(slippagePercent * 100));
    return (expectedAmount * (10000n - slippage)) / 10000n;
}

function getDeadline(minutesFromNow = DEFAULT_DEADLINE_MINUTES) {
    return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
}

// --- Balance Functions ---

/**
 * Get MON (native token) balance
 * @returns {Promise<string>} Balance in MON (formatted)
 */
async function getMONBalance() {
    if (!wallet) throw new Error("Library not initialized. Call initialize() first.");
    const balance = await provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
}

/**
 * Get USDC balance
 * @returns {Promise<string>} Balance in USDC (formatted)
 */
async function getUSDCBalance() {
    if (!usdcContract) throw new Error("Library not initialized. Call initialize() first.");
    const balance = await usdcContract.balanceOf(wallet.address);
    return ethers.formatUnits(balance, 6);
}

/**
 * Get both MON and USDC balances
 * @returns {Promise<{mon: string, usdc: string}>}
 */
async function getBalances() {
    const [mon, usdc] = await Promise.all([
        getMONBalance(),
        getUSDCBalance()
    ]);
    return { mon, usdc };
}

// --- Price Functions ---

/**
 * Get MON price in USDC
 * @param {number} monAmount - Amount of MON to check price for (default: 1)
 * @returns {Promise<string>} Price in USDC
 */
async function getMONPrice(monAmount = 1) {
    if (!routerContract) throw new Error("Library not initialized. Call initialize() first.");

    const amountIn = ethers.parseEther(monAmount.toString());
    const path = [WMON_ADDRESS, USDC_ADDRESS];

    const amounts = await routerContract.getAmountsOut(amountIn, path);
    const usdcOut = amounts[amounts.length - 1];

    return ethers.formatUnits(usdcOut, 6);
}

/**
 * Get USDC price in MON
 * @param {number} usdcAmount - Amount of USDC to check price for (default: 1)
 * @returns {Promise<string>} Price in MON
 */
async function getUSDCPrice(usdcAmount = 1) {
    if (!routerContract) throw new Error("Library not initialized. Call initialize() first.");

    const amountIn = ethers.parseUnits(usdcAmount.toString(), 6);
    const path = [USDC_ADDRESS, WMON_ADDRESS];

    const amounts = await routerContract.getAmountsOut(amountIn, path);
    const monOut = amounts[amounts.length - 1];

    return ethers.formatEther(monOut);
}

// --- Swap Functions ---

/**
 * Swap MON (native token) for USDC
 * @param {number} monAmount - Amount of MON to swap
 * @param {number} slippage - Slippage tolerance percentage (default: 1%)
 * @param {boolean} verbose - Log detailed output (default: true)
 * @returns {Promise<{success: boolean, txHash: string, usdcReceived: string, blockNumber: number}>}
 */
async function MONtoUSDC(monAmount, slippage = DEFAULT_SLIPPAGE, verbose = true) {
    if (!wallet || !routerContract) {
        throw new Error("Library not initialized. Call initialize() first.");
    }

    try {
        const amountIn = ethers.parseEther(monAmount.toString());

        if (verbose) {
            console.log(`\n🔄 Swapping ${monAmount} MON to USDC...`);
        }

        // Check balance
        const balance = await provider.getBalance(wallet.address);
        if (balance < amountIn) {
            throw new Error(`Insufficient MON balance. Have: ${ethers.formatEther(balance)}, Need: ${monAmount}`);
        }

        // Define swap path
        const path = [WMON_ADDRESS, USDC_ADDRESS];

        // Get expected output
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        const expectedOutput = amounts[amounts.length - 1];

        if (verbose) {
            console.log(`   Expected USDC: ${ethers.formatUnits(expectedOutput, 6)}`);
        }

        // Calculate minimum with slippage
        const minAmountOut = calculateMinAmountOut(expectedOutput, slippage);

        if (verbose) {
            console.log(`   Minimum USDC (${slippage}% slippage): ${ethers.formatUnits(minAmountOut, 6)}`);
        }

        // Execute swap
        const deadline = getDeadline();
        const tx = await routerContract.swapExactETHForTokens(
            minAmountOut,
            path,
            wallet.address,
            deadline,
            { value: amountIn }
        );

        if (verbose) {
            console.log(`   Transaction: ${tx.hash}`);
            console.log(`   Waiting for confirmation...`);
        }

        const receipt = await tx.wait();

        // Get actual USDC received
        const usdcBalance = await usdcContract.balanceOf(wallet.address);
        const usdcReceived = ethers.formatUnits(usdcBalance, 6);

        if (verbose) {
            console.log(`✅ Swap successful!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   USDC received: ${usdcReceived}`);
        }

        return {
            success: true,
            txHash: tx.hash,
            usdcReceived,
            blockNumber: receipt.blockNumber
        };

    } catch (error) {
        if (verbose) {
            console.error(`❌ Swap failed: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Swap USDC for MON (native token)
 * @param {number} usdcAmount - Amount of USDC to swap
 * @param {number} slippage - Slippage tolerance percentage (default: 1%)
 * @param {boolean} verbose - Log detailed output (default: true)
 * @returns {Promise<{success: boolean, txHash: string, monReceived: string, blockNumber: number}>}
 */
async function USDCtoMON(usdcAmount, slippage = DEFAULT_SLIPPAGE, verbose = true) {
    if (!wallet || !routerContract || !usdcContract) {
        throw new Error("Library not initialized. Call initialize() first.");
    }

    try {
        const amountIn = ethers.parseUnits(usdcAmount.toString(), 6);

        if (verbose) {
            console.log(`\n🔄 Swapping ${usdcAmount} USDC to MON...`);
        }

        // Check balance
        const balance = await usdcContract.balanceOf(wallet.address);
        if (balance < amountIn) {
            throw new Error(`Insufficient USDC balance. Have: ${ethers.formatUnits(balance, 6)}, Need: ${usdcAmount}`);
        }

        // Define swap path
        const path = [USDC_ADDRESS, WMON_ADDRESS];

        // Get expected output
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        const expectedOutput = amounts[amounts.length - 1];

        if (verbose) {
            console.log(`   Expected MON: ${ethers.formatEther(expectedOutput)}`);
        }

        // Calculate minimum with slippage
        const minAmountOut = calculateMinAmountOut(expectedOutput, slippage);

        if (verbose) {
            console.log(`   Minimum MON (${slippage}% slippage): ${ethers.formatEther(minAmountOut)}`);
        }

        // Approve USDC
        if (verbose) {
            console.log(`   Approving USDC...`);
        }

        const approveTx = await usdcContract.approve(ROUTER_ADDRESS, amountIn);
        await approveTx.wait();

        if (verbose) {
            console.log(`   ✅ Approved`);
        }

        // Execute swap
        const deadline = getDeadline();
        const tx = await routerContract.swapExactTokensForETH(
            amountIn,
            minAmountOut,
            path,
            wallet.address,
            deadline
        );

        if (verbose) {
            console.log(`   Transaction: ${tx.hash}`);
            console.log(`   Waiting for confirmation...`);
        }

        const receipt = await tx.wait();

        // Get actual MON received
        const monBalance = await provider.getBalance(wallet.address);
        const monReceived = ethers.formatEther(monBalance);

        if (verbose) {
            console.log(`✅ Swap successful!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   MON balance: ${monReceived}`);
        }

        return {
            success: true,
            txHash: tx.hash,
            monReceived,
            blockNumber: receipt.blockNumber
        };

    } catch (error) {
        if (verbose) {
            console.error(`❌ Swap failed: ${error.message}`);
        }
        throw error;
    }
}

// --- Exports ---
module.exports = {
    // Initialization
    initialize,

    // Balance functions
    getMONBalance,
    getUSDCBalance,
    getBalances,

    // Price functions
    getMONPrice,
    getUSDCPrice,

    // Swap functions
    MONtoUSDC,
    USDCtoMON,

    // Constants (for reference)
    ADDRESSES: {
        USDC: USDC_ADDRESS,
        ROUTER: ROUTER_ADDRESS,
        WMON: WMON_ADDRESS
    }
};
