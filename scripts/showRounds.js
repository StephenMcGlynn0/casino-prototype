const hre = require("hardhat");
const fs = require("fs");

const deployment = JSON.parse(fs.readFileSync("./deployment.json"));

async function main() {
    const game = await hre.ethers.getContractAt(
        "HighLowGame",
        deployment.address
    );

    const totalRounds = await game.nextRoundId();

    console.log("Total rounds played:", totalRounds - 1n);

    for (let i = 1n; i < totalRounds; i++) {
        const r = await game.getRound(i);

        console.log(`\nRound ${i}`);
        console.log("Player:", r[0]);
        console.log("Current card:", Number(r[1]));
        console.log("Guess higher:", r[2]);
        console.log("Next card:", Number(r[8]));
        console.log("Push:", r[5]);
        console.log("Won:", r[4]);
        console.log("Commitment:", r[6]);
        console.log("Seed:", r[7].toString());
    }
}

main().catch(console.error);