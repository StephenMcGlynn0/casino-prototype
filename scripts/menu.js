const readline = require("readline");
const { spawn } = require("child_process");
const path = require("path");

let rl = createReadline();

function createReadline() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function closeReadline() {
    if (rl) {
        rl.close();
        rl = null;
    }
}

function reopenReadline() {
    if (!rl) {
        rl = createReadline();
    }
}

function runCommand(command, args = [], interactive = false, extraEnv = {}) {
    return new Promise((resolve) => {
        console.log(`\n> ${command} ${args.join(" ")}\n`);

        if (interactive) {
            closeReadline();
        }

        const child = spawn(command, args, {
            stdio: "inherit",
            shell: true,
            cwd: path.resolve(__dirname, ".."),
            env: { ...process.env, ...extraEnv },
        });

        child.on("close", () => {
            if (interactive) {
                reopenReadline();
            }
            resolve();
        });
    });
}

async function showMenu() {
    console.log("\n==============================");
    console.log(" High-Low Blockchain CLI Menu ");
    console.log("==============================");
    console.log("1. Compile contract");
    console.log("2. Deploy contract");
    console.log("3. Play game");
    console.log("4. Simulate games (on-chain)");
    console.log("5. Simulate games (off-chain)");
    console.log("6. Show rounds");
    console.log("7. Hash seed");
    console.log("8. Exit");
    console.log("==============================\n");

    const choice = (await ask("Choose an option: ")).trim();

    switch (choice) {
        case "1":
            await runCommand("npx", ["hardhat", "compile"]);
            break;

        case "2":
            await runCommand("npx", ["hardhat", "run", "scripts/deploy.js", "--network", "localhost"]);
            break;

        case "3":
            await runCommand(
                "npx",
                ["hardhat", "run", "scripts/playHighLow.js", "--network", "localhost"],
                true
            );
            break;

        case "4": {
            const total = (await ask("Number of games (default 50000): ")).trim();
            const totalGames = total || "50000";

            await runCommand(
                "npx",
                ["hardhat", "run", "scripts/simulateGames.js", "--network", "localhost"],
                false,
                { TOTAL_GAMES: totalGames }
            );
            break;
        }

        case "5": {
            const total = (await ask("Number of off-chain games (default 1000000): ")).trim();
            if (total) {
                await runCommand("node", ["scripts/simulateOffChain.js", total]);
            } else {
                await runCommand("node", ["scripts/simulateOffChain.js"]);
            }
            break;
        }

        case "6":
            await runCommand("npx", ["hardhat", "run", "scripts/showRounds.js", "--network", "localhost"]);
            break;

        case "7": {
            const seed = (await ask("Enter seed: ")).trim();
            if (seed) {
                await runCommand("node", ["scripts/hashSeed.js", seed]);
            } else {
                console.log("No seed entered.");
            }
            break;
        }

        case "8":
            console.log("Exiting...");
            closeReadline();
            process.exit(0);

        default:
            console.log("Invalid option.");
    }

    await showMenu();
}

showMenu().catch((err) => {
    console.error("Menu error:", err);
    closeReadline();
    process.exit(1);
});