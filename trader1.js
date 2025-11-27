const monadSwap = require('./monad-swap-lib');

const CHECK_INTERVAL = 5 * 1000; // 5 seconds
const MIN_PROFIT_USDC = 0.005;    // Minimum profit per trade to execute
const GAS_RESERVE_MON = 0.5;      // Keep 0.5 MON for gas fees
const MIN_TRADE_AMOUNT_MON = 1;   // Minimum MON to trade
const MIN_TRADE_AMOUNT_USDC = 0.01; // Minimum USDC to trade

let lastBuyPrice = 0; // Track the last price at which MON was bought
let isTrading = false; // Prevent concurrent trades

async function tradeCycle() {
    if (isTrading) {
        console.log('⏭️ Previous trade still in progress, skipping...');
        return;
    }

    try {
        isTrading = true;

        // Get balances
        const balances = await monadSwap.getBalances();
        const monBalance = parseFloat(balances.mon);
        const usdcBalance = parseFloat(balances.usdc);

        // Get current MON price
        const monPrice = parseFloat(await monadSwap.getMONPrice(1));
        console.log(`\n[${new Date().toLocaleTimeString()}] MON: ${monBalance.toFixed(4)} | USDC: ${usdcBalance.toFixed(6)} | Price: ${monPrice.toFixed(6)} USDC`);

        // --- SELL LOGIC (MON → USDC) ---
        if (monBalance > (GAS_RESERVE_MON + MIN_TRADE_AMOUNT_MON)) {
            const tradableAmount = monBalance - GAS_RESERVE_MON;
            const expectedUSDC = tradableAmount * monPrice;
            const profit = lastBuyPrice > 0 ? expectedUSDC - (tradableAmount * lastBuyPrice) : expectedUSDC;

            if (profit > MIN_PROFIT_USDC) {
                console.log(`🔼 Selling ${tradableAmount.toFixed(4)} MON (keeping ${GAS_RESERVE_MON} for gas)`);
                console.log(`   Expected profit: ${profit.toFixed(6)} USDC`);

                const result = await monadSwap.MONtoUSDC(tradableAmount, 2, true); // 2% slippage for safety
                console.log(`✅ Sold! Got ${result.usdcReceived} USDC (TX: ${result.txHash.slice(0, 10)}...)`);
            } else {
                console.log(`⚠️ Profit too low (${profit.toFixed(6)} USDC < ${MIN_PROFIT_USDC}), holding...`);
            }
        }

        // --- BUY LOGIC (USDC → MON) ---
        else if (usdcBalance > MIN_TRADE_AMOUNT_USDC) {
            const expectedMON = usdcBalance / monPrice;

            console.log(`🔽 Buying MON with ${usdcBalance.toFixed(6)} USDC`);
            console.log(`   Expected: ${expectedMON.toFixed(4)} MON`);

            const result = await monadSwap.USDCtoMON(usdcBalance, 2, true); // 2% slippage for safety
            lastBuyPrice = monPrice; // Record buy price
            console.log(`✅ Bought! Got ${result.monReceived} MON (TX: ${result.txHash.slice(0, 10)}...)`);
        }

        else {
            console.log(`ℹ️ No tradable balance (MON: ${monBalance.toFixed(4)}, USDC: ${usdcBalance.toFixed(6)})`);
        }

    } catch (error) {
        console.error(`\n🔥 Error in trade cycle: ${error.message}`);

        // Check if it's a known issue
        if (error.message.includes('insufficient balance')) {
            console.error('   → Not enough MON for gas fees!');
        } else if (error.message.includes('execution reverted')) {
            console.error('   → Transaction reverted (likely low liquidity or price moved)');
        }
    } finally {
        isTrading = false;
    }
}

async function main() {
    console.log('🚀 Initializing Monad Swap Library...');
    const config = monadSwap.initialize();
    console.log(`✅ Wallet: ${config.walletAddress}`);
    console.log(`✅ Router: ${config.routerAddress}`);
    console.log(`\n⚙️ Settings:`);
    console.log(`   Gas Reserve: ${GAS_RESERVE_MON} MON`);
    console.log(`   Min Profit: ${MIN_PROFIT_USDC} USDC`);
    console.log(`   Check Interval: ${CHECK_INTERVAL / 1000}s`);
    console.log(`   Slippage: 2%\n`);

    console.log(`⏳ Starting trading loop...\n`);
    tradeCycle(); // run immediately
    setInterval(tradeCycle, CHECK_INTERVAL); // repeat every 30 seconds
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { main };
