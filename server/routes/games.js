const express = require('express');
const { getDb } = require('../db/database');
const { generateServerSeed, generateClientSeed, fairRandom, generateCrashPoint, hashSeed } = require('../services/rng');

module.exports = function(io) {
  const router = express.Router();

  // ======== COINFLIP ========
  router.post('/coinflip', (req, res) => {
    const db = getDb();
    const { playerId, wager, side } = req.body; // side: 'ct' or 't'

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.wallet < wager) return res.status(400).json({ error: 'Insufficient funds' });
    if (wager <= 0) return res.status(400).json({ error: 'Invalid wager' });

    // Deduct wager
    db.prepare('UPDATE players SET wallet = wallet - ? WHERE id = ?').run(wager, playerId);

    // Provably fair flip
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const result = fairRandom(serverSeed, clientSeed, 0);
    const winSide = result < 0.5 ? 'ct' : 't';
    const won = side === winSide;
    const profitLoss = won ? wager : -wager;

    if (won) {
      db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
        .run(wager * 2, wager, playerId);
    }

    db.prepare('INSERT INTO game_history (game_type, player_id, wager, result, profit_loss) VALUES (?, ?, ?, ?, ?)')
      .run('coinflip', playerId, wager, won ? 'win' : 'loss', profitLoss);

    db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
      .run(playerId, 'coinflip', profitLoss, `Coinflip ${won ? 'won' : 'lost'} $${wager}`);

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

    res.json({
      won,
      winSide,
      playerSide: side,
      wager,
      profitLoss,
      player: updatedPlayer,
      provablyFair: { serverSeed, clientSeed, hash: hashSeed(serverSeed) },
    });
  });

  // ======== CRASH ========
  let crashState = {
    phase: 'betting', // 'betting', 'running', 'crashed'
    bets: [],
    multiplier: 1.00,
    crashPoint: 0,
    serverSeed: null,
    clientSeed: null,
    timer: null,
    startTime: null,
  };

  function startCrashRound() {
    crashState.phase = 'betting';
    crashState.bets = [];
    crashState.multiplier = 1.00;
    crashState.serverSeed = generateServerSeed();
    crashState.clientSeed = generateClientSeed();
    crashState.crashPoint = generateCrashPoint(crashState.serverSeed, crashState.clientSeed);

    io.emit('crash_state', { phase: 'betting', countdown: 10 });

    // 10 second betting window
    setTimeout(() => {
      crashState.phase = 'running';
      crashState.startTime = Date.now();
      io.emit('crash_state', { phase: 'running' });

      // Update multiplier every 50ms
      crashState.timer = setInterval(() => {
        const elapsed = (Date.now() - crashState.startTime) / 1000;
        crashState.multiplier = Math.pow(Math.E, 0.06 * elapsed);
        crashState.multiplier = Math.round(crashState.multiplier * 100) / 100;

        if (crashState.multiplier >= crashState.crashPoint) {
          // CRASH!
          clearInterval(crashState.timer);
          crashState.phase = 'crashed';
          crashState.multiplier = crashState.crashPoint;

          // Process busted bets
          const db = getDb();
          for (const bet of crashState.bets) {
            if (!bet.cashedOut) {
              db.prepare('INSERT INTO game_history (game_type, player_id, wager, result, profit_loss) VALUES (?, ?, ?, ?, ?)')
                .run('crash', bet.playerId, bet.amount, 'bust', -bet.amount);
              db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
                .run(bet.playerId, 'crash', -bet.amount, `Crash busted at ${crashState.crashPoint}x`);
            }
          }

          io.emit('crash_state', {
            phase: 'crashed',
            crashPoint: crashState.crashPoint,
            bets: crashState.bets.map(b => ({ playerId: b.playerId, amount: b.amount, cashedOut: b.cashedOut, cashoutMult: b.cashoutMult })),
            provablyFair: { serverSeed: crashState.serverSeed, clientSeed: crashState.clientSeed },
          });

          // Start new round after 5 seconds
          setTimeout(startCrashRound, 5000);
        } else {
          io.emit('crash_tick', { multiplier: crashState.multiplier });
        }
      }, 50);
    }, 10000);
  }

  // Auto-start crash rounds
  startCrashRound();

  router.post('/crash/bet', (req, res) => {
    const db = getDb();
    const { playerId, amount } = req.body;

    if (crashState.phase !== 'betting') return res.status(400).json({ error: 'Betting is closed' });

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.wallet < amount) return res.status(400).json({ error: 'Insufficient funds' });
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Check if already bet
    if (crashState.bets.find(b => b.playerId === playerId)) {
      return res.status(400).json({ error: 'Already placed a bet' });
    }

    db.prepare('UPDATE players SET wallet = wallet - ? WHERE id = ?').run(amount, playerId);
    crashState.bets.push({ playerId, amount, cashedOut: false, cashoutMult: 0 });

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    io.emit('crash_bet', { playerId, amount });
    res.json({ success: true, player: updatedPlayer });
  });

  router.post('/crash/cashout', (req, res) => {
    const db = getDb();
    const { playerId } = req.body;

    if (crashState.phase !== 'running') return res.status(400).json({ error: 'Game not running' });

    const bet = crashState.bets.find(b => b.playerId === playerId && !b.cashedOut);
    if (!bet) return res.status(400).json({ error: 'No active bet' });

    bet.cashedOut = true;
    bet.cashoutMult = crashState.multiplier;
    const payout = Math.round(bet.amount * crashState.multiplier * 100) / 100;
    const profitLoss = payout - bet.amount;

    db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
      .run(payout, profitLoss > 0 ? profitLoss : 0, playerId);

    db.prepare('INSERT INTO game_history (game_type, player_id, wager, result, profit_loss) VALUES (?, ?, ?, ?, ?)')
      .run('crash', playerId, bet.amount, `cashout_${crashState.multiplier}x`, profitLoss);

    db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
      .run(playerId, 'crash', profitLoss, `Crash cashout at ${crashState.multiplier}x (+$${payout})`);

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    io.emit('crash_cashout', { playerId, multiplier: crashState.multiplier, payout });
    res.json({ success: true, multiplier: crashState.multiplier, payout, profitLoss, player: updatedPlayer });
  });

  router.get('/crash/state', (req, res) => {
    res.json({
      phase: crashState.phase,
      multiplier: crashState.multiplier,
      bets: crashState.bets.map(b => ({
        playerId: b.playerId,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutMult: b.cashoutMult,
      })),
    });
  });

  // ======== ROULETTE ========
  let rouletteState = {
    phase: 'betting', // 'betting', 'spinning', 'result'
    bets: [],
    result: null,
    timer: null,
  };

  const ROULETTE_SLOTS = [
    { number: 0, color: 'green' },
    { number: 1, color: 'red' }, { number: 2, color: 'black' },
    { number: 3, color: 'red' }, { number: 4, color: 'black' },
    { number: 5, color: 'red' }, { number: 6, color: 'black' },
    { number: 7, color: 'red' }, { number: 8, color: 'black' },
    { number: 9, color: 'red' }, { number: 10, color: 'black' },
    { number: 11, color: 'red' }, { number: 12, color: 'black' },
    { number: 13, color: 'red' }, { number: 14, color: 'black' },
  ];

  function startRouletteRound() {
    rouletteState.phase = 'betting';
    rouletteState.bets = [];
    rouletteState.result = null;

    io.emit('roulette_state', { phase: 'betting', countdown: 15 });

    setTimeout(() => {
      rouletteState.phase = 'spinning';
      const serverSeed = generateServerSeed();
      const clientSeed = generateClientSeed();
      const roll = fairRandom(serverSeed, clientSeed, 0);
      const slotIndex = Math.floor(roll * ROULETTE_SLOTS.length);
      rouletteState.result = ROULETTE_SLOTS[slotIndex];

      io.emit('roulette_state', { phase: 'spinning', result: rouletteState.result, slotIndex });

      // Wait for spin animation (5 seconds)
      setTimeout(() => {
        rouletteState.phase = 'result';
        const db = getDb();
        const payouts = [];

        for (const bet of rouletteState.bets) {
          let multiplier = 0;
          if (bet.betType === rouletteState.result.color) {
            multiplier = rouletteState.result.color === 'green' ? 14 : 2;
          }

          const payout = bet.amount * multiplier;
          const profitLoss = payout - bet.amount;

          if (payout > 0) {
            db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
              .run(payout, profitLoss, bet.playerId);
          }

          db.prepare('INSERT INTO game_history (game_type, player_id, wager, result, profit_loss) VALUES (?, ?, ?, ?, ?)')
            .run('roulette', bet.playerId, bet.amount, `${rouletteState.result.color}_${rouletteState.result.number}`, profitLoss);

          db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
            .run(bet.playerId, 'roulette', profitLoss, `Roulette ${profitLoss >= 0 ? 'won' : 'lost'} on ${bet.betType}`);

          payouts.push({ playerId: bet.playerId, betType: bet.betType, amount: bet.amount, payout, profitLoss });
        }

        io.emit('roulette_result', {
          result: rouletteState.result,
          payouts,
          provablyFair: { serverSeed, clientSeed },
        });

        setTimeout(startRouletteRound, 5000);
      }, 5000);
    }, 15000);
  }

  startRouletteRound();

  router.post('/roulette/bet', (req, res) => {
    const db = getDb();
    const { playerId, amount, betType } = req.body; // betType: 'red', 'black', 'green'

    if (rouletteState.phase !== 'betting') return res.status(400).json({ error: 'Betting is closed' });
    if (!['red', 'black', 'green'].includes(betType)) return res.status(400).json({ error: 'Invalid bet type' });

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.wallet < amount) return res.status(400).json({ error: 'Insufficient funds' });
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.prepare('UPDATE players SET wallet = wallet - ? WHERE id = ?').run(amount, playerId);
    rouletteState.bets.push({ playerId, amount, betType });

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    io.emit('roulette_bet', { playerId, amount, betType });
    res.json({ success: true, player: updatedPlayer });
  });

  router.get('/roulette/state', (req, res) => {
    res.json({
      phase: rouletteState.phase,
      bets: rouletteState.bets.map(b => ({ playerId: b.playerId, amount: b.amount, betType: b.betType })),
      result: rouletteState.result,
    });
  });

  // ======== GAME HISTORY ========
  router.get('/history/:playerId', (req, res) => {
    const db = getDb();
    const history = db.prepare('SELECT * FROM game_history WHERE player_id = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.playerId);
    res.json(history);
  });

  return router;
};
