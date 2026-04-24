# 🎰 Casino with Blockchain Technology for Provability and Fairness

Final Year Project – BSc (Hons) Computing  
Stephen McGlynn  

---

## 📌 Project Overview

This project demonstrates how blockchain technology can be used to provide **provably fair gameplay** in online gambling systems.

A High-Low card game is implemented using a Solidity smart contract, where players guess whether the next card will be higher or lower than the current one.

The system removes the need to trust a central authority by allowing **independent verification of fairness** using cryptographic techniques.

---

## ⚙️ How It Works (Commit–Reveal)

The system uses a **commit–reveal scheme**:

1. A secret seed is generated off-chain.
2. A hash of the seed is stored on-chain as the commitment.
3. The player makes a guess: higher or lower.
4. The seed is revealed.
5. The smart contract verifies that the revealed seed matches the commitment.
6. The next card is derived deterministically from the revealed seed.
7. The result is stored and can be independently verified.

---

## 🧠 Fairness Model

- Uses `keccak256` hashing for commitments.
- Ensures outcomes are fixed **before player input**.
- Prevents the dealer/operator from changing the seed after the player guesses.
- Allows the result to be verified using stored round data.

Card probabilities replicate a real 52-card deck after one card has already been revealed:

- 3 outcomes represent a tie/push because three cards of the same rank remain.
- 48 outcomes represent the other twelve ranks, with four cards for each rank.
- The current card rank is skipped when mapping the result.

---

## 🛠️ Technologies Used

- Solidity
- Hardhat
- Node.js
- Ethers.js
- JavaScript
- Local Ethereum-compatible blockchain
- CSV export for statistical analysis
- Excel for visualising simulation results

---

## 📂 Project Structure

```text
casino-prototype/
│
├── contracts/
│   └── HighLowGame.sol
│
├── scripts/
│   ├── menu.js
│   ├── deploy.js
│   ├── playHighLow.js
│   ├── simulateGames.js
│   ├── simulateOffChain.js
│   ├── simulateOffChainBiased.js
│   ├── showRounds.js
│   ├── hashSeed.js
│   └── utils/
│       └── exportCSV.js
│
├── scripts/output/
│   └── CSV results
│
├── hardhat.config.js
├── package.json
├── deployment.json
└── README.md
```

---

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/StephenMcGlynn0/casino-prototype.git
cd casino-prototype
```

Install dependencies:

```bash
npm install
```

---

## ▶️ Running the Project

Open one terminal and start the local Hardhat blockchain(this must be kept open, do not close):

```bash
npx hardhat node
```

Open a second terminal and run the project menu:

```bash
node scripts/menu.js
```

---

## 📋 Menu Options

```text
==============================
 High-Low Blockchain CLI Menu
==============================
1. Compile contract
2. Deploy contract
3. Play game
4. Simulate games (on-chain)
5. Simulate games (off-chain)
6. Simulate games (biased)
7. Show rounds
8. Hash seed
9. Exit
==============================
```

---

## 🔨 Compile the Contract

Compile the Solidity smart contract:

```bash
npx hardhat compile
```

Or choose option `1` from the menu.

---

## 🚀 Deploy the Contract

Deploy the contract to the local Hardhat network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Or choose option `2` from the menu.

This creates or updates `deployment.json` with the deployed contract address.

---

## 🎮 Play One Game

Run:

```bash
npx hardhat run scripts/playHighLow.js --network localhost
```

Or choose option `3` from the menu.

This will:

- Generate a current card.
- Generate a secret seed.
- Store the seed commitment on-chain.
- Ask the player to guess higher or lower.
- Reveal the seed.
- Verify the commitment.
- Derive the next card.
- Display whether the player won, lost, or pushed.

---

## 📊 Simulations

### On-Chain Simulation

Run:

```bash
npx hardhat run scripts/simulateGames.js --network localhost
```

Or choose option `4` from the menu.

This runs games through the deployed smart contract. It is slower because each game uses blockchain transactions.

---

### Off-Chain Simulation

Run:

```bash
node scripts/simulateOffChain.js 1000000
```

Or choose option `5` from the menu.

This replicates the same game logic off-chain, allowing large numbers of games to be simulated quickly.

---

### Biased Simulation

Run:

```bash
node scripts/simulateOffChainBiased.js 1000000
```

Or choose option `6` from the menu.

This version deliberately flips a small percentage of winning outcomes into losses. It is used to demonstrate how biased behaviour can be detected statistically.

---

## 📈 CSV Output

Simulation results are exported to:

```text
scripts/output/
```

The exported CSV files can be opened in Excel to compare:

- Theoretical win probabilities.
- Simulated win probabilities.
- Fair vs biased outcomes.
- Deviation from expected probability.

---

## ✅ Fairness Verification

For each completed round, fairness can be checked by:

1. Reading the stored commitment.
2. Reading the revealed seed.
3. Recomputing the hash of the revealed seed.
4. Comparing the recomputed hash with the stored commitment.
5. Recomputing the next card from the seed.
6. Confirming that the recomputed card matches the stored result.

This means the result can be verified independently.

---

## 🧪 Key Features

- Solidity smart contract for game logic.
- Commit–reveal fairness mechanism.
- Deterministic card generation.
- Local blockchain deployment.
- Command-line menu interface.
- On-chain simulation.
- Fast off-chain simulation.
- Biased simulation for comparison.
- CSV export for statistical analysis.
- Round inspection and verification.

---

## ⚠️ Disclaimer

This project is a prototype for academic purposes only.

- No real money is used.
- It is not a production gambling system.
- It is designed to demonstrate blockchain-based fairness concepts.

---

## 🔮 Future Work

Possible future improvements include:

- Deploying to a public Ethereum testnet.
- Building a web-based frontend.
- Adding MetaMask integration.
- Implementing a Verifiable Random Function (VRF).
- Supporting multiple game types.
- Improving usability and performance.
- Adding more automated tests.

---

## 👨‍🎓 Author

Stephen McGlynn  
BSc (Hons) Computing  
Atlantic Technological University
