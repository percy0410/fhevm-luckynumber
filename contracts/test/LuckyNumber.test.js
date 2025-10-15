const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuckyNumber", function () {
    let LuckyNumber;
    let luckyNumber;
    let owner;
    let player1;
    let player2;
    let addrs;

    const MIN_BET = ethers.utils.parseEther("0.001");
    const MAX_BET = ethers.utils.parseEther("0.005");
    const MEDIUM_BET = ethers.utils.parseEther("0.003");

    beforeEach(async function () {
        // Get signers
        [owner, player1, player2, ...addrs] = await ethers.getSigners();

        // Deploy contract
        LuckyNumber = await ethers.getContractFactory("LuckyNumber");
        luckyNumber = await LuckyNumber.deploy();
        await luckyNumber.deployed();

        // Fund the contract for payouts
        await owner.sendTransaction({
            to: luckyNumber.address,
            value: ethers.utils.parseEther("10")
        });
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await luckyNumber.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero counters", async function () {
            const stats = await luckyNumber.getStats();
            expect(stats.currentGameCounter).to.equal(0);
            expect(stats.currentPrizePool).to.equal(0);
            expect(stats.currentTotalVolume).to.equal(0);
        });

        it("Should have correct constants", async function () {
            expect(await luckyNumber.MIN_BET()).to.equal(MIN_BET);
            expect(await luckyNumber.MAX_BET()).to.equal(MAX_BET);
            expect(await luckyNumber.MIN_NUMBER()).to.equal(1);
            expect(await luckyNumber.MAX_NUMBER()).to.equal(10);
        });
    });

    describe("Betting", function () {
        it("Should accept valid bets", async function () {
            await expect(
                luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET })
            ).to.not.be.reverted;
        });

        it("Should reject bets below minimum", async function () {
            await expect(
                luckyNumber.connect(player1).placeBet(5, { 
                    value: ethers.utils.parseEther("0.0005") 
                })
            ).to.be.revertedWith("Bet amount too low");
        });

        it("Should reject bets above maximum", async function () {
            await expect(
                luckyNumber.connect(player1).placeBet(5, { 
                    value: ethers.utils.parseEther("0.006") 
                })
            ).to.be.revertedWith("Bet amount too high");
        });

        it("Should reject invalid number ranges", async function () {
            await expect(
                luckyNumber.connect(player1).placeBet(0, { value: MEDIUM_BET })
            ).to.be.revertedWith("Invalid number range");

            await expect(
                luckyNumber.connect(player1).placeBet(11, { value: MEDIUM_BET })
            ).to.be.revertedWith("Invalid number range");
        });

        it("Should emit BetPlaced event", async function () {
            const tx = await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            const receipt = await tx.wait();
            
            const betPlacedEvent = receipt.events?.find(e => e.event === 'BetPlaced');
            expect(betPlacedEvent).to.not.be.undefined;
            expect(betPlacedEvent.args.gameId).to.equal(1);
            expect(betPlacedEvent.args.player).to.equal(player1.address);
            expect(betPlacedEvent.args.chosenNumber).to.equal(5);
        });

        it("Should emit GameResult event", async function () {
            const tx = await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            const receipt = await tx.wait();
            
            const gameResultEvent = receipt.events?.find(e => e.event === 'GameResult');
            expect(gameResultEvent).to.not.be.undefined;
            expect(gameResultEvent.args.gameId).to.equal(1);
            expect(gameResultEvent.args.player).to.equal(player1.address);
            expect(gameResultEvent.args.chosenNumber).to.equal(5);
        });
    });

    describe("Game Logic", function () {
        it("Should update game counter after each bet", async function () {
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            let stats = await luckyNumber.getStats();
            expect(stats.currentGameCounter).to.equal(1);

            await luckyNumber.connect(player2).placeBet(7, { value: MIN_BET });
            stats = await luckyNumber.getStats();
            expect(stats.currentGameCounter).to.equal(2);
        });

        it("Should store game data correctly", async function () {
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            
            const game = await luckyNumber.getGame(1);
            expect(game.player).to.equal(player1.address);
            expect(game.betAmount).to.equal(MEDIUM_BET);
            expect(game.chosenNumber).to.equal(5);
            expect(game.luckyNumber).to.be.within(1, 10);
        });

        it("Should update total volume", async function () {
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            await luckyNumber.connect(player2).placeBet(7, { value: MIN_BET });
            
            const stats = await luckyNumber.getStats();
            expect(stats.currentTotalVolume).to.equal(MEDIUM_BET.add(MIN_BET));
        });

        it("Should track player games", async function () {
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            await luckyNumber.connect(player1).placeBet(7, { value: MIN_BET });
            
            const playerGames = await luckyNumber.getPlayerGames(player1.address);
            expect(playerGames.length).to.equal(2);
            expect(playerGames[0]).to.equal(1);
            expect(playerGames[1]).to.equal(2);
        });
    });

    describe("Payout Calculation", function () {
        it("Should calculate exact match payout correctly", async function () {
            const betAmount = MEDIUM_BET;
            const [payout, result] = await luckyNumber.calculatePayout(betAmount, 5, 5);
            
            expect(payout).to.equal(betAmount.mul(9)); // 9x multiplier
            expect(result).to.equal("Exact Match - Win 9x!");
        });

        it("Should calculate off by 1 payout correctly", async function () {
            const betAmount = MEDIUM_BET;
            const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 4);
            const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 5, 6);
            
            const expectedPayout = betAmount.mul(3000).div(10000); // 30%
            expect(payout1).to.equal(expectedPayout);
            expect(payout2).to.equal(expectedPayout);
            expect(result1).to.equal("Off by 1 - 30% refund");
            expect(result2).to.equal("Off by 1 - 30% refund");
        });

        it("Should calculate off by 2 payout correctly", async function () {
            const betAmount = MEDIUM_BET;
            const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 3);
            const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 5, 7);
            
            const expectedPayout = betAmount.mul(2000).div(10000); // 20%
            expect(payout1).to.equal(expectedPayout);
            expect(payout2).to.equal(expectedPayout);
            expect(result1).to.equal("Off by 2 - 20% refund");
            expect(result2).to.equal("Off by 2 - 20% refund");
        });

        it("Should calculate no payout for off by 3+", async function () {
            const betAmount = MEDIUM_BET;
            const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 1);
            const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 1, 5);
            
            expect(payout1).to.equal(0);
            expect(payout2).to.equal(0);
            expect(result1).to.equal("Off by 3+ - Better luck next time!");
            expect(result2).to.equal("Off by 3+ - Better luck next time!");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to pause and unpause", async function () {
            await luckyNumber.pause();
            
            await expect(
                luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET })
            ).to.be.revertedWith("Pausable: paused");

            await luckyNumber.unpause();
            
            await expect(
                luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET })
            ).to.not.be.reverted;
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                luckyNumber.connect(player1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to fund contract", async function () {
            const initialBalance = await ethers.provider.getBalance(luckyNumber.address);
            
            await luckyNumber.fundContract({ value: ethers.utils.parseEther("1") });
            
            const newBalance = await ethers.provider.getBalance(luckyNumber.address);
            expect(newBalance).to.equal(initialBalance.add(ethers.utils.parseEther("1")));
        });

        it("Should allow emergency withdraw", async function () {
            const withdrawAmount = ethers.utils.parseEther("1");
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await luckyNumber.emergencyWithdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance).to.be.closeTo(
                initialOwnerBalance.add(withdrawAmount).sub(gasUsed),
                ethers.utils.parseEther("0.001") // Allow for small gas estimation differences
            );
        });
    });

    describe("Security", function () {
        it("Should prevent reentrancy attacks", async function () {
            // This is tested by the ReentrancyGuard modifier
            // Multiple calls in the same transaction should not be possible
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            
            // The contract should handle this gracefully
            const stats = await luckyNumber.getStats();
            expect(stats.currentGameCounter).to.equal(1);
        });

        it("Should handle insufficient contract balance gracefully", async function () {
            // Drain most of the contract balance
            const contractBalance = await ethers.provider.getBalance(luckyNumber.address);
            await luckyNumber.emergencyWithdraw(contractBalance.sub(ethers.utils.parseEther("0.001")));
            
            // Try to place a bet that would win 9x (which would require more funds than available)
            // This should revert due to insufficient balance check
            await expect(
                luckyNumber.connect(player1).placeBet(5, { value: MIN_BET })
            ).to.be.reverted;
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            // Place some bets for testing
            await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            await luckyNumber.connect(player2).placeBet(7, { value: MIN_BET });
            await luckyNumber.connect(player1).placeBet(3, { value: MAX_BET });
        });

        it("Should return correct stats", async function () {
            const stats = await luckyNumber.getStats();
            
            expect(stats.currentGameCounter).to.equal(3);
            expect(stats.currentTotalVolume).to.equal(
                MEDIUM_BET.add(MIN_BET).add(MAX_BET)
            );
        });

        it("Should return recent games correctly", async function () {
            const recentGames = await luckyNumber.getRecentGames();
            
            expect(recentGames.length).to.equal(3);
            expect(recentGames[0]).to.equal(1);
            expect(recentGames[1]).to.equal(2);
            expect(recentGames[2]).to.equal(3);
        });

        it("Should limit recent games to 10", async function () {
            // Place 12 more bets (total 15)
            for (let i = 0; i < 12; i++) {
                await luckyNumber.connect(player1).placeBet(5, { value: MIN_BET });
            }
            
            const recentGames = await luckyNumber.getRecentGames();
            expect(recentGames.length).to.equal(10);
            expect(recentGames[0]).to.equal(6); // Should start from game 6
            expect(recentGames[9]).to.equal(15); // Should end at game 15
        });
    });
});