// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const HighLowGame = await hre.ethers.getContractFactory("HighLowGame");
  const game = await HighLowGame.deploy();

  await game.waitForDeployment();

  const address = await game.getAddress();

  console.log("HighLowGame deployed to:", address);

  // Write to JSON file that your game script will read
  const output = {
    address,
    network: "localhost",
    timestamp: Date.now()
  };

  fs.writeFileSync("./deployment.json", JSON.stringify(output, null, 2));

  console.log("Saved deployment.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
