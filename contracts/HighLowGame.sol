// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Provably-fair High–Low card game using commit–reveal
/// @notice Prototype only – no real money, just fairness demo
contract HighLowGame {
    enum RoundState {
        None,
        Committed,
        Guessed,
        Revealed
    }

    struct Round {
        address player;
        uint8 currentCard;
        bool guessHigher;
        bool playerGuessed;
        bool playerWon;
        bool push;
        bytes32 commitment;
        uint256 seed;
        uint8 nextCard;
        RoundState state;
    }

    address public dealer; // casino / operator address (deployer)
    uint256 public nextRoundId; // auto-incrementing round ID

    mapping(uint256 => Round) public rounds;

    event RoundCommitted(
        uint256 indexed roundId,
        address indexed player,
        uint8 currentCard
    );
    event PlayerGuessed(
        uint256 indexed roundId,
        address indexed player,
        bool guessHigher
    );
    event RoundRevealed(
        uint256 indexed roundId,
        uint8 nextCard,
        bool playerWon,
        bool push
    );

    modifier onlyDealer() {
        require(msg.sender == dealer, "Only dealer can call this");
        _;
    }

    modifier onlyPlayer(uint256 roundId) {
        require(
            msg.sender == rounds[roundId].player,
            "Only round player can call this"
        );
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
        require(
            currentCard >= 1 && currentCard <= 13,
            "Current card out of range"
        );
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
    function submitGuess(
        uint256 roundId,
        bool guessHigher
    ) external onlyPlayer(roundId) {
        Round storage r = rounds[roundId];
        require(
            r.state == RoundState.Committed,
            "Round not in committed state"
        );
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

        // Derive next card from the seed, matching a real 52-card deck with 1 card revealed:
        // - 3 cards remain of the same rank (tie)
        // - 4 cards remain for each other rank
        uint256 roll = uint256(computed) % 51;

        uint8 nextCard;
        if (roll < 3) {
            // 3/51 chance: tie (same rank)
            nextCard = r.currentCard;
        } else {
            // remaining 48 outcomes split into 12 ranks * 4 cards each
            uint256 idx = (roll - 3) / 4; // 0..11 => which "other rank"
            uint8 v = r.currentCard;

            // map idx to actual rank in 1..13 excluding v
            if (idx < (v - 1)) nextCard = uint8(idx + 1);
            else nextCard = uint8(idx + 2); // skip v
        }
        r.nextCard = nextCard;
        r.seed = seed;

        // Decide winner
        bool playerWon = false;
        bool push = false;

        if (nextCard == r.currentCard) {
            push = true;
        } else if (r.guessHigher) {
            playerWon = nextCard > r.currentCard;
        } else {
            playerWon = nextCard < r.currentCard;
        }

        r.playerWon = playerWon;
        r.push = push;
        r.state = RoundState.Revealed;

        emit RoundRevealed(roundId, nextCard, playerWon, push);
    }

    /// @notice Convenience view to get all important round info
    function getRound(
        uint256 roundId
    )
        external
        view
        returns (
            address player,
            uint8 currentCard,
            bool guessHigher,
            bool playerGuessed,
            bool playerWon,
            bool push,
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
            r.push,
            r.commitment,
            r.seed,
            r.nextCard,
            r.state
        );
    }
}
