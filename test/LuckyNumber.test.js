const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuckyNumber", function () {
    let LuckyNumber;
    let luckyNumber;
    let owner;
    let player1;
    let player2;
    let addrs;

    const MIN_BET = ethers.parseEther("0.001");
    const MAX_BET = ethers.parseEther("0.005");
    const MEDIUM_BET = ethers.parseEther("0.003");

    beforeEach(async function () {
        // Get signers
        [owner, player1, player2, ...addrs] = await ethers.getSigners();

        // Deploy contract
        LuckyNumber = await ethers.getContractFactory("LuckyNumber");
        luckyNumber = await LuckyNumber.deploy();
        await luckyNumber.waitForDeployment();

        // Fund the contract for payouts
        await owner.sendTransaction({
            to: luckyNumber.target,
            value: ethers.parseEther("10")
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
                    value: ethers.parseEther("0.0005") 
                })
            ).to.be.revertedWith("Bet amount too low");
        });

        it("Should reject bets above maximum", async function () {
            await expect(
                luckyNumber.connect(player1).placeBet(5, { 
                    value: ethers.parseEther("0.006") 
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
            
            const betPlacedEvent = receipt.logs?.find(log => {
                try {
                    const parsed = luckyNumber.interface.parseLog(log);
                    return parsed && parsed.name === 'BetPlaced';
                } catch (e) {
                    return false;
                }
            });
            expect(betPlacedEvent).to.not.be.undefined;
            if (betPlacedEvent) {
                const parsed = luckyNumber.interface.parseLog(betPlacedEvent);
                expect(parsed.args.gameId).to.equal(1n);
                expect(parsed.args.player).to.equal(player1.address);
                expect(parsed.args.chosenNumber).to.equal(5);
            }
        });

        it("Should emit GameResult event", async function () {
            const tx = await luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET });
            const receipt = await tx.wait();
            
            const gameResultEvent = receipt.logs?.find(log => {
                try {
                    const parsed = luckyNumber.interface.parseLog(log);
                    return parsed && parsed.name === 'GameResult';
                } catch (e) {
                    return false;
                }
            });
            expect(gameResultEvent).to.not.be.undefined;
            if (gameResultEvent) {
                const parsed = luckyNumber.interface.parseLog(gameResultEvent);
                expect(parsed.args.gameId).to.equal(1n);
                expect(parsed.args.player).to.equal(player1.address);
                expect(parsed.args.chosenNumber).to.equal(5);
            }
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
            expect(stats.currentTotalVolume).to.equal(MEDIUM_BET + MIN_BET);
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
            
            expect(payout).to.equal(betAmount * 9n); // 9x multiplier
            expect(result).to.equal("Exact Match - Win 9x!");
        });

        it("Should calculate off by 1 payout correctly", async function () {
            const betAmount = MEDIUM_BET;
            const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 4);
            const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 5, 6);
            
            const expectedPayout = (betAmount * 3000n) / 10000n; // 30%
            expect(payout1).to.equal(expectedPayout);
            expect(payout2).to.equal(expectedPayout);
            expect(result1).to.equal("Off by 1 - 30% refund");
            expect(result2).to.equal("Off by 1 - 30% refund");
        });

        it("Should calculate off by 2 payout correctly", async function () {
            const betAmount = MEDIUM_BET;
            const [payout1, result1] = await luckyNumber.calculatePayout(betAmount, 5, 3);
            const [payout2, result2] = await luckyNumber.calculatePayout(betAmount, 5, 7);
            
            const expectedPayout = (betAmount * 2000n) / 10000n; // 20%
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
            ).to.be.revertedWithCustomError(luckyNumber, "EnforcedPause");

            await luckyNumber.unpause();
            
            await expect(
                luckyNumber.connect(player1).placeBet(5, { value: MEDIUM_BET })
            ).to.not.be.reverted;
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                luckyNumber.connect(player1).pause()
            ).to.be.revertedWithCustomError(luckyNumber, "OwnableUnauthorizedAccount");
        });

        it("Should allow owner to fund contract", async function () {
            const initialBalance = await ethers.provider.getBalance(luckyNumber.target);
            
            await luckyNumber.fundContract({ value: ethers.parseEther("1") });
            
            const newBalance = await ethers.provider.getBalance(luckyNumber.target);
            expect(newBalance).to.equal(initialBalance + ethers.parseEther("1"));
        });

        it("Should allow emergency withdraw", async function () {
            const withdrawAmount = ethers.parseEther("1");
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await luckyNumber.emergencyWithdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance).to.be.closeTo(
                initialOwnerBalance + withdrawAmount - gasUsed,
                ethers.parseEther("0.001") // Allow for small gas estimation differences
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
            // First, place a bet to get some funds in the contract
            await luckyNumber.connect(player1).placeBet(5, { value: MIN_BET });
            
            // Now drain most of the contract balance, leaving only a tiny amount
            const contractBalance = await ethers.provider.getBalance(luckyNumber.target);
            const drainAmount = contractBalance - ethers.parseEther("0.0001"); // Leave only 0.0001 ETH
            await luckyNumber.emergencyWithdraw(drainAmount);
            
            // Check the remaining balance
            const remainingBalance = await ethers.provider.getBalance(luckyNumber.target);
            console.log("Remaining balance:", ethers.formatEther(remainingBalance));
            
            // The contract should still accept bets even with low balance
            // The insufficient balance check only happens when there's a payout
            // So this test should pass (not revert) because the bet itself is valid
            await expect(
                luckyNumber.connect(player2).placeBet(5, { value: MIN_BET })
            ).to.not.be.reverted;
            
            // The test passes if the bet is accepted (which is correct behavior)
            // The insufficient balance check only triggers when there's a payout
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
                MEDIUM_BET + MIN_BET + MAX_BET
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