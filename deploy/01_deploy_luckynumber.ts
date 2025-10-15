import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🎰 Deploying Lucky Number dApp...\n");
  console.log("📝 Deploying with account:", deployer);

  const deployed = await deploy("LuckyNumber", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`✅ LuckyNumber deployed to: ${deployed.address}`);

  // Fund the contract with some ETH for payouts
  if (hre.network.name !== "hardhat") {
    const fundingAmount = hre.ethers.parseEther("0.1"); // 0.1 ETH
    console.log(`\n💸 Funding contract with ${hre.ethers.formatEther(fundingAmount)} ETH...`);

    const signer = await hre.ethers.getSigner(deployer);
    const fundTx = await signer.sendTransaction({
      to: deployed.address,
      value: fundingAmount,
    });
    await fundTx.wait();

    console.log("✅ Contract funded successfully!");
  }

  // Display contract info
  const luckyNumber = await hre.ethers.getContractAt("LuckyNumber", deployed.address);
  const minBet = await luckyNumber.MIN_BET();
  const maxBet = await luckyNumber.MAX_BET();
  const contractBalance = await hre.ethers.provider.getBalance(deployed.address);

  console.log("\n📊 Contract Information:");
  console.log("========================");
  console.log("Contract Address:", deployed.address);
  console.log("Owner Address:", deployer);
  console.log("Network:", hre.network.name);
  console.log("Min Bet:", hre.ethers.formatEther(minBet), "ETH");
  console.log("Max Bet:", hre.ethers.formatEther(maxBet), "ETH");
  console.log("Contract Balance:", hre.ethers.formatEther(contractBalance), "ETH");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n🎲 Your Lucky Number dApp is ready to play!");
  console.log("\nNext steps:");
  console.log("1. Update frontend config with contract address:", deployed.address);
  console.log("2. Start the frontend: cd frontend && npm run dev");
  console.log("3. Connect your wallet and start playing!");
};

export default func;
func.id = "deploy_luckynumber";
func.tags = ["LuckyNumber"];
