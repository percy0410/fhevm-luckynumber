import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("luckynumber:info", "Get Lucky Number contract information")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract } = taskArguments;
    const luckyNumber = await hre.ethers.getContractAt("LuckyNumber", contract);

    console.log("\n📊 Lucky Number Contract Information:");
    console.log("====================================");
    console.log("Contract Address:", contract);
    console.log("Network:", hre.network.name);
    
    const minBet = await luckyNumber.MIN_BET();
    const maxBet = await luckyNumber.MAX_BET();
    const stats = await luckyNumber.getStats();
    
    console.log("\n⚙️  Settings:");
    console.log("Min Bet:", hre.ethers.formatEther(minBet), "ETH");
    console.log("Max Bet:", hre.ethers.formatEther(maxBet), "ETH");
    
    console.log("\n📈 Statistics:");
    console.log("Total Games:", stats[0].toString());
    console.log("Prize Pool:", hre.ethers.formatEther(stats[1]), "ETH");
    console.log("Total Volume:", hre.ethers.formatEther(stats[2]), "ETH");
    console.log("Contract Balance:", hre.ethers.formatEther(stats[3]), "ETH");
  });

task("luckynumber:fund", "Fund the contract for payouts")
  .addParam("contract", "The contract address")
  .addParam("amount", "Amount in ETH to fund")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract, amount } = taskArguments;
    const [deployer] = await hre.ethers.getSigners();
    
    const fundingAmount = hre.ethers.parseEther(amount);
    console.log(`\n💸 Funding contract with ${amount} ETH...`);
    console.log("From:", deployer.address);
    console.log("To:", contract);
    
    const tx = await deployer.sendTransaction({
      to: contract,
      value: fundingAmount,
    });
    
    await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Tx Hash:", tx.hash);
    
    const balance = await hre.ethers.provider.getBalance(contract);
    console.log("New Contract Balance:", hre.ethers.formatEther(balance), "ETH");
  });
