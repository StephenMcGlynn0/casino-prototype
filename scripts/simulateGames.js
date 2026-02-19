const hre = require("hardhat");
const crypto = require("crypto");

async function main() {
  const [dealer, player] = await hre.ethers.getSigners();

  const deployment = require("../deployment.json");
  const contractAddress = deployment.address;

  const game = await hre.ethers.getContractAt(
    "HighLowGame",
    contractAddress
  );

  const TOTAL_GAMES = 1000; // change to 10000 later

  let wins = 0;
  let losses = 0;
  let equalCards = 0;

  for (let i = 0; i < TOTAL_GAMES; i++) {
    const currentCard = Math.floor(Math.random() * 13) + 1;

    const seed = BigInt(
      "0x" + crypto.randomBytes(32).toString("hex")
    );

    const commitment = hre.ethers.keccak256(
      hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [seed]
      )
    );

    // Dealer creates round
    const createTx = await game
      .connect(dealer)
      .createRound(player.address, currentCard, commitment);
    await createTx.wait();

    const roundId = (await game.nextRoundId()) - 1n;

    // Random guess
    const guessHigher = Math.random() > 0.5;

    const guessTx = await game
      .connect(player)
      .submitGuess(roundId, guessHigher);
    await guessTx.wait();

    const revealTx = await game
      .connect(dealer)
      .revealSeed(roundId, seed);
    await revealTx.wait();

    const round = await game.getRound(roundId);

    const nextCard = Number(round[7]);
    const playerWon = round[4];

    if (nextCard === currentCard) {
      equalCards++;
    } else if (playerWon) {
      wins++;
    } else {
      losses++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Played ${i + 1} games...`);
    }
  }

  console.log("==================================");
  console.log(`Total games: ${TOTAL_GAMES}`);
  console.log(`Wins: ${wins}`);
  console.log(`Losses: ${losses}`);
  console.log(`Equal cards (auto loss): ${equalCards}`);
  console.log(
    `Win rate: ${(wins / (wins + losses) * 100).toFixed(2)}%`
  );
  console.log("==================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
