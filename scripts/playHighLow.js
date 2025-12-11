// scripts/playHighLow.js
const hre = require("hardhat");
const readline = require("readline");
const crypto = require("crypto");
const fs = require("fs");

const deployment = JSON.parse(fs.readFileSync("./deployment.json"));
const contractAddress = deployment.address;

// Simple helper to ask a question in the console
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  // Get dealer and player from Hardhat accounts
  const [dealer, player] = await hre.ethers.getSigners();


  const game = await hre.ethers.getContractAt("HighLowGame", contractAddress);

  console.log("Dealer address:", dealer.address);
  console.log("Player address:", player.address);
  console.log("Using contract:", contractAddress);
  console.log("--------------------------------------------------");

  // Choose a random current card between 1 and 13
  const currentCard = Math.floor(Math.random() * 13) + 1;
  console.log(`Current card is: ${currentCard}`);

  // Generate a random 256-bit seed
  const seed = BigInt("0x" + crypto.randomBytes(32).toString("hex"));

  // Make the commitment hash for the seed
  const commitment = hre.ethers.keccak256(
    hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [seed])
  );

  // Dealer creates the round
  const createTx = await game
    .connect(dealer)
    .createRound(player.address, currentCard, commitment);
  await createTx.wait();

  // nextRoundId is the ID for the *next* round, so the current one is -1
  const roundId = (await game.nextRoundId()) - 1n;
  console.log(`Round ${roundId} created.`);

  // Ask the user for their guess
  const answerRaw = await askQuestion(
    "Will the next card be higher or lower? (h/l): "
  );
  const answer = answerRaw.trim().toLowerCase();
  const guessHigher = answer.startsWith("h");
  console.log(
    `You guessed: ${guessHigher ? "HIGHER" : "LOWER"} (based on ${currentCard})`
  );

  // Player submits the guess
  const guessTx = await game
    .connect(player)
    .submitGuess(roundId, guessHigher);
  await guessTx.wait();

  // Dealer reveals the seed and resolves the round
  const revealTx = await game.connect(dealer).revealSeed(roundId, seed);
  await revealTx.wait();

  // Fetch the round data
  const round = await game.getRound(roundId);

  const playerAddr = round[0];
  const current = Number(round[1]);
  const guessHigherOnChain = round[2];
  const playerGuessed = round[3];
  const playerWon = round[4];
  const commitmentOnChain = round[5];
  const seedOnChain = round[6];
  const nextCardOnChain = Number(round[7]);
  const state = round[8]; // 3 = Revealed

  console.log("--------------------------------------------------");
  console.log(`Round ${roundId} on-chain data:`);
  console.log(" Player:          ", playerAddr);
  console.log(" Current card:    ", current);
  console.log(" Guess is higher: ", guessHigherOnChain);
  console.log(" Player guessed:  ", playerGuessed);
  console.log(" Next card:       ", nextCardOnChain);
  console.log(" Player won:      ", playerWon);
  console.log(" State (3 = Revealed):", state.toString());
  console.log("--------------------------------------------------");

  // Fairness verification
  const recomputed = hre.ethers.keccak256(
    hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [seedOnChain])
  );

  console.log("Fairness check:");
  console.log(" Commitment on-chain: ", commitmentOnChain);
  console.log(" Recomputed commitment:", recomputed);
  console.log(
    " Commitment matches?: ",
    recomputed === commitmentOnChain ? "YES ✅" : "NO ❌"
  );

  const nextCardLocal = Number((BigInt(recomputed) % 13n) + 1n);
  console.log(" Recomputed next card:", nextCardLocal);
  console.log(" On-chain next card:  ", nextCardOnChain);
  console.log(
    " Card matches?:       ",
    nextCardLocal === nextCardOnChain ? "YES ✅" : "NO ❌"
  );

  console.log("--------------------------------------------------");
  if (playerWon) {
    console.log("🎉 You WON this round!");
  } else {
    console.log("💀 You LOST this round!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
