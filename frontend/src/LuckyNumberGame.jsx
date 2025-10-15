import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, Gamepad2, Trophy, LogOut, History, Volume2, VolumeX, AlertCircle, Loader, Download, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';
import { web3Utils } from './utils/web3.js';

export default function LuckyNumberGame() {
  // Wallet & Web3 State
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [ethBalance, setEthBalance] = useState('0');
  const [withdrawableBalance, setWithdrawableBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Game State
  const [bet, setBet] = useState(0.001); // Default minimum bet
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betLimits, setBetLimits] = useState({ min: 0.001, max: 0.005 });
  
  // Statistics
  const [contractStats, setContractStats] = useState({
    gameCounter: 0,
    prizePool: '0',
    totalVolume: '0',
    contractBalance: '0'
  });
  
  // Player Data
  const [playerGames, setPlayerGames] = useState([]);
  const [playerStats, setPlayerStats] = useState({
    gamesPlayed: 0,
    wins: 0,
    totalProfit: 0,
    winRate: 0
  });
  
  // UI State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [popupResult, setPopupResult] = useState(null);

  // Sound effects
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'win') {
        oscillator.frequency.value = 523.25;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } else if (type === 'lose') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
    } catch (error) {
      // Audio context not available
    }
  }, [soundEnabled]);

  // Connect wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletData = await web3Utils.connectWallet();
      setWalletAddress(walletData.address);
      setIsConnected(true);
      
      // Load initial data
      await Promise.all([
        loadPlayerData(walletData.address),
        loadBetLimits(),
        loadPlayerGames(walletData.address)
      ]);
      
      // Listen for game results and withdrawals
      web3Utils.onGameResult(handleGameResult);
      web3Utils.onWithdrawal(handleWithdrawal);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    web3Utils.disconnect();
    web3Utils.removeAllListeners();
    setIsConnected(false);
    setWalletAddress('');
    setEthBalance('0');
    setPlayerGames([]);
    setPlayerStats({
      gamesPlayed: 0,
      wins: 0,
      totalProfit: 0,
      winRate: 0
    });
    setResult(null);
    setSelectedNumber(null);
    setError(null);
  };

  // Load all data for a player
  const loadPlayerData = async (address) => {
    try {
      const [balance, stats, withdrawableBalance] = await Promise.all([
        web3Utils.getBalance(address),
        web3Utils.getContractStats(),
        web3Utils.getWithdrawableBalance(address)
      ]);
      
      setEthBalance(balance);
      setContractStats(stats);
      // withdrawableBalance is now plaintext ETH amount
      setWithdrawableBalance(withdrawableBalance);
    } catch (error) {
      console.error('Failed to load player data:', error);
    }
  };

  // Load bet limits
  const loadBetLimits = async () => {
    try {
      const limits = await web3Utils.getBetLimits();
      setBetLimits({
        min: parseFloat(limits.min),
        max: parseFloat(limits.max)
      });
      setBet(parseFloat(limits.min));
    } catch (error) {
      console.error('Failed to load bet limits:', error);
    }
  };

  // Handle withdrawal event
  const handleWithdrawal = useCallback((withdrawData) => {
    
    // Refresh data after withdrawal
    if (walletAddress) {
      loadPlayerData(walletAddress);
    }
    
    setIsWithdrawing(false);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
    
    // Show success message
    setResult({
      type: 'success',
      message: `💰 Successfully withdrew ${web3Utils.formatEth(withdrawData.amount)} ETH!`,
      transactionHash: withdrawData.transactionHash
    });
  }, [walletAddress]);

  // Withdraw all funds
  const withdrawAll = async () => {
    if (parseFloat(withdrawableBalance) === 0) {
      setError('No funds available to withdraw');
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    
    try {
      const tx = await web3Utils.withdraw();
      
      // Wait for confirmation
      await tx.wait();
      
    } catch (error) {
      console.error('Failed to withdraw:', error);
      setError(error.reason || error.message || 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  };

  // Withdraw specific amount
  const withdrawSpecificAmount = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amount > parseFloat(withdrawableBalance)) {
      setError('Amount exceeds available balance');
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    
    try {
      const tx = await web3Utils.withdrawAmount(amount);
      
      // Wait for confirmation
      await tx.wait();
      
    } catch (error) {
      console.error('Failed to withdraw amount:', error);
      setError(error.reason || error.message || 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  };

  const loadPlayerGames = async (address) => {
    try {
      const games = await web3Utils.getPlayerGames(address);
      setPlayerGames(games);
      
      // Calculate player statistics (simplified since numbers are encrypted)
      const gamesPlayed = games.length;
      
      // Can't calculate wins from encrypted numbers
      // Instead, count games with payout > 0
      const wins = games.filter(game => parseFloat(game.payout) > 0).length;
      
      const totalProfit = games.reduce((sum, game) => {
        const profit = parseFloat(game.payout) - parseFloat(game.betAmount);
        return sum + profit;
      }, 0);
      
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
      
      setPlayerStats({
        gamesPlayed,
        wins,
        totalProfit,
        winRate
      });
    } catch (error) {
      console.error('Failed to load player games:', error);
    }
  };

  // Handle game result from contract event
  const handleGameResult = useCallback((gameData) => {
    
    // Clear timeout if event fires (normal case)
    if (window.gameTimeoutId) {
      clearTimeout(window.gameTimeoutId);
      window.gameTimeoutId = null;
    }
    
    const difference = Math.abs(gameData.chosenNumber - gameData.luckyNumber);
    const profit = parseFloat(gameData.payout) - bet;
    
    let message = '';
    let type = '';
    
    if (difference === 0) {
      message = `🎉 Perfect! You guessed ${gameData.chosenNumber} and the lucky number was ${gameData.luckyNumber}! You won ${web3Utils.formatEth(gameData.payout)} ETH!`;
      type = 'win';
      playSound('win');
      setShowWinAnimation(true);
      setTimeout(() => setShowWinAnimation(false), 2000);
    } else if (difference === 1) {
      message = `Close! You guessed ${gameData.chosenNumber} but the lucky number was ${gameData.luckyNumber}. You get 30% back (${web3Utils.formatEth(gameData.payout)} ETH)`;
      type = 'close';
    } else if (difference === 2) {
      message = `Near! You guessed ${gameData.chosenNumber} but the lucky number was ${gameData.luckyNumber}. You get 20% back (${web3Utils.formatEth(gameData.payout)} ETH)`;
      type = 'near';
    } else {
      message = `Lost! You guessed ${gameData.chosenNumber} but the lucky number was ${gameData.luckyNumber}. Try again!`;
      type = 'loss';
      playSound('lose');
    }
    
    
    setResult({
      type,
      message,
      winNumber: gameData.luckyNumber,
      transactionHash: gameData.transactionHash
    });
    
    // Show result popup immediately
    setPopupResult({
      chosenNumber: gameData.chosenNumber,
      luckyNumber: gameData.luckyNumber,
      type,
      message,
      payout: gameData.payout,
      transactionHash: gameData.transactionHash
    });
    
    // Show result popup directly without countdown
    setShowResultPopup(true);
    
    setIsPlaying(false);
    
    // Refresh data
    if (walletAddress) {
      loadPlayerData(walletAddress);
      loadPlayerGames(walletAddress);
    }
  }, [bet, playSound, walletAddress]);

  // Play game function
  const playGame = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first!');
      return;
    }
    if (selectedNumber === null) {
      setError('Please select a number first!');
      return;
    }
    if (bet < betLimits.min || bet > betLimits.max) {
      setError(`Bet amount must be between ${betLimits.min} and ${betLimits.max} ETH`);
      return;
    }
    if (parseFloat(ethBalance) < bet) {
      setError('Insufficient ETH balance!');
      return;
    }

    setIsPlaying(true);
    setResult(null);
    setError(null);
    setShowResultPopup(false);
    setPopupResult(null);

    try {
      const tx = await web3Utils.placeBet(selectedNumber, bet);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Try to get the game result from the transaction receipt first
      try {
        const gameResultEvent = receipt.logs?.find(log => {
          try {
            const parsed = web3Utils.contract.interface.parseLog(log);
            return parsed && parsed.name === 'GameResult';
          } catch (e) {
            return false;
          }
        });
        
        if (gameResultEvent) {
          const parsed = web3Utils.contract.interface.parseLog(gameResultEvent);
          const gameData = {
            gameId: Number(parsed.args.gameId),
            player: parsed.args.player,
            chosenNumber: Number(parsed.args.chosenNumber),
            luckyNumber: Number(parsed.args.luckyNumber),
            payout: ethers.formatEther(parsed.args.payout),
            result: parsed.args.result,
            transactionHash: receipt.transactionHash
          };
          
          // Process the result immediately
          handleGameResult(gameData);
          return;
        }
      } catch (error) {
        console.error('Error parsing transaction receipt:', error);
      }
      
      // If no event found in receipt, wait for contract event
      // Fallback timeout - if no event fires within 5 seconds, process manually
      window.gameTimeoutId = setTimeout(() => {
        setIsPlaying(false);
        setError('Game completed but no result received. Please check your transaction.');
      }, 5000);
      
    } catch (error) {
      console.error('Failed to play game:', error);
      setError(error.reason || error.message || 'Transaction failed');
      setIsPlaying(false);
    }
  };

  // Auto-refresh data periodically
  useEffect(() => {
    if (isConnected && walletAddress) {
      const interval = setInterval(() => {
        loadPlayerData(walletAddress);
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, walletAddress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 p-8">
      {showWinAnimation && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="text-9xl animate-bounce">🎉</div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-5xl font-bold text-gray-900 drop-shadow-lg transform -skew-y-3">
            LUCKY NUMBER 🎲
          </h1>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="bg-gray-900/20 hover:bg-gray-900/30 text-gray-900 p-2 rounded-xl transition-all"
                  title={soundEnabled ? "Mute" : "Unmute"}
                >
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-gray-900/20 hover:bg-gray-900/30 text-gray-900 p-2 rounded-xl transition-all"
                  title="History"
                >
                  <History size={20} />
                </button>
                <div className="bg-gray-900/20 backdrop-blur-lg rounded-xl px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-900 font-mono text-sm font-bold">
                    {web3Utils.formatAddress(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-red-600/30 hover:bg-red-600/40 text-gray-900 p-2 rounded-xl transition-all"
                  title="Disconnect Wallet"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-xl disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Wallet size={20} />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>


        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-xl flex items-center gap-2 text-red-900">
            <AlertCircle size={20} />
            <span className="font-semibold">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-900 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="text-white" size={24} />
                </div>
                <div className="text-white text-sm font-medium mb-1">ETH Balance</div>
                <div className="text-white text-2xl font-bold">
                  {isConnected ? web3Utils.formatEth(ethBalance, 4) : '0.0000'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div className="text-white text-sm font-medium mb-1">Profit</div>
                <div className={`text-2xl font-bold ${playerStats.totalProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {isConnected ? 
                    (playerStats.totalProfit >= 0 ? '+' : '-') + web3Utils.formatEth(Math.abs(playerStats.totalProfit)) 
                    : '0.0000'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <Gamepad2 className="text-white" size={24} />
                </div>
                <div className="text-white text-sm font-medium mb-1">Games Played</div>
                <div className="text-white text-2xl font-bold">{playerStats.gamesPlayed}</div>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="text-white" size={24} />
                </div>
                <div className="text-white text-sm font-medium mb-1">Win Rate</div>
                <div className="text-white text-2xl font-bold">{playerStats.winRate.toFixed(1)}%</div>
              </div>

              {/* Withdrawable Balance Card */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="text-white" size={24} />
                </div>
                <div className="text-white text-sm font-medium mb-1">Available</div>
                <div className="text-white text-2xl font-bold">
                  {isConnected ? web3Utils.formatEth(withdrawableBalance, 4) : '0.0000'}
                </div>
                {isConnected && parseFloat(withdrawableBalance) > 0 && (
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="mt-2 bg-white/20 hover:bg-white/30 text-white text-xs py-1 px-2 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Download size={12} /> Withdraw
                  </button>
                )}
              </div>

            </div>

            {/* Game Interface */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
              <div className="mb-6">
                <label className="text-gray-900 text-lg font-semibold mb-3 block">
                  Bet Amount: {bet} ETH
                </label>
                <input
                  type="range"
                  min={betLimits.min}
                  max={betLimits.max}
                  step="0.0001"
                  value={bet}
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="w-full h-3 bg-gray-900/20 rounded-lg cursor-pointer"
                  disabled={isPlaying || !isConnected}
                />
                <div className="flex justify-between text-gray-900/60 text-sm mt-1">
                  <span>Min: {betLimits.min} ETH</span>
                  <span>Max: {betLimits.max} ETH</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-gray-900 text-lg font-semibold mb-3 block">
                  Choose Your Number (1-10):
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedNumber(num)}
                      disabled={isPlaying || !isConnected}
                      className={`h-16 rounded-xl font-bold text-xl transition-all transform hover:scale-105 ${
                        selectedNumber === num
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg scale-105'
                          : 'bg-gray-900/20 text-gray-900 hover:bg-gray-900/30'
                      } ${(isPlaying || !isConnected) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={playGame}
                disabled={isPlaying || selectedNumber === null || !isConnected}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-105 ${
                  isPlaying || !isConnected
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                } text-white shadow-xl flex items-center justify-center gap-2`}
              >
                {isPlaying ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Generating Lucky Number...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Play'
                ) : (
                  'Play Game'
                )}
              </button>

              {/* Lucky Number Generation Indicator */}
              {isPlaying && (
                <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500 rounded-xl text-center">
                  <div className="text-blue-900 font-semibold mb-2">🎲 Generating Lucky Number...</div>
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div
                        key={num}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          Math.random() > 0.5 
                            ? 'bg-blue-600 text-white animate-pulse' 
                            : 'bg-blue-200 text-blue-800'
                        }`}
                        style={{
                          animationDelay: `${num * 100}ms`,
                          animation: 'pulse 1s infinite'
                        }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  <div className="text-blue-700 text-sm mt-2">Please wait while we generate your lucky number...</div>
                </div>
              )}


              {/* Result */}
              {result && (
         <div
           className={`mt-6 p-6 rounded-xl font-semibold text-center text-lg ${
             result.type === 'win'
               ? 'bg-green-500/20 text-green-900 border-2 border-green-600'
               : result.type === 'close' || result.type === 'near'
               ? 'bg-orange-500/20 text-orange-900 border-2 border-orange-600'
               : result.type === 'loss'
               ? 'bg-red-500/20 text-red-900 border-2 border-red-600'
               : 'bg-blue-500/20 text-blue-900 border-2 border-blue-600'
           }`}
         >
                  {/* Lucky Number Display */}
                  {result.winNumber && result.type !== 'processing' && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">🎲 Lucky Number:</div>
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-3xl font-bold ${
                        result.type === 'win'
                          ? 'bg-green-600 text-white animate-pulse'
                          : result.type === 'close' || result.type === 'near'
                          ? 'bg-orange-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {result.winNumber}
                      </div>
                    </div>
                  )}

                  
                  {result.message}
                </div>
              )}

              <div className="mt-6 text-gray-900/70 text-sm text-center font-semibold">
                <p>💰 Exact match: Win 9x your bet</p>
                <p>📍 Off by 1: Get 30% refund</p>
                <p>📍 Off by 2: Get 20% refund</p>
                <p>😢 Off by 3+: Bet goes to prize pool</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {isConnected ? (
              <>
                {/* Contract Stats */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🏆 Game Stats
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-900/80">Total Games:</span>
                      <span className="font-bold text-gray-900">{contractStats.gameCounter}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900/80">Prize Pool:</span>
                      <span className="font-bold text-gray-900">{web3Utils.formatEth(contractStats.prizePool)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900/80">Total Volume:</span>
                      <span className="font-bold text-gray-900">{web3Utils.formatEth(contractStats.totalVolume)} ETH</span>
                    </div>
                  </div>
                </div>

                {/* Game History */}
                {showHistory && playerGames.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <History /> Recent Games
                    </h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {playerGames.slice(0, 10).map((game, idx) => {
                        const profit = parseFloat(game.payout) - parseFloat(game.betAmount);
                        return (
                          <div key={game.id} className="bg-gray-900/10 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-900/60 text-xs">
                                {game.timestamp.toLocaleTimeString()}
                              </span>
                              <span className={`text-sm font-bold ${
                                profit > 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {profit > 0 ? '+' : ''}{web3Utils.formatEth(Math.abs(profit))}
                              </span>
                            </div>
                            <div className="text-gray-900 text-sm mt-1">
                              {typeof game.chosenNumber === 'string' && game.chosenNumber === 'encrypted' ? (
                                <span className="text-gray-600 italic">🔒 Encrypted game data</span>
                              ) : (
                                `Guessed ${game.chosenNumber} → Was ${game.luckyNumber}`
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl text-center">
                <Wallet className="text-gray-900 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Connect to Play</h3>
                <p className="text-gray-900/70 text-sm mb-4">
                  Connect your MetaMask wallet to Sepolia testnet and start playing!
                </p>
                <div className="text-gray-900/60 text-xs">
                  <p>• Make sure you're on Sepolia testnet</p>
                  <p>• Get test ETH from a faucet if needed</p>
                  <p>• Minimum bet: 0.001 ETH</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="text-purple-600" /> Withdraw Funds
            </h2>
            
            <div className="mb-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="text-purple-900 text-sm font-medium mb-1">Available Balance</div>
                <div className="text-purple-900 text-2xl font-bold">
                  {web3Utils.formatEth(withdrawableBalance, 4)} ETH
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={withdrawAll}
                  disabled={isWithdrawing || parseFloat(withdrawableBalance) === 0}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Withdraw All ({web3Utils.formatEth(withdrawableBalance, 4)} ETH)
                    </>
                  )}
                </button>
                
                <div className="text-center text-gray-500 text-sm">or</div>
                
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium text-sm">Withdraw Specific Amount:</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={withdrawableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount in ETH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isWithdrawing}
                  />
                  <button
                    onClick={withdrawSpecificAmount}
                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Withdraw Amount
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setError(null);
                }}
                disabled={isWithdrawing}
                className="flex-1 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            
          </div>
        </div>
      )}


      {/* Result Popup Modal */}
      {showResultPopup && popupResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎲</div>
              <h2 className="text-2xl font-bold text-gray-900">Game Result!</h2>
            </div>

            {/* Numbers Comparison */}
            <div className="flex justify-center items-center space-x-8 mb-6">
              {/* Your Number */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 mb-2">Your Number</div>
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {popupResult.chosenNumber}
                </div>
              </div>

              {/* VS */}
              <div className="text-2xl font-bold text-gray-400">VS</div>

              {/* Lucky Number */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 mb-2">Lucky Number</div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                  popupResult.type === 'win'
                    ? 'bg-green-600'
                    : popupResult.type === 'close' || popupResult.type === 'near'
                    ? 'bg-orange-600'
                    : 'bg-red-600'
                }`}>
                  {popupResult.luckyNumber}
                </div>
              </div>
            </div>

            {/* Result Message */}
            <div className={`text-center p-4 rounded-xl mb-6 ${
              popupResult.type === 'win'
                ? 'bg-green-100 text-green-900'
                : popupResult.type === 'close' || popupResult.type === 'near'
                ? 'bg-orange-100 text-orange-900'
                : 'bg-red-100 text-red-900'
            }`}>
              <div className="text-lg font-semibold mb-2">
                {popupResult.type === 'win' && '🎉 JACKPOT! 🎉'}
                {popupResult.type === 'close' && '😊 Close Call!'}
                {popupResult.type === 'near' && '🤏 Almost There!'}
                {popupResult.type === 'loss' && '😢 Better Luck Next Time!'}
              </div>
              <div className="text-sm">
                {popupResult.type === 'win' && `You won ${web3Utils.formatEth(popupResult.payout)} ETH!`}
                {popupResult.type === 'close' && `You get 30% back (${web3Utils.formatEth(popupResult.payout)} ETH)`}
                {popupResult.type === 'near' && `You get 20% back (${web3Utils.formatEth(popupResult.payout)} ETH)`}
                {popupResult.type === 'loss' && 'Your bet goes to the prize pool'}
              </div>
            </div>


            {/* Close Button */}
            <button
              onClick={() => {
                setShowResultPopup(false);
                setPopupResult(null);
              }}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                popupResult.type === 'win'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : popupResult.type === 'close' || popupResult.type === 'near'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {popupResult.type === 'win' ? '🎉 Play Again!' : 'Continue Playing'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}