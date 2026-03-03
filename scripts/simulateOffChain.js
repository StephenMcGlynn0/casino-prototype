const crypto = require("crypto");
const { ethers } = require("ethers");

function theoreticalWinProb(v) {
  return (4 * Math.max(v - 1, 13 - v)) / 51;
}

function optimalGuessHigher(v) {
  return v <= 7;
}

function deriveNextCardLikeContract(currentCard, computedHashHex) {
  const computed = BigInt(computedHashHex); // bytes32 hex -> uint256
  const roll = computed % 51n;

  if (roll < 3n) return currentCard; // tie

  const idx = (roll - 3n) / 4n; // 0..11
  const v = BigInt(currentCard);

  if (idx < (v - 1n)) return Number(idx + 1n);
  return Number(idx + 2n);
}

function playerWon(currentCard, nextCard, guessHigher) {
  if (nextCard === currentCard) return false; // tie=loss
  return guessHigher ? (nextCard > currentCard) : (nextCard < currentCard);
}

async function main() {
  const TOTAL_GAMES = Number(process.argv[2] || 1_000_000);

  const stats = Array.from({ length: 14 }, () => ({
    total: 0, wins: 0, losses: 0, ties: 0
  }));

  const t0 = Date.now();

  for (let i = 0; i < TOTAL_GAMES; i++) {
    const currentCard = (Math.random() * 13 | 0) + 1;

    // seedBytes is the real 32-byte "seed"
    const seedBytes = crypto.randomBytes(32);

    // EXACT Solidity equivalent for uint256:
    // keccak256(abi.encodePacked(seed)) == keccak256(seedBytes32)
    const computedHash = ethers.keccak256(seedBytes);

    const nextCard = deriveNextCardLikeContract(currentCard, computedHash);

    const guessHigher = optimalGuessHigher(currentCard);
    const won = playerWon(currentCard, nextCard, guessHigher);

    const s = stats[currentCard];
    s.total++;

    if (nextCard === currentCard) {
      s.ties++;
      s.losses++;
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
  console.log(`\nTime: ${secs.toFixed(2)}s (${Math.round(TOTAL_GAMES / secs).toLocaleString()} games/sec)`);

  console.log("\n================= OFF-CHAIN RESULTS (FAST) =================");
  console.log(`Total games: ${TOTAL_GAMES}\n`);

  let totalWins = 0, totalLosses = 0, totalTies = 0;

  for (let v = 1; v <= 13; v++) {
    const s = stats[v];
    totalWins += s.wins;
    totalLosses += s.losses;
    totalTies += s.ties;

    const empirical = s.total ? s.wins / s.total : 0;
    const theory = theoreticalWinProb(v);

    console.log(
      `Upcard ${String(v).padStart(2)} | ` +
      `N=${String(s.total).padStart(7)} | ` +
      `W=${String(s.wins).padStart(7)} | ` +
      `L=${String(s.losses).padStart(7)} | ` +
      `T=${String(s.ties).padStart(7)} | ` +
      `Emp P(win|v)=${empirical.toFixed(4)} | ` +
      `Theory=${theory.toFixed(4)}`
    );
  }

  const overallEmp = totalWins / (totalWins + totalLosses);
  const overallTheory = 160 / 221;

  console.log("\n----------------- OVERALL -----------------");
  console.log(`Total wins:   ${totalWins}`);
  console.log(`Total losses: ${totalLosses}`);
  console.log(`Total ties:   ${totalTies} (counted as losses)`);
  console.log(`Empirical P(win): ${overallEmp.toFixed(4)}`);
  console.log(`Theory P(win):    ${overallTheory.toFixed(4)} (160/221)`);
  console.log("===========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});