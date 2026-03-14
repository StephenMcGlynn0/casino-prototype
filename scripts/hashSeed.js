const { ethers } = require("ethers");

const seed = process.argv[2];

if (!seed) {
  console.log("Usage: node hashSeed.js <seed>");
  process.exit(1);
}

const hash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [seed])
);

console.log("Seed:       ", seed);
console.log("Keccak256:  ", hash);