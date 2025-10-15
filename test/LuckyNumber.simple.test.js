const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuckyNumber", function () {
    let luckyNumber;
    let owner;
    let player1;

    beforeEach(async function () {
        // Get signers
        [owner, player1] = await ethers.getSigners();

        // Deploy contract
        const LuckyNumber = await ethers.getContractFactory("LuckyNumber");
        luckyNumber = await LuckyNumber.deploy();
        
        // Fund the contract for payouts
        await owner.sendTransaction({
            to: luckyNumber.target,
            value: ethers.parseEther("1")
        });
    });

    it("Should deploy successfully", async function () {
        expect(luckyNumber.target).to.be.properAddress;
    });

    it("Should have correct constants", async function () {
        expect(await luckyNumber.MIN_BET()).to.equal(ethers.parseEther("0.001"));
        expect(await luckyNumber.MAX_BET()).to.equal(ethers.parseEther("0.005"));
        expect(await luckyNumber.MIN_NUMBER()).to.equal(1);
        expect(await luckyNumber.MAX_NUMBER()).to.equal(10);
    });

    it("Should accept valid bets", async function () {
        const betAmount = ethers.parseEther("0.003");
        await expect(
            luckyNumber.connect(player1).placeBet(5, { value: betAmount })
        ).to.not.be.reverted;

        // Check that game counter increased
        const stats = await luckyNumber.getStats();
        expect(stats.currentGameCounter).to.equal(1);
    });

    it("Should reject invalid bet amounts", async function () {
        // Too low
        await expect(
            luckyNumber.connect(player1).placeBet(5, { value: ethers.parseEther("0.0005") })
        ).to.be.revertedWith("Bet amount too low");

        // Too high
        await expect(
            luckyNumber.connect(player1).placeBet(5, { value: ethers.parseEther("0.006") })
        ).to.be.revertedWith("Bet amount too high");
    });

    it("Should reject invalid numbers", async function () {
        const betAmount = ethers.parseEther("0.003");

        await expect(
            luckyNumber.connect(player1).placeBet(0, { value: betAmount })
        ).to.be.revertedWith("Invalid number range");

        await expect(
            luckyNumber.connect(player1).placeBet(11, { value: betAmount })
        ).to.be.revertedWith("Invalid number range");
    });

    it("Should calculate payouts correctly", async function () {
        const betAmount = ethers.parseEther("0.003");
        
        // Test exact match (should win 9x)
        const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 5);
        expect(payout1).to.equal(betAmount * BigInt(9));
        expect(result1).to.equal("Exact Match - Win 9x!");
        
        // Test off by 1 (should get 30% refund)
        const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 5, 4);
        expect(payout2).to.equal(betAmount * BigInt(3000) / BigInt(10000));
        expect(result2).to.equal("Off by 1 - 30% refund");
        
        // Test off by 2 (should get 20% refund)
        const [payout3, result3] = await luckyNumber.calculatePayout(betAmount, 5, 3);
        expect(payout3).to.equal(betAmount * BigInt(2000) / BigInt(10000));
        expect(result3).to.equal("Off by 2 - 20% refund");
        
        // Test off by 3+ (should get nothing)
        const [payout4, result4] = await luckyNumber.calculatePayout(betAmount, 5, 1);
        expect(payout4).to.equal(0);
        expect(result4).to.equal("Off by 3+ - Better luck next time!");
    });

    it("Should track withdrawable balances correctly", async function () {
        const betAmount = ethers.parseEther("0.003");
        
        // Check initial withdrawable balance
        let withdrawableBalance = await luckyNumber.getWithdrawableBalance(player1.address);
        expect(withdrawableBalance).to.equal(0);
        
        // Place a bet (this might win or lose, but we can check the balance change)
        await luckyNumber.connect(player1).placeBet(5, { value: betAmount });
        
        // Check if withdrawable balance increased (if player won)
        withdrawableBalance = await luckyNumber.getWithdrawableBalance(player1.address);
        
        // If there's a balance, test withdrawal
        if (withdrawableBalance > 0) {
            const initialEthBalance = await ethers.provider.getBalance(player1.address);
            
            const tx = await luckyNumber.connect(player1).withdraw();
            const receipt = await tx.wait();
            
            // Check that withdrawable balance is now 0
            const newWithdrawableBalance = await luckyNumber.getWithdrawableBalance(player1.address);
            expect(newWithdrawableBalance).to.equal(0);
            
            // Check that ETH balance increased (minus gas fees)
            const finalEthBalance = await ethers.provider.getBalance(player1.address);
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            expect(finalEthBalance).to.be.above(initialEthBalance - gasUsed);
        }
    });

    it("Should allow partial withdrawals", async function () {
        // First, ensure player has some withdrawable balance by placing bets
        const betAmount = ethers.parseEther("0.003");
        
        // Place multiple bets to increase chances of winning
        for (let i = 0; i < 3; i++) {
            await luckyNumber.connect(player1).placeBet(5, { value: betAmount });
        }
        
        const withdrawableBalance = await luckyNumber.getWithdrawableBalance(player1.address);
        
        if (withdrawableBalance > 0) {
            const partialAmount = withdrawableBalance / BigInt(2); // Withdraw half
            
            await luckyNumber.connect(player1).withdrawAmount(partialAmount);
            
            // Check remaining balance
            const remainingBalance = await luckyNumber.getWithdrawableBalance(player1.address);
            expect(remainingBalance).to.equal(withdrawableBalance - partialAmount);
        }
    });

    it("Should prevent withdrawal when no balance", async function () {
        await expect(
            luckyNumber.connect(player1).withdraw()
        ).to.be.revertedWith("No balance to withdraw");
    });

    it("Should prevent withdrawal of more than available balance", async function () {
        const excessiveAmount = ethers.parseEther("1"); // 1 ETH
        
        await expect(
            luckyNumber.connect(player1).withdrawAmount(excessiveAmount)
        ).to.be.revertedWith("Insufficient balance");
    });
});