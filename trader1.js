const monadSwap = require('./monad-swap-lib');

const CHECK_INTERVAL_MS = 5000;            // 5s cycle
const MIN_PROFIT_USDC = 0.005;             // Minimum profit threshold
const GAS_RESERVE_MON = 0.5;               // Reserved for gas
const MIN_MON_TRADE = 1;
const MIN_USDC_TRADE = 0.01;

let lastBuyPrice = 0;
let inFlight = false;

async function tradeCycle() {
    if (inFlight) return;

    inFlight = true;
    try {
        // Fetch balances and price
        const { mon: monBalanceRaw, usdc: usdcBalanceRaw } = await monadSwap.getBalances();
        const monBalance = parseFloat(monBalanceRaw);
        const usdcBalance = parseFloat(usdcBalanceRaw);
        const monPrice = parseFloat(await monadSwap.getMONPrice(1));

        // Minimal console output for HFT-style monitoring
        console.log(`[${new Date().toISOString()}] MON: ${monBalance.toFixed(4)} | USDC: ${usdcBalance.toFixed(6)} | Price: ${monPrice.toFixed(6)}`);

        // --- SELL CONDITION ---
        if (monBalance > GAS_RESERVE_MON + MIN_MON_TRADE) {
            const tradableMON = monBalance - GAS_RESERVE_MON;
            const expectedUSDC = tradableMON * monPrice;
            const profit = lastBuyPrice ? expectedUSDC - tradableMON * lastBuyPrice : expectedUSDC;

            if (profit >= MIN_PROFIT_USDC) {
                const { usdcReceived, txHash } = await monadSwap.MONtoUSDC(tradableMON, 2, true);
                console.log(`🔼 Sold ${tradableMON.toFixed(4)} MON → ${usdcReceived.toFixed(6)} USDC | Profit: ${profit.toFixed(6)} | TX: ${txHash.slice(0, 10)}...`);
            }
        }

        // --- BUY CONDITION ---
        else if (usdcBalance > MIN_USDC_TRADE) {
            const expectedMON = usdcBalance / monPrice;
            const { monReceived, txHash } = await monadSwap.USDCtoMON(usdcBalance, 2, true);
            lastBuyPrice = monPrice;
            console.log(`🔽 Bought ${monReceived.toFixed(4)} MON for ${usdcBalance.toFixed(6)} USDC | TX: ${txHash.slice(0, 10)}...`);
        }

    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        if (err.message.includes('insufficient balance')) console.error('→ Insufficient gas reserve');
        else if (err.message.includes('execution reverted')) console.error('→ TX reverted (liquidity/price)');
    } finally {
        inFlight = false;
    }
}

async function main() {
    console.log('🚀 Initializing Monad Swap...');
    const { walletAddress, routerAddress } = monadSwap.initialize();
    console.log(`✅ Wallet: ${walletAddress} | Router: ${routerAddress}`);
    console.log(`⚙️ Gas Reserve: ${GAS_RESERVE_MON} MON | Min Profit: ${MIN_PROFIT_USDC} USDC | Interval: ${CHECK_INTERVAL_MS / 1000}s | Slippage: 2%\n`);

    // Start trading loop
    tradeCycle();
    setInterval(tradeCycle, CHECK_INTERVAL_MS);
}

if (require.main === module) main();

module.exports = { main };
