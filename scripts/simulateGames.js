const hre = require("hardhat");
const crypto = require("crypto");
const fs = require("fs");

const deployment = JSON.parse(fs.readFileSync("./deployment.json"));
const contractAddress = deployment.address;

function theoreticalRawWinProb(v) {
  return (4 * Math.max(v - 1, 13 - v)) / 51;
}

function theoreticalConditionalWinProb(v) {
  return Math.max(v - 1, 13 - v) / 12;
}

// choose the larger side: higher if v<=7, lower if v>=8. At 7 either is same.
function optimalGuessHigher(v) {
  if (v <= 7) return true;  // guess higher
  return false;             // guess lower (v=8..13)
}

async function main() {
  const [dealer, player] = await hre.ethers.getSigners();
  const game = await hre.ethers.getContractAt("HighLowGame", contractAddress);

  const TOTAL_GAMES = 10;

  // stats[v] for v=1..13
  const stats = Array.from({ length: 14 }, () => ({
    total: 0,
    wins: 0,
    losses: 0,
    ties: 0,
  }));

  for (let i = 0; i < TOTAL_GAMES; i++) {
    const currentCard = Math.floor(Math.random() * 13) + 1;

    // seed + commitment
    const seed = BigInt("0x" + crypto.randomBytes(32).toString("hex"));
    const commitment = hre.ethers.keccak256(
      hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [seed])
    );

    // dealer creates round for player
    const createTx = await game
      .connect(dealer)
      .createRound(player.address, currentCard, commitment);
    await createTx.wait();

    const roundId = (await game.nextRoundId()) - 1n;

    // optimal guess for this upcard
    const guessHigher = optimalGuessHigher(currentCard);

    const guessTx = await game.connect(player).submitGuess(roundId, guessHigher);
    await guessTx.wait();

    const revealTx = await game.connect(dealer).revealSeed(roundId, seed);
    await revealTx.wait();

    const round = await game.getRound(roundId);

    const nextCard = Number(round[8]);
    const playerWon = round[4];

    // record stats
    stats[currentCard].total++;
    const push = round[5];

    if (push) {
      stats[currentCard].ties++;
    } else if (playerWon) {
      stats[currentCard].wins++;
    } else {
      stats[currentCard].losses++;
    }

    if ((i + 1) % 1000 === 0) console.log(`Played ${i + 1}/${TOTAL_GAMES}...`);
  }

  // Output results
  console.log("\n================= RESULTS =================");
  console.log(`Contract: ${contractAddress}`);
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
      `Upcard ${v.toString().padStart(2, " ")} | ` +
      `N=${s.total.toString().padStart(5, " ")} | ` +
      `W=${s.wins.toString().padStart(5, " ")} | ` +
      `L=${s.losses.toString().padStart(5, " ")} | ` +
      `T=${s.ties.toString().padStart(5, " ")} | ` +
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});