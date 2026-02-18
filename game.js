'use strict';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = new Set(['♥','♦']);

const LEVELS = [
  { level: 1,  xp: 0,    rank: 'Rookie'  },
  { level: 2,  xp: 100,  rank: 'Rookie'  },
  { level: 3,  xp: 250,  rank: 'Amateur' },
  { level: 4,  xp: 450,  rank: 'Amateur' },
  { level: 5,  xp: 700,  rank: 'Sharp'   },
  { level: 6,  xp: 1000, rank: 'Sharp'   },
  { level: 7,  xp: 1400, rank: 'Pro'     },
  { level: 8,  xp: 1900, rank: 'Pro'     },
  { level: 9,  xp: 2500, rank: 'Expert'  },
  { level: 10, xp: 3200, rank: 'Expert'  },
  { level: 11, xp: 4000, rank: 'Master'  },
  { level: 12, xp: 5000, rank: 'Master'  },
  { level: 13, xp: 6500, rank: 'Legend'  },
];

const CHIP_COLORS = {
  10:  { bg: 'radial-gradient(circle, #4488dd, #2255aa)' },
  20:  { bg: 'radial-gradient(circle, #9955cc, #6622aa)' },
  50:  { bg: 'radial-gradient(circle, #cc3333, #992200)' },
  100: { bg: 'radial-gradient(circle, #116622, #0a4418)' },
};

// ─────────────────────────────────────────────
//  CARD CLASS
// ─────────────────────────────────────────────
class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.faceDown = false;
    this.el = null;

    if (rank === 'A') {
      this.values = [1, 11];
    } else if (['J','Q','K'].includes(rank)) {
      this.values = [10];
    } else {
      this.values = [parseInt(rank)];
    }
  }

  flip() {
    this.faceDown = false;
    if (this.el) {
      this.el.classList.add('flipped');
    }
  }

  buildElement() {
    const isRed = RED_SUITS.has(this.suit);
    const colorClass = isRed ? 'card-red' : 'card-black';

    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Back
    const back = document.createElement('div');
    back.className = 'card-back';

    // Front
    const front = document.createElement('div');
    front.className = `card-front ${colorClass}`;

    const cornerTop = document.createElement('div');
    cornerTop.className = 'card-corner top';
    cornerTop.innerHTML = `<div class="card-rank">${this.rank}</div><div class="card-suit-small">${this.suit}</div>`;

    const center = document.createElement('div');
    center.className = 'card-center';
    center.textContent = this.suit;

    const cornerBot = document.createElement('div');
    cornerBot.className = 'card-corner bottom';
    cornerBot.innerHTML = `<div class="card-rank">${this.rank}</div><div class="card-suit-small">${this.suit}</div>`;

    front.appendChild(cornerTop);
    front.appendChild(center);
    front.appendChild(cornerBot);

    inner.appendChild(back);
    inner.appendChild(front);
    wrap.appendChild(inner);

    // If card is face-up, show front (flipped)
    if (!this.faceDown) {
      wrap.classList.add('flipped');
    }

    this.el = wrap;
    return wrap;
  }
}

// ─────────────────────────────────────────────
//  DECK CLASS
// ─────────────────────────────────────────────
class Deck {
  constructor(numDecks = 6) {
    this.numDecks = numDecks;
    this.cards = [];
    this._build();
  }

  _build() {
    this.cards = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank));
        }
      }
    }
    this._shuffle();
  }

  _shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(faceDown = false) {
    if (this.cards.length < 52) this._build();
    const card = this.cards.pop();
    card.faceDown = faceDown;
    return card;
  }
}

// ─────────────────────────────────────────────
//  HAND CLASS
// ─────────────────────────────────────────────
class Hand {
  constructor() {
    this.cards = [];
    this.bet = 0;
    this.stood = false;
    this.doubled = false;
    this.splitAces = false;
  }

  add(card) {
    this.cards.push(card);
  }

  _computeScore() {
    let total = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (card.faceDown) continue;
      if (card.rank === 'A') {
        aces++;
        total += 11;
      } else {
        total += card.values[0];
      }
    }

    let soft = aces > 0 && total <= 21;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    // isSoft: an Ace is still counting as 11
    soft = aces > 0 && total <= 21;

    return { total, soft };
  }

  get score() { return this._computeScore().total; }
  get isSoft() { return this._computeScore().soft; }
  get isBust() { return this.score > 21; }
  get isBlackjack() {
    return this.cards.length === 2 && this.score === 21 && !this.splitAces;
  }
  get canSplit() {
    if (this.cards.length !== 2) return false;
    const r0 = this.cards[0].rank;
    const r1 = this.cards[1].rank;
    // Same rank, or both 10-value face cards
    const v0 = this.cards[0].values[0];
    const v1 = this.cards[1].values[0];
    return r0 === r1 || (v0 === 10 && v1 === 10);
  }

  get scoreLabel() {
    const { total, soft } = this._computeScore();
    // soft=true means an Ace is counting as 11; show "low/high"
    if (soft) {
      return `${total - 10}/${total}`;
    }
    return `${total}`;
  }
}

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
const state = {
  phase: 'betting',       // betting | dealing | player-turn | dealer-turn | result
  cash: 1000,
  currentBet: 0,
  lastBet: 0,
  deck: new Deck(6),

  playerHands: [],        // Array<Hand>
  activeHandIndex: 0,
  dealerHand: null,

  // Stats
  wins: 0,
  losses: 0,
  pushes: 0,
  streak: 0,
  bestWin: 0,

  // XP / Level
  totalXP: 0,
  level: 1,
};

// ─────────────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  cashDisplay:    $('cash-display'),
  betAmount:      $('bet-amount'),
  betStack:       $('bet-stack'),
  dealerHand:     $('dealer-hand'),
  dealerScore:    $('dealer-score'),
  playerHandsWrap:$('player-hands-wrap'),
  playerScore:    $('player-score'),
  resultOverlay:  $('result-overlay'),
  resultText:     $('result-text'),

  bettingUi:      $('betting-ui'),
  playerActions:  $('player-actions'),
  resultActions:  $('result-actions'),

  btnDeal:        $('btn-deal'),
  btnClearBet:    $('btn-clear-bet'),
  btnRebet:       $('btn-rebet'),
  btnHit:         $('btn-hit'),
  btnStand:       $('btn-stand'),
  btnDouble:      $('btn-double'),
  btnSplit:       $('btn-split'),
  btnNext:        $('btn-next'),
  btnRebetResult: $('btn-rebet-result'),
  btnRestart:     $('btn-restart'),

  statWins:       $('stat-wins'),
  statLosses:     $('stat-losses'),
  statPushes:     $('stat-pushes'),
  statStreak:     $('stat-streak'),
  statBest:       $('stat-best'),

  rankLabel:      $('rank-label'),
  levelLabel:     $('level-label'),
  xpBar:          $('xp-bar'),
  xpLabel:        $('xp-label'),

  levelToast:     $('level-toast'),
  toastInfo:      $('toast-info'),

  tipsBtn:        $('tips-btn'),
  tipsModal:      $('tips-modal'),
  tipsClose:      $('tips-close'),

  tipPopup:       $('tip-popup'),
  tipSituation:   $('tip-situation'),
  tipActionBadge: $('tip-action-badge'),
  tipReason:      $('tip-reason'),

  bankruptcyModal:$('bankruptcy-modal'),

  chips: {
    10:  $('chip-10'),
    20:  $('chip-20'),
    50:  $('chip-50'),
    100: $('chip-100'),
  },
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function fmtCash(n) {
  return n.toLocaleString('en-US');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  return { current, next };
}

// ─────────────────────────────────────────────
//  UI UPDATES
// ─────────────────────────────────────────────
function updateCashDisplay() {
  dom.cashDisplay.textContent = fmtCash(state.cash);
}

function updateBetDisplay() {
  dom.betAmount.textContent = fmtCash(state.currentBet);
  dom.btnDeal.disabled = state.currentBet === 0;
  dom.btnClearBet.disabled = state.currentBet === 0;
  updateChipAvailability();
  renderBetStack();
}

function updateChipAvailability() {
  const remaining = state.cash - state.currentBet;
  for (const [val, chip] of Object.entries(dom.chips)) {
    if (remaining < parseInt(val)) {
      chip.classList.add('disabled');
    } else {
      chip.classList.remove('disabled');
    }
  }
}

function renderBetStack() {
  dom.betStack.innerHTML = '';
  if (state.currentBet === 0) return;

  // Break bet into chip denominations
  const chips = [];
  const denoms = [100, 50, 20, 10];
  let remaining = state.currentBet;
  for (const d of denoms) {
    while (remaining >= d) {
      chips.push(d);
      remaining -= d;
    }
  }
  if (remaining > 0) chips.push(remaining);

  const maxVisible = 8;
  const visible = chips.slice(0, maxVisible);
  const stackHeight = visible.length * 5 + 56;
  dom.betStack.style.height = stackHeight + 'px';

  visible.forEach((val, i) => {
    const chip = document.createElement('div');
    chip.className = 'bet-chip';
    chip.style.bottom = (i * 5) + 'px';
    chip.style.left = '0';
    const colorKey = [100,50,20,10].includes(val) ? val : 10;
    chip.style.background = CHIP_COLORS[colorKey]?.bg || CHIP_COLORS[10].bg;
    dom.betStack.appendChild(chip);
  });
}

function updateStats() {
  dom.statWins.textContent    = state.wins;
  dom.statLosses.textContent  = state.losses;
  dom.statPushes.textContent  = state.pushes;
  dom.statStreak.textContent  = state.streak;
  dom.statBest.textContent    = fmtCash(state.bestWin);
}

function updateXPDisplay(oldLevel) {
  const { current, next } = getLevelInfo(state.totalXP);
  dom.rankLabel.textContent  = current.rank;
  dom.levelLabel.textContent = `Lv.${current.level}`;
  dom.xpLabel.textContent    = `${state.totalXP} XP`;

  if (next) {
    const floor = current.xp;
    const ceil  = next.xp;
    const pct = Math.min(100, ((state.totalXP - floor) / (ceil - floor)) * 100);
    dom.xpBar.style.width = pct + '%';
  } else {
    dom.xpBar.style.width = '100%';
  }

  // Level-up toast
  if (oldLevel !== undefined && current.level > oldLevel) {
    showLevelToast(current);
  }

  state.level = current.level;
}

function showLevelToast(levelInfo) {
  dom.toastInfo.textContent = `${levelInfo.rank} · Level ${levelInfo.level}`;
  dom.levelToast.classList.remove('hidden', 'hide');
  dom.levelToast.classList.add('show');

  setTimeout(() => {
    dom.levelToast.classList.remove('show');
    dom.levelToast.classList.add('hide');
    setTimeout(() => {
      dom.levelToast.classList.add('hidden');
      dom.levelToast.classList.remove('hide');
    }, 400);
  }, 2800);
}

function addXP(amount) {
  const oldLevel = state.level;
  state.totalXP += amount;
  updateXPDisplay(oldLevel);
}

// ─────────────────────────────────────────────
//  PHASE SWITCHING
// ─────────────────────────────────────────────
function showPhase(phase) {
  dom.bettingUi.classList.add('hidden');
  dom.playerActions.classList.add('hidden');
  dom.resultActions.classList.add('hidden');

  if (phase === 'betting') dom.bettingUi.classList.remove('hidden');
  if (phase === 'player-turn') dom.playerActions.classList.remove('hidden');
  if (phase === 'result') dom.resultActions.classList.remove('hidden');

  // Pulse the ? button only during player-turn; hide popup on phase exit
  if (phase === 'player-turn') {
    dom.tipsBtn.classList.add('tips-btn--live');
    dom.tipsBtn.title = 'Strategy Tip (click me!)';
  } else {
    dom.tipsBtn.classList.remove('tips-btn--live');
    dom.tipsBtn.title = 'Tips & Rules';
    hideTipPopup();
  }
}

// ─────────────────────────────────────────────
//  SCORE DISPLAY
// ─────────────────────────────────────────────
function renderScoreLabel(hand, el, hideHole = false) {
  if (!hand || hand.cards.length === 0) {
    el.textContent = '';
    return;
  }

  // For dealer during player turn, only count visible cards
  if (hideHole) {
    const visibleCards = hand.cards.filter(c => !c.faceDown);
    if (visibleCards.length === 0) { el.textContent = ''; return; }

    const tempHand = new Hand();
    tempHand.cards = visibleCards;
    el.textContent = tempHand.scoreLabel;
    el.className = '';
    return;
  }

  let label = hand.scoreLabel;
  el.className = '';
  if (hand.isBlackjack) {
    label = 'BJ!';
    el.className = 'score-bj';
  } else if (hand.isBust) {
    label = `${hand.score} BUST`;
    el.className = 'score-bust';
  }
  el.textContent = label;
}

// ─────────────────────────────────────────────
//  CARD RENDERING
// ─────────────────────────────────────────────
function renderCard(card, container, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      const el = card.buildElement();
      el.classList.add('dealing');
      container.appendChild(el);
      el.addEventListener('animationend', () => {
        el.classList.remove('dealing');
        resolve();
      }, { once: true });
    }, delay);
  });
}

function getActiveHandEl() {
  return dom.playerHandsWrap.querySelectorAll('.hand-area')[state.activeHandIndex] || null;
}

function renderPlayerHands() {
  dom.playerHandsWrap.innerHTML = '';
  state.playerHands.forEach((hand, i) => {
    const area = document.createElement('div');
    area.className = 'hand-area';
    if (i === state.activeHandIndex && state.phase === 'player-turn') {
      area.classList.add('active-hand');
    }
    hand.cards.forEach(card => {
      const el = card.buildElement();
      area.appendChild(el);
    });
    dom.playerHandsWrap.appendChild(area);
  });
}

// ─────────────────────────────────────────────
//  BETTING
// ─────────────────────────────────────────────
function addChip(value) {
  if (state.phase !== 'betting') return;
  const remaining = state.cash - state.currentBet;
  if (remaining < value) return;
  state.currentBet += value;
  updateBetDisplay();
}

function clearBet() {
  state.currentBet = 0;
  updateBetDisplay();
}

function rebet() {
  if (state.lastBet === 0) return;
  const canAfford = Math.min(state.lastBet, state.cash);
  state.currentBet = canAfford;
  updateBetDisplay();
}

// ─────────────────────────────────────────────
//  DEAL
// ─────────────────────────────────────────────
async function deal() {
  if (state.currentBet === 0 || state.phase !== 'betting') return;

  state.phase = 'dealing';
  state.lastBet = state.currentBet;
  state.cash -= state.currentBet;
  updateCashDisplay();

  // Clear table
  dom.dealerHand.innerHTML = '';
  dom.playerHandsWrap.innerHTML = '';
  dom.resultOverlay.classList.add('hidden');
  dom.dealerScore.textContent = '';
  dom.playerScore.textContent = '';

  showPhase('');

  // Set up hands
  state.dealerHand = new Hand();
  const playerHand = new Hand();
  playerHand.bet = state.currentBet;
  state.playerHands = [playerHand];
  state.activeHandIndex = 0;

  // Create a fresh hand-area for player
  const playerArea = document.createElement('div');
  playerArea.className = 'hand-area active-hand';
  dom.playerHandsWrap.appendChild(playerArea);

  // Deal 4 cards with animation delays
  // p1, d1, p2, d2(face down)
  const p1 = state.deck.deal(false);
  const d1 = state.deck.deal(false);
  const p2 = state.deck.deal(false);
  const d2 = state.deck.deal(true);  // hole card

  playerHand.add(p1);
  playerHand.add(p2);
  state.dealerHand.add(d1);
  state.dealerHand.add(d2);

  await renderCard(p1, playerArea, 0);
  await renderCard(d1, dom.dealerHand, 150);
  await renderCard(p2, playerArea, 300);
  await renderCard(d2, dom.dealerHand, 450);

  await sleep(200);

  // Check for blackjack
  const playerBJ = playerHand.isBlackjack;
  const dealerBJ = state.dealerHand.isBlackjack; // don't reveal yet

  // Update score displays
  renderScoreLabel(state.dealerHand, dom.dealerScore, true);
  renderScoreLabel(playerHand, dom.playerScore);

  if (playerBJ || dealerBJ) {
    // Reveal hole card
    state.dealerHand.cards[1].flip();
    renderPlayerHands();
    renderScoreLabel(state.dealerHand, dom.dealerScore, false);

    await sleep(400);
    await resolveResult();
  } else {
    state.phase = 'player-turn';
    showPhase('player-turn');
    updatePlayerActions();
  }
}

// ─────────────────────────────────────────────
//  PLAYER ACTIONS
// ─────────────────────────────────────────────
function activeHand() {
  return state.playerHands[state.activeHandIndex];
}

function updatePlayerActions() {
  const hand = activeHand();
  if (!hand) return;

  const canDouble = hand.cards.length === 2 &&
    !hand.doubled &&
    (state.cash >= hand.bet);

  const canSplit = hand.canSplit &&
    state.playerHands.length < 4 &&
    (state.cash >= hand.bet) &&
    !hand.splitAces;

  dom.btnDouble.disabled = !canDouble;
  dom.btnSplit.disabled  = !canSplit;
  dom.btnHit.disabled    = false;
  dom.btnStand.disabled  = false;
}

async function playerHit() {
  if (state.phase !== 'player-turn') return;
  const hand = activeHand();
  if (!hand || hand.stood) return;
  hideTipPopup();

  const card = state.deck.deal(false);
  hand.add(card);

  const handEl = getActiveHandEl();
  if (handEl) await renderCard(card, handEl, 0);

  renderScoreLabel(hand, dom.playerScore);

  if (hand.isBust) {
    await sleep(300);
    await advanceHand();
  } else if (hand.splitAces) {
    // Auto-stand after one card on split aces
    await advanceHand();
  } else {
    updatePlayerActions();
  }
}

async function playerStand() {
  if (state.phase !== 'player-turn') return;
  const hand = activeHand();
  if (!hand) return;
  hideTipPopup();

  hand.stood = true;
  await advanceHand();
}

async function playerDouble() {
  if (state.phase !== 'player-turn') return;
  const hand = activeHand();
  if (!hand || hand.cards.length !== 2) return;
  if (state.cash < hand.bet) return;
  hideTipPopup();

  state.cash -= hand.bet;
  hand.bet *= 2;
  hand.doubled = true;
  updateCashDisplay();

  const card = state.deck.deal(false);
  hand.add(card);

  const handEl = getActiveHandEl();
  if (handEl) await renderCard(card, handEl, 0);

  renderScoreLabel(hand, dom.playerScore);
  await sleep(300);
  await advanceHand();
}

async function playerSplit() {
  if (state.phase !== 'player-turn') return;
  const hand = activeHand();
  if (!hand || !hand.canSplit || state.playerHands.length >= 4) return;
  if (state.cash < hand.bet) return;
  if (hand.splitAces) return;
  hideTipPopup();

  const isAces = hand.cards[0].rank === 'A';
  state.cash -= hand.bet;
  updateCashDisplay();

  // Create second hand with second card
  const newHand = new Hand();
  newHand.bet = hand.bet;
  newHand.splitAces = isAces;
  newHand.add(hand.cards.pop());

  if (isAces) hand.splitAces = true;

  // Insert new hand right after current
  state.playerHands.splice(state.activeHandIndex + 1, 0, newHand);

  // Deal one card to each split hand
  const card1 = state.deck.deal(false);
  const card2 = state.deck.deal(false);
  hand.add(card1);
  newHand.add(card2);

  // Re-render all hands
  renderPlayerHands();

  renderScoreLabel(hand, dom.playerScore);

  if (isAces) {
    // Auto-stand both hands
    hand.stood = true;
    newHand.stood = true;
    await sleep(400);
    // Move through both
    await advanceHand();
  } else {
    updatePlayerActions();
  }
}

async function advanceHand() {
  // Try next unsettled hand
  const nextIndex = state.playerHands.findIndex(
    (h, i) => i > state.activeHandIndex && !h.stood && !h.isBust
  );

  if (nextIndex !== -1) {
    state.activeHandIndex = nextIndex;
    renderPlayerHands();
    renderScoreLabel(activeHand(), dom.playerScore);
    updatePlayerActions();
    return;
  }

  // All hands done — check if any aren't bust
  const anyAlive = state.playerHands.some(h => !h.isBust);
  if (!anyAlive) {
    await resolveResult();
    return;
  }

  // Dealer's turn
  state.phase = 'dealer-turn';
  showPhase('');
  await dealerTurn();
}

// ─────────────────────────────────────────────
//  DEALER TURN
// ─────────────────────────────────────────────
async function dealerTurn() {
  // Reveal hole card
  const holeCard = state.dealerHand.cards.find(c => c.faceDown);
  if (holeCard) {
    holeCard.flip();
    renderScoreLabel(state.dealerHand, dom.dealerScore, false);
    await sleep(500);
  }

  await dealerDrawLoop();
  await resolveResult();
}

async function dealerDrawLoop() {
  while (true) {
    const hand = state.dealerHand;
    const mustHit = hand.score < 17 || (hand.score === 17 && hand.isSoft);
    if (!mustHit) break;

    const card = state.deck.deal(false);
    hand.add(card);
    await renderCard(card, dom.dealerHand, 0);
    renderScoreLabel(hand, dom.dealerScore, false);
    await sleep(500);
  }
}

// ─────────────────────────────────────────────
//  RESULT RESOLUTION
// ─────────────────────────────────────────────
async function resolveResult() {
  state.phase = 'result';

  const dealerHand = state.dealerHand;
  const dealerScore = dealerHand.score;
  const dealerBJ = dealerHand.isBlackjack;
  const dealerBust = dealerHand.isBust;

  // Make sure hole card is flipped
  dealerHand.cards.forEach(c => { if (c.faceDown) c.flip(); });
  renderScoreLabel(dealerHand, dom.dealerScore, false);

  let totalWinnings = 0;
  const results = [];

  for (const hand of state.playerHands) {
    const playerBJ = hand.isBlackjack;
    const playerBust = hand.isBust;
    const playerScore = hand.score;

    let outcome; // 'bj' | 'win' | 'push' | 'loss'
    let payout = 0;

    if (playerBust) {
      outcome = 'loss';
      payout = 0;
    } else if (playerBJ && dealerBJ) {
      outcome = 'push';
      payout = hand.bet;
    } else if (playerBJ) {
      outcome = 'bj';
      payout = hand.bet + Math.floor(hand.bet * 1.5);
    } else if (dealerBJ) {
      outcome = 'loss';
      payout = 0;
    } else if (dealerBust) {
      outcome = 'win';
      payout = hand.bet * 2;
    } else if (playerScore > dealerScore) {
      outcome = 'win';
      payout = hand.bet * 2;
    } else if (playerScore === dealerScore) {
      outcome = 'push';
      payout = hand.bet;
    } else {
      outcome = 'loss';
      payout = 0;
    }

    totalWinnings += payout;
    results.push(outcome);
  }

  state.cash += totalWinnings;
  updateCashDisplay();

  // Determine primary outcome for display
  const primaryOutcome = results.length === 1 ? results[0] : (() => {
    if (results.every(r => r === 'loss')) return 'loss';
    if (results.every(r => r === 'push')) return 'push';
    if (results.includes('bj') || results.includes('win')) return 'win';
    return 'push';
  })();

  // Stats
  const netGain = totalWinnings - state.playerHands.reduce((a, h) => a + h.bet, 0);

  if (primaryOutcome === 'bj' || primaryOutcome === 'win') {
    state.wins++;
    state.streak++;
    if (netGain > state.bestWin) state.bestWin = netGain;
    const xpGain = primaryOutcome === 'bj' ? 50 : 30;
    const streakBonus = state.streak >= 3 ? 10 : 0;
    addXP(xpGain + streakBonus);
  } else if (primaryOutcome === 'push') {
    state.pushes++;
    state.streak = 0;
    addXP(10);
  } else {
    state.losses++;
    state.streak = 0;
    addXP(5);
  }

  updateStats();

  // Show result overlay
  const labels = {
    bj:   { text: 'BLACKJACK!', cls: 'result-bj'   },
    win:  { text: 'YOU WIN!',   cls: 'result-win'   },
    push: { text: 'PUSH',       cls: 'result-push'  },
    loss: { text: results.every(r => r === 'loss') && state.playerHands.every(h => h.isBust)
              ? 'BUST!' : 'YOU LOSE',
            cls: state.playerHands.every(h => h.isBust) ? 'result-bust' : 'result-lose' },
  };

  const info = labels[primaryOutcome];
  dom.resultText.textContent  = info.text;
  dom.resultText.className    = info.cls;
  dom.resultOverlay.classList.remove('hidden');

  await sleep(600);
  showPhase('result');
  dom.btnRebetResult.disabled = state.lastBet === 0 || state.cash < state.lastBet;

  // Bankruptcy check
  if (state.cash === 0) {
    await sleep(800);
    dom.bankruptcyModal.classList.remove('hidden');
  }
}

// ─────────────────────────────────────────────
//  NEXT HAND
// ─────────────────────────────────────────────
function nextHand(keepBet = false) {
  state.phase = 'betting';
  state.playerHands = [];
  state.dealerHand = null;
  state.activeHandIndex = 0;

  dom.dealerHand.innerHTML = '';
  dom.playerHandsWrap.innerHTML = '';
  dom.resultOverlay.classList.add('hidden');
  dom.dealerScore.textContent = '';
  dom.playerScore.textContent = '';

  // Re-create default player hand area
  const area = document.createElement('div');
  area.className = 'hand-area active-hand';
  dom.playerHandsWrap.appendChild(area);

  if (!keepBet) {
    state.currentBet = 0;
  } else {
    // Re-bet: keep last bet if we can afford it
    state.currentBet = Math.min(state.lastBet, state.cash);
  }

  updateBetDisplay();
  dom.btnRebet.disabled = state.lastBet === 0;
  showPhase('betting');

  if (keepBet && state.currentBet > 0) {
    deal();
  }
}

// ─────────────────────────────────────────────
//  BASIC STRATEGY TIP
// ─────────────────────────────────────────────
function getBasicStrategyTip() {
  const hand = activeHand();
  if (!hand || state.phase !== 'player-turn') return null;

  const dealerUpcard = state.dealerHand.cards.find(c => !c.faceDown);
  if (!dealerUpcard) return null;

  const dealerNum   = dealerUpcard.rank === 'A' ? 11 : dealerUpcard.values[0];
  const dealerLabel = dealerUpcard.rank === 'A' ? 'A' : String(dealerNum);

  const score        = hand.score;
  const isSoft       = hand.isSoft;
  const canDoubleNow = !dom.btnDouble.disabled;
  const canSplitNow  = !dom.btnSplit.disabled;

  let situation, action, reason, color;

  // ── Pairs ──────────────────────────────────────────────────────
  if (canSplitNow) {
    const rank = hand.cards[0].rank;
    const val  = hand.cards[0].values[0];

    if (rank === 'A') {
      return { situation: `Pair of Aces vs dealer ${dealerLabel}`,
               action: 'SPLIT', reason: 'Always split Aces.', color: '#4cff6e' };
    }
    if (val === 8) {
      return { situation: `Pair of 8s vs dealer ${dealerLabel}`,
               action: 'SPLIT', reason: 'Always split 8s — 16 is the worst hand.', color: '#4cff6e' };
    }
    if (val === 9) {
      if (dealerNum !== 7 && dealerNum < 10) {
        return { situation: `Pair of 9s vs dealer ${dealerLabel}`,
                 action: 'SPLIT', reason: 'Split 9s vs dealer 2–6, 8–9.', color: '#4cff6e' };
      }
      // 9+9=18 stands vs 7, 10, A — fall through to hard 18
    }
    if (val === 7 || val === 3 || val === 2) {
      if (dealerNum >= 2 && dealerNum <= 7) {
        return { situation: `Pair of ${rank}s vs dealer ${dealerLabel}`,
                 action: 'SPLIT', reason: `Split ${rank}s vs dealer 2–7.`, color: '#4cff6e' };
      }
    }
    if (val === 6) {
      if (dealerNum >= 2 && dealerNum <= 6) {
        return { situation: `Pair of 6s vs dealer ${dealerLabel}`,
                 action: 'SPLIT', reason: 'Split 6s vs dealer 2–6.', color: '#4cff6e' };
      }
    }
    // 10s, 5s, 4s: never split — fall through to hard totals
  }

  // ── Soft totals ────────────────────────────────────────────────
  if (isSoft) {
    situation = `Soft ${score} vs dealer ${dealerLabel}`;
    if (score >= 19) {
      action = 'STAND'; reason = `Soft ${score} is strong — always stand.`; color = '#aaaaff';
    } else if (score === 18) {
      if (canDoubleNow && dealerNum >= 3 && dealerNum <= 6) {
        action = 'DOUBLE'; reason = 'Soft 18 doubles vs dealer 3–6.'; color = '#d4af37';
      } else if (dealerNum >= 9) {
        action = 'HIT';   reason = 'Soft 18 hits vs dealer 9, 10, A.'; color = '#4488ff';
      } else {
        action = 'STAND'; reason = 'Soft 18 stands vs dealer 2, 7, 8.'; color = '#aaaaff';
      }
    } else if (score === 17) {
      if (canDoubleNow && dealerNum >= 3 && dealerNum <= 6) {
        action = 'DOUBLE'; reason = 'Soft 17 doubles vs dealer 3–6.'; color = '#d4af37';
      } else {
        action = 'HIT'; reason = 'Soft 17 always hits otherwise.'; color = '#4488ff';
      }
    } else if (score === 16 || score === 15) {
      if (canDoubleNow && dealerNum >= 4 && dealerNum <= 6) {
        action = 'DOUBLE'; reason = `Soft ${score} doubles vs dealer 4–6.`; color = '#d4af37';
      } else {
        action = 'HIT'; reason = `Soft ${score} hits otherwise.`; color = '#4488ff';
      }
    } else if (score === 14 || score === 13) {
      if (canDoubleNow && dealerNum >= 5 && dealerNum <= 6) {
        action = 'DOUBLE'; reason = `Soft ${score} doubles vs dealer 5–6.`; color = '#d4af37';
      } else {
        action = 'HIT'; reason = `Soft ${score} hits otherwise.`; color = '#4488ff';
      }
    } else {
      action = 'HIT'; reason = `Hit soft ${score}.`; color = '#4488ff';
    }
    return { situation, action, reason, color };
  }

  // ── Hard totals ────────────────────────────────────────────────
  situation = `Hard ${score} vs dealer ${dealerLabel}`;

  if (score >= 17) {
    action = 'STAND'; reason = 'Hard 17+ always stands.'; color = '#aaaaff';
  } else if (score >= 13) {
    if (dealerNum <= 6) {
      action = 'STAND'; reason = `Hard ${score} stands — dealer is weak (2–6).`; color = '#aaaaff';
    } else {
      action = 'HIT'; reason = `Hard ${score} hits — dealer is strong (7+).`; color = '#4488ff';
    }
  } else if (score === 12) {
    if (dealerNum >= 4 && dealerNum <= 6) {
      action = 'STAND'; reason = 'Hard 12 stands vs dealer 4–6.'; color = '#aaaaff';
    } else {
      action = 'HIT'; reason = 'Hard 12 hits vs dealer 2–3 and 7+.'; color = '#4488ff';
    }
  } else if (score === 11) {
    action = canDoubleNow ? 'DOUBLE' : 'HIT';
    reason = 'Hard 11 — best doubling hand in the game.'; color = '#d4af37';
  } else if (score === 10) {
    if (dealerNum <= 9) {
      action = canDoubleNow ? 'DOUBLE' : 'HIT';
      reason = 'Double 10 vs dealer 2–9.'; color = '#d4af37';
    } else {
      action = 'HIT'; reason = 'Hit 10 vs dealer 10 or A.'; color = '#4488ff';
    }
  } else if (score === 9) {
    if (canDoubleNow && dealerNum >= 3 && dealerNum <= 6) {
      action = 'DOUBLE'; reason = 'Double 9 vs dealer 3–6.'; color = '#d4af37';
    } else {
      action = 'HIT'; reason = 'Hit 9 vs dealer 2 and 7+.'; color = '#4488ff';
    }
  } else {
    action = 'HIT'; reason = `Always hit ${score} or less.`; color = '#4488ff';
  }

  return { situation, action, reason, color };
}

function showTipPopup() {
  const tip = getBasicStrategyTip();
  if (!tip) return;

  dom.tipSituation.textContent   = tip.situation;
  dom.tipActionBadge.textContent = tip.action;
  dom.tipActionBadge.style.color = tip.color;
  dom.tipReason.textContent      = tip.reason;

  // Re-trigger animation
  dom.tipPopup.classList.add('hidden');
  void dom.tipPopup.offsetWidth; // force reflow
  dom.tipPopup.classList.remove('hidden');
}

function hideTipPopup() {
  dom.tipPopup.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (dom.tipsModal.classList.contains('hidden') === false) return;
  if (state.phase !== 'player-turn') return;

  switch (e.key.toUpperCase()) {
    case 'H': playerHit();    break;
    case 'S': playerStand();  break;
    case 'D': if (!dom.btnDouble.disabled) playerDouble(); break;
    case 'P': if (!dom.btnSplit.disabled)  playerSplit();  break;
  }
});

// ─────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────
// Chips
for (const [val, chipEl] of Object.entries(dom.chips)) {
  chipEl.addEventListener('click', () => addChip(parseInt(val)));
}

// Bet controls
dom.btnClearBet.addEventListener('click', clearBet);
dom.btnRebet.addEventListener('click', rebet);
dom.btnDeal.addEventListener('click', deal);

// Player actions
dom.btnHit.addEventListener('click',    playerHit);
dom.btnStand.addEventListener('click',  playerStand);
dom.btnDouble.addEventListener('click', playerDouble);
dom.btnSplit.addEventListener('click',  playerSplit);

// Result actions
dom.btnNext.addEventListener('click',        () => nextHand(false));
dom.btnRebetResult.addEventListener('click', () => nextHand(true));

// Tips button — contextual tip during player-turn, full modal otherwise
dom.tipsBtn.addEventListener('click', () => {
  if (state.phase === 'player-turn') {
    if (dom.tipPopup.classList.contains('hidden')) {
      showTipPopup();
    } else {
      hideTipPopup();
    }
  } else {
    hideTipPopup();
    dom.tipsModal.classList.remove('hidden');
  }
});
dom.tipsClose.addEventListener('click', () => dom.tipsModal.classList.add('hidden'));
dom.tipsModal.addEventListener('click', e => {
  if (e.target === dom.tipsModal) dom.tipsModal.classList.add('hidden');
});

// Bankruptcy restart
dom.btnRestart.addEventListener('click', () => {
  state.cash    = 1000;
  state.wins    = 0;
  state.losses  = 0;
  state.pushes  = 0;
  state.streak  = 0;
  state.bestWin = 0;
  state.totalXP = 0;
  state.level   = 1;
  state.lastBet = 0;
  state.currentBet = 0;

  updateCashDisplay();
  updateStats();
  updateXPDisplay(undefined);
  dom.bankruptcyModal.classList.add('hidden');
  nextHand(false);
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
function init() {
  updateCashDisplay();
  updateBetDisplay();
  updateStats();
  updateXPDisplay(undefined);
  dom.btnRebet.disabled = true;
  showPhase('betting');

  // Place initial empty hand area
  const area = document.createElement('div');
  area.className = 'hand-area active-hand';
  dom.playerHandsWrap.appendChild(area);
}

init();
