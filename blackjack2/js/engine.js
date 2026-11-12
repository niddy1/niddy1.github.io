/* Blackjack 2 engine: pure rules, no DOM. Works in the browser (window.BJEngine) and in Node (for tests). */
(function (root) {
  'use strict';
  var SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function cardValue(rank) {
    if (rank === 'A') return 11;
    if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 10;
    return parseInt(rank, 10);
  }
  // Hi-Lo card counting: 2-6 are +1, 7-9 are 0, 10-A are -1
  function hiLo(rank) {
    var v = cardValue(rank);
    if (v >= 2 && v <= 6) return 1;
    if (v >= 7 && v <= 9) return 0;
    return -1;
  }
  // Every ace starts as 11 and drops to 1 one at a time, only as far as needed. (No ace-counting bugs.)
  function handValue(cards) {
    var total = 0, aces = 0;
    for (var i = 0; i < cards.length; i++) {
      total += cardValue(cards[i].rank);
      if (cards[i].rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return { total: total, soft: aces > 0 };
  }
  function isBlackjack(cards) { return cards.length === 2 && handValue(cards).total === 21; }

  function makeShoe(decks, rng) {
    rng = rng || Math.random;
    var shoe = [];
    for (var d = 0; d < decks; d++)
      for (var s = 0; s < SUITS.length; s++)
        for (var r = 0; r < RANKS.length; r++) shoe.push({ rank: RANKS[r], suit: SUITS[s] });
    // Fisher-Yates, the right way round
    for (var i = shoe.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t;
    }
    return shoe;
  }

  function canSplit(hand, handCount, bankroll, maxHands) {
    return hand.cards.length === 2 && handCount < (maxHands || 4) && bankroll >= hand.bet &&
      cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank) && !hand.splitAces;
  }
  function canDouble(hand, bankroll) {
    return hand.cards.length === 2 && bankroll >= hand.bet && !hand.splitAces;
  }
  function canSurrender(hand, handCount) {
    return hand.cards.length === 2 && handCount === 1 && !hand.fromSplit;
  }

  // Multi-deck basic strategy (dealer stands on soft 17, double after split allowed, late surrender).
  // up = dealer upcard value 2..11. Returns one of: 'hit','stand','double','split','surrender'.
  function basicStrategy(hand, up, can, h17) {
    var cards = hand.cards, v = handValue(cards), t = v.total;
    can = can || {};
    function dbl(otherwise) { return can.double ? 'double' : otherwise; }
    if (cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank) && can.split) {
      var p = cardValue(cards[0].rank);
      if (p === 11 || p === 8) return 'split';
      if (p === 9) return (up === 7 || up === 10 || up === 11) ? 'stand' : 'split';
      if (p === 7) return up <= 7 ? 'split' : 'hit';
      if (p === 6) return up <= 6 ? 'split' : 'hit';
      if (p === 4) return (up === 5 || up === 6) ? 'split' : 'hit';
      if (p === 3 || p === 2) return up <= 7 ? 'split' : 'hit';
      // fives and tens fall through to the normal totals below
    }
    if (v.soft) {
      if (t >= 20) return 'stand';
      if (t === 19) return (h17 && up === 6) ? dbl('stand') : 'stand';
      if (t === 18) {
        if (up >= 3 && up <= 6) return dbl('stand');
        if (h17 && up === 2) return dbl('stand');
        return (up === 2 || up === 7 || up === 8) ? 'stand' : 'hit';
      }
      if (t === 17) return (up >= 3 && up <= 6) ? dbl('hit') : 'hit';
      if (t === 15 || t === 16) return (up >= 4 && up <= 6) ? dbl('hit') : 'hit';
      return (up >= 5 && up <= 6) ? dbl('hit') : 'hit';   // soft 13 / 14
    }
    if (t >= 17) return 'stand';
    if (t === 16) {
      if (can.surrender && (up === 9 || up === 10 || up === 11)) return 'surrender';
      return up <= 6 ? 'stand' : 'hit';
    }
    if (t === 15) {
      if (can.surrender && up === 10) return 'surrender';
      return up <= 6 ? 'stand' : 'hit';
    }
    if (t >= 13) return up <= 6 ? 'stand' : 'hit';
    if (t === 12) return (up >= 4 && up <= 6) ? 'stand' : 'hit';
    if (t === 11) return (up === 11 && !h17) ? 'hit' : dbl('hit');
    if (t === 10) return up <= 9 ? dbl('hit') : 'hit';
    if (t === 9) return (up >= 3 && up <= 6) ? dbl('hit') : 'hit';
    return 'hit';
  }

  // How much comes back to the player (stake included) for a finished hand. 0 = lost it all.
  function payout(hand, dealerCards) {
    if (hand.surrendered) return hand.bet / 2;
    var pv = handValue(hand.cards).total, dv = handValue(dealerCards).total;
    var pBJ = isBlackjack(hand.cards) && !hand.fromSplit, dBJ = isBlackjack(dealerCards);
    if (pv > 21) return 0;
    if (pBJ && !dBJ) return hand.bet * 2.5;
    if (dBJ && !pBJ) return 0;
    if (pBJ && dBJ) return hand.bet;
    if (dv > 21 || pv > dv) return hand.bet * 2;
    if (pv === dv) return hand.bet;
    return 0;
  }
  function outcome(hand, dealerCards) {
    if (hand.surrendered) return 'surrender';
    var back = payout(hand, dealerCards);
    var pBJ = isBlackjack(hand.cards) && !hand.fromSplit;
    if (back === 0) return handValue(hand.cards).total > 21 ? 'bust' : 'lose';
    if (back === hand.bet) return 'push';
    return (pBJ && !isBlackjack(dealerCards)) ? 'blackjack' : 'win';
  }

  var api = {
    SUITS: SUITS, RANKS: RANKS, cardValue: cardValue, hiLo: hiLo, handValue: handValue, isBlackjack: isBlackjack,
    makeShoe: makeShoe, canSplit: canSplit, canDouble: canDouble, canSurrender: canSurrender,
    basicStrategy: basicStrategy, payout: payout, outcome: outcome
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BJEngine = api;
}(typeof window !== 'undefined' ? window : this));
