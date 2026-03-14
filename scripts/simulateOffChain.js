const crypto = require("crypto");
const { ethers } = require("ethers");

function theoreticalRawWinProb(v) {
  return (4 * Math.max(v - 1, 13 - v)) / 51;
}

function theoreticalConditionalWinProb(v) {
  return Math.max(v - 1, 13 - v) / 12;
}

function optimalGuessHigher(v) {
  return v <= 7;
}

function deriveNextCardLikeContract(currentCard, computedHashHex) {
  const computed = BigInt(computedHashHex); // bytes32 hex -> uint256
  const roll = computed % 51n;

  if (roll < 3n) return currentCard; // tie / push

  const idx = (roll - 3n) / 4n; // 0..11
  const v = BigInt(currentCard);

  if (idx < (v - 1n)) return Number(idx + 1n);
  return Number(idx + 2n);
}

function playerWon(currentCard, nextCard, guessHigher) {
  if (nextCard === currentCard) return false; // push, not a win
  return guessHigher ? (nextCard > currentCard) : (nextCard < currentCard);
}

async function main() {
  const TOTAL_GAMES = Number(process.argv[2] || 1_000_000);

  const stats = Array.from({ length: 14 }, () => ({
    total: 0,
    wins: 0,
    losses: 0,
    ties: 0
  }));

  const t0 = Date.now();

  for (let i = 0; i < TOTAL_GAMES; i++) {
    const currentCard = (Math.random() * 13 | 0) + 1;

    const seedBytes = crypto.randomBytes(32);

    // Mirrors keccak256 over a 32-byte seed value
    const computedHash = ethers.keccak256(seedBytes);

    const nextCard = deriveNextCardLikeContract(currentCard, computedHash);
    const guessHigher = optimalGuessHigher(currentCard);
    const won = playerWon(currentCard, nextCard, guessHigher);

    const s = stats[currentCard];
    s.total++;

    if (nextCard === currentCard) {
      s.ties++;
    } else if (won) {
      s.wins++;
    } else {
      s.losses++;
    }

    if ((i + 1) % 200000 === 0) {
      console.log(`Simulated ${i + 1}/${TOTAL_GAMES}...`);
    }
  }

  const secs = (Date.now() - t0) / 1000;
  console.log(
    `\nTime: ${secs.toFixed(2)}s (${Math.round(TOTAL_GAMES / secs).toLocaleString()} games/sec)`
  );

  console.log("\n================= OFF-CHAIN RESULTS (FAST) =================");
  console.log(`Total games: ${TOTAL_GAMES}\n`);

  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;

  for (let v = 1; v <= 13; v++) {
    const s = stats[v];
    totalWins += s.wins;
    totalLosses += s.losses;
    totalTies += s.ties;

    const empiricalRaw = s.total ? s.wins / s.total : 0;
    const empiricalCond = (s.wins + s.losses) ? s.wins / (s.wins + s.losses) : 0;

    const theoryRaw = theoreticalRawWinProb(v);
    const theoryCond = theoreticalConditionalWinProb(v);

    console.log(
      `Upcard ${String(v).padStart(2)} | ` +
      `N=${String(s.total).padStart(7)} | ` +
      `W=${String(s.wins).padStart(7)} | ` +
      `L=${String(s.losses).padStart(7)} | ` +
      `T=${String(s.ties).padStart(7)} | ` +
      `EmpRaw=${empiricalRaw.toFixed(4)} | ` +
      `EmpCond=${empiricalCond.toFixed(4)} | ` +
      `TheoryRaw=${theoryRaw.toFixed(4)} | ` +
      `TheoryCond=${theoryCond.toFixed(4)}`
    );
  }

  const overallEmpRaw = totalWins / (totalWins + totalLosses + totalTies);
  const overallEmpCond = totalWins / (totalWins + totalLosses);

  let overallTheoryRaw = 0;
  let overallTheoryCond = 0;

  for (let v = 1; v <= 13; v++) {
    overallTheoryRaw += theoreticalRawWinProb(v);
    overallTheoryCond += theoreticalConditionalWinProb(v);
  }

  overallTheoryRaw /= 13;
  overallTheoryCond /= 13;

  console.log("\n----------------- OVERALL -----------------");
  console.log(`Total wins:   ${totalWins}`);
  console.log(`Total losses: ${totalLosses}`);
  console.log(`Total ties:   ${totalTies} (pushes)`);
  console.log(`Empirical Raw P(win):   ${overallEmpRaw.toFixed(4)}`);
  console.log(`Empirical Cond P(win):  ${overallEmpCond.toFixed(4)}`);
  console.log(`Theory Raw P(win):      ${overallTheoryRaw.toFixed(4)}`);
  console.log(`Theory Cond P(win):     ${overallTheoryCond.toFixed(4)}`);
  console.log("===========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});