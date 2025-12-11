// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Provably-fair High–Low card game using commit–reveal
/// @notice Prototype only – no real money, just fairness demo
contract HighLowGame {
    enum RoundState { None, Committed, Guessed, Revealed }

    struct Round {
        address player;          // who is playing this round
        uint8 currentCard;       // visible card (1–13)
        bool guessHigher;        // player's guess
        bool playerGuessed;      // has the player guessed yet?
        bool playerWon;          // result after reveal
        bytes32 commitment;      // hash of secret seed
        uint256 seed;            // revealed seed (0 until reveal)
        uint8 nextCard;          // derived next card (1–13)
        RoundState state;        // lifecycle state
    }

    address public dealer;       // casino / operator address (deployer)
    uint256 public nextRoundId;  // auto-incrementing round ID

    mapping(uint256 => Round) public rounds;

    event RoundCommitted(uint256 indexed roundId, address indexed player, uint8 currentCard);
    event PlayerGuessed(uint256 indexed roundId, address indexed player, bool guessHigher);
    event RoundRevealed(uint256 indexed roundId, uint8 nextCard, bool playerWon);

    modifier onlyDealer() {
        require(msg.sender == dealer, "Only dealer can call this");
        _;
    }

    modifier onlyPlayer(uint256 roundId) {
        require(msg.sender == rounds[roundId].player, "Only round player can call this");
        _;
    }

    constructor() {
        dealer = msg.sender;
        nextRoundId = 1;
    }

    /// @notice Dealer creates a new round for a specific player, with a committed seed
    /// @param player address of the player
    /// @param currentCard visible card (1–13)
    /// @param commitment keccak256 hash of the secret seed
    function createRound(
        address player,
        uint8 currentCard,
        bytes32 commitment
    ) external onlyDealer returns (uint256 roundId) {
        require(currentCard >= 1 && currentCard <= 13, "Current card out of range");
        require(player != address(0), "Invalid player address");
        require(commitment != bytes32(0), "Invalid commitment");

        roundId = nextRoundId;
        nextRoundId++;

        Round storage r = rounds[roundId];
        r.player = player;
        r.currentCard = currentCard;
        r.commitment = commitment;
        r.state = RoundState.Committed;

        emit RoundCommitted(roundId, player, currentCard);
    }

    /// @notice Player submits their guess: will the next card be higher than the current?
    function submitGuess(uint256 roundId, bool guessHigher)
        external
        onlyPlayer(roundId)
    {
        Round storage r = rounds[roundId];
        require(r.state == RoundState.Committed, "Round not in committed state");
        require(!r.playerGuessed, "Already guessed");

        r.guessHigher = guessHigher;
        r.playerGuessed = true;
        r.state = RoundState.Guessed;

        emit PlayerGuessed(roundId, msg.sender, guessHigher);
    }

    /// @notice Dealer reveals the seed; contract verifies commitment and resolves round
    /// @param roundId ID of the round
    /// @param seed original secret seed used to create the commitment
    function revealSeed(uint256 roundId, uint256 seed) external onlyDealer {
        Round storage r = rounds[roundId];
        require(r.state == RoundState.Guessed, "Round must be guessed first");
        require(r.seed == 0, "Seed already revealed");
        require(seed != 0, "Seed cannot be zero");

        // Check commitment
        bytes32 computed = keccak256(abi.encodePacked(seed));
        require(computed == r.commitment, "Commitment mismatch");

        // Derive next card from the seed
        uint8 nextCard = uint8((uint256(computed) % 13) + 1);
        r.nextCard = nextCard;
        r.seed = seed;

        // Decide winner
        bool playerWon;
        if (nextCard == r.currentCard) {
            // For simplicity, equal card = automatic loss
            playerWon = false;
        } else if (r.guessHigher) {
            playerWon = nextCard > r.currentCard;
        } else {
            playerWon = nextCard < r.currentCard;
        }
        r.playerWon = playerWon;
        r.state = RoundState.Revealed;

        emit RoundRevealed(roundId, nextCard, playerWon);
    }

    /// @notice Convenience view to get all important round info
    function getRound(uint256 roundId)
        external
        view
        returns (
            address player,
            uint8 currentCard,
            bool guessHigher,
            bool playerGuessed,
            bool playerWon,
            bytes32 commitment,
            uint256 seed,
            uint8 nextCard,
            RoundState state
        )
    {
        Round storage r = rounds[roundId];
        return (
            r.player,
            r.currentCard,
            r.guessHigher,
            r.playerGuessed,
            r.playerWon,
            r.commitment,
            r.seed,
            r.nextCard,
            r.state
        );
    }
}
