const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎰 Deploying Lucky Number dApp...\n");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    
    // Get account balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");
    
    // Deploy the LuckyNumber contract
    console.log("🚀 Deploying LuckyNumber contract...");
    const LuckyNumber = await ethers.getContractFactory("LuckyNumber");
    const luckyNumber = await LuckyNumber.deploy();
    
    await luckyNumber.waitForDeployment();
    console.log("✅ LuckyNumber deployed to:", luckyNumber.target);
    
    // Fund the contract with some ETH for payouts
    const fundingAmount = ethers.parseEther("0.1"); // 0.1 ETH
    console.log(`\n💸 Funding contract with ${ethers.formatEther(fundingAmount)} ETH...`);
    
    const fundTx = await deployer.sendTransaction({
        to: luckyNumber.target,
        value: fundingAmount
    });
    await fundTx.wait();
    
    console.log("✅ Contract funded successfully!");
    
    // Display contract info
    console.log("\n📊 Contract Information:");
    console.log("========================");
    console.log("Contract Address:", luckyNumber.target);
    console.log("Owner Address:", deployer.address);
    console.log("Network:", hre.network.name);
    console.log("Min Bet:", ethers.formatEther(await luckyNumber.MIN_BET()), "ETH");
    console.log("Max Bet:", ethers.formatEther(await luckyNumber.MAX_BET()), "ETH");
    
    const contractBalance = await ethers.provider.getBalance(luckyNumber.target);
    console.log("Contract Balance:", ethers.formatEther(contractBalance), "ETH");
    
    // Verify contract on Etherscan (if on public network)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: luckyNumber.target,
                constructorArguments: [],
            });
            console.log("✅ Contract verified on Etherscan!");
        } catch (error) {
            console.log("❌ Verification failed:", error.message);
        }
    }
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: luckyNumber.target,
        ownerAddress: deployer.address,
        deploymentTime: new Date().toISOString(),
        txHash: luckyNumber.deploymentTransaction().hash,
        blockNumber: luckyNumber.deploymentTransaction().blockNumber
    };
    
    console.log("\n📄 Deployment Summary:");
    console.log("======================");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n🎲 Your Lucky Number dApp is ready to play!");
    console.log("\nNext steps:");
    console.log("1. Update frontend config with contract address:", luckyNumber.target);
    console.log("2. Start the frontend: cd frontend && npm run dev");
    console.log("3. Connect your wallet and start playing!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });