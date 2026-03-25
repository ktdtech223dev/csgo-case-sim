import { io } from 'socket.io-client';
import useGameStore from '../store/gameStore';

let socket = null;

export function initSocket() {
  if (socket) return socket;

  socket = io('/', { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('crash_state', (data) => {
    useGameStore.getState().setCrashState(data);
  });

  socket.on('crash_tick', (data) => {
    useGameStore.setState(state => ({
      crashState: { ...state.crashState, multiplier: data.multiplier },
    }));
  });

  socket.on('crash_bet', (data) => {
    useGameStore.setState(state => ({
      crashState: {
        ...state.crashState,
        bets: [...(state.crashState.bets || []), { playerId: data.playerId, amount: data.amount }],
      },
    }));
  });

  socket.on('crash_cashout', (data) => {
    useGameStore.setState(state => ({
      crashState: {
        ...state.crashState,
        bets: (state.crashState.bets || []).map(b =>
          b.playerId === data.playerId ? { ...b, cashedOut: true, cashoutMult: data.multiplier } : b
        ),
      },
    }));
  });

  socket.on('roulette_state', (data) => {
    useGameStore.getState().setRouletteState(data);
  });

  socket.on('roulette_bet', (data) => {
    useGameStore.setState(state => ({
      rouletteState: {
        ...state.rouletteState,
        bets: [...(state.rouletteState.bets || []), data],
      },
    }));
  });

  socket.on('roulette_result', (data) => {
    useGameStore.setState(state => ({
      rouletteState: { ...state.rouletteState, phase: 'result', result: data.result },
    }));

    // Check for green wins for NGame wall
    const { activePlayerId, activePlayer, postToWall, submitSession, unlockAchievement } = useGameStore.getState();
    if (data.result.color === 'green') {
      const myPayout = data.payouts.find(p => p.playerId === activePlayerId && p.profitLoss > 0);
      if (myPayout) {
        postToWall(`🟢 ${activePlayer.name} hit GREEN on Roulette and won $${myPayout.payout.toFixed(2)}!`);
        unlockAchievement('roulette_green');
      }
    }

    // Submit sessions for all bets by this player
    for (const p of data.payouts) {
      if (p.playerId === activePlayerId) {
        submitSession({
          score: Math.round(p.profitLoss * 100),
          outcome: p.profitLoss >= 0 ? 'win' : 'bust',
          game_mode: 'roulette',
          data: { wager: p.amount, bet_type: p.betType, result: data.result.color, profit_loss: p.profitLoss },
        });
      }
    }

    // Refresh player data
    useGameStore.getState().fetchPlayers();
  });

  return socket;
}

export function getSocket() {
  return socket;
}
