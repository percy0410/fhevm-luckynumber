const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking contract status...\n");
    
    // Contract address from deployment
    const contractAddress = "0x6b6ec23d898D4e2d26ca926Dbca529391A76c59a";
    
    // Get the contract instance
    const LuckyNumber = await ethers.getContractFactory("LuckyNumber");
    const luckyNumber = LuckyNumber.attach(contractAddress);
    
    try {
        // Check if contract is paused
        const isPaused = await luckyNumber.paused();
        console.log("📍 Contract Address:", contractAddress);
        console.log("⏸️  Paused:", isPaused);
        
        // Get owner
        const owner = await luckyNumber.owner();
        console.log("👤 Owner:", owner);
        
        // Get current signer
        const [signer] = await ethers.getSigners();
        console.log("🔑 Current Signer:", signer.address);
        
        // Get contract balance
        const balance = await ethers.provider.getBalance(contractAddress);
        console.log("💰 Contract Balance:", ethers.formatEther(balance), "ETH");
        
        // Get bet limits
        const minBet = await luckyNumber.MIN_BET();
        const maxBet = await luckyNumber.MAX_BET();
        console.log("📊 Min Bet:", ethers.formatEther(minBet), "ETH");
        console.log("📊 Max Bet:", ethers.formatEther(maxBet), "ETH");
        
        if (isPaused) {
            console.log("\n⚠️  WARNING: Contract is PAUSED!");
            console.log("💡 To unpause, run: npx hardhat run scripts/unpause-contract.js --network sepolia");
        } else {
            console.log("\n✅ Contract is ACTIVE and ready to accept bets!");
        }
        
    } catch (error) {
        console.error("❌ Error checking contract:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Check failed:", error);
        process.exit(1);
    });
