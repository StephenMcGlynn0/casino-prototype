const crypto = require("crypto");
const { ethers } = require("ethers");
const { exportToCSV } = require("./utils/exportCSV");

function theoreticalRawWinProb(v) {
  return (4 * Math.max(v - 1, 13 - v)) / 51;
}

function theoreticalConditionalWinProb(v) {
  return Math.max(v - 1, 13 - v) / 12;
}

function optimalGuessHigher(v) {
  return v <= 7;
}

function deriveNextCardLikeContract(currentCard, seed) {
  const computed = BigInt(seed);
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
    const seed = BigInt("0x" + seedBytes.toString("hex"));

    const nextCard = deriveNextCardLikeContract(currentCard, seed);
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

  console.log("\n================= 🎴 SIMULATION RESULTS =================");
  console.log(`Mode: Off-chain (fast simulation)`);
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
    const empiricalCond = (s.wins + s.losses)
      ? s.wins / (s.wins + s.losses)
      : 0;

    const theoryRaw = theoreticalRawWinProb(v);
    const theoryCond = theoreticalConditionalWinProb(v);

    const label = v.toString().padStart(2, " ");

    console.log(
      `${label} | Games=${s.total} | Wins=${s.wins} | Losses=${s.losses} | Pushes=${s.ties}`
    );
    console.log(
      `     Win Rate(Not including pushes): ${empiricalCond.toFixed(4)} (Optimal Rate ${theoryCond.toFixed(4)})`
    );
    console.log(
      `     Win Rate(Including pushes):  ${empiricalRaw.toFixed(4)} (Optimal Rate ${theoryRaw.toFixed(4)})\n`
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

  const pushRate = totalTies / (totalWins + totalLosses + totalTies);

  console.log("\n----------------- 📊 OVERALL -----------------\n");
  console.log(`Total Games:       ${totalWins + totalLosses + totalTies}`);
  console.log(`Wins:              ${totalWins}`);
  console.log(`Losses:            ${totalLosses}`);
  console.log(`Pushes:            ${totalTies}\n`);

  console.log(
    `Win Rate(Not including pushes): ${overallEmpCond.toFixed(4)} (Optimal Rate ${overallTheoryCond.toFixed(4)})`
  );
  console.log(
    `Win Rate(Including pushes):        ${overallEmpRaw.toFixed(4)} (Optimal Rate ${overallTheoryRaw.toFixed(4)})`
  );
  console.log(
    `Push Rate:           ${pushRate.toFixed(4)}`
  );

  const close =
    Math.abs(overallEmpCond - overallTheoryCond) < 0.01 &&
    Math.abs(overallEmpRaw - overallTheoryRaw) < 0.01;

  console.log(
    `\nStatus: ${close ? "✅ Matches theoretical expectations" : "⚠️ Deviates from theory"}`
  );
  console.log("================================================\n");

  const filename = `results_${Date.now()}.csv`;
  exportToCSV(stats, filename);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});