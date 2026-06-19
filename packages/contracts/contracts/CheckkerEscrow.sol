// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title CheckkerEscrow
 * @notice Escrow contract for Checkker chess game betting on BSC.
 *         Both players deposit BNB before a game starts. The server (referee)
 *         reports the result and the contract auto-pays the winner minus a house cut.
 */
contract CheckkerEscrow is ReentrancyGuard, Ownable {
    using Address for address payable;

    address public referee;
    address public houseWallet;
    uint256 public houseCutBps = 1000; // 10% = 1000 basis points

    enum GameStatus {
        WaitingForDeposits,
        Active,
        Completed,
        Cancelled,
        Drawn
    }

    uint256 public constant DEPOSIT_DEADLINE_SECONDS = 600; // 10 minutes

    struct Game {
        bytes32 gameId;
        address white;
        address black;
        uint256 betAmount;       // required bet per player (in wei)
        uint256 whiteDeposit;
        uint256 blackDeposit;
        GameStatus status;
        address winner;
        uint256 createdAt;
        uint256 depositDeadline; // timestamp after which deposits are no longer accepted
    }

    mapping(bytes32 => Game) public games;

    // ── Events ──────────────────────────────────────────────────────────

    event GameCreated(bytes32 indexed gameId, address white, address black, uint256 betAmount);
    event DepositMade(bytes32 indexed gameId, address player, uint256 amount);
    event GameStarted(bytes32 indexed gameId);
    event GameResolved(bytes32 indexed gameId, address winner, uint256 payout, uint256 houseCut);
    event GameDrawn(bytes32 indexed gameId, uint256 refundEach);
    event GameCancelled(bytes32 indexed gameId);
    event RefundIssued(bytes32 indexed gameId, address player, uint256 amount);

    // ── Modifiers ───────────────────────────────────────────────────────

    modifier onlyReferee() {
        require(msg.sender == referee, "Not referee");
        _;
    }

    modifier gameExists(bytes32 _gameId) {
        require(games[_gameId].createdAt > 0, "Game not found");
        _;
    }

    // ── Constructor ─────────────────────────────────────────────────────

    constructor(address _referee, address _houseWallet) Ownable(msg.sender) {
        require(_referee != address(0), "Invalid referee");
        require(_houseWallet != address(0), "Invalid house wallet");
        referee = _referee;
        houseWallet = _houseWallet;
    }

    // ── Core Functions ──────────────────────────────────────────────────

    /**
     * @notice Server creates a game entry once matchmaking completes.
     * @param _gameId Unique game identifier (UUID as bytes32)
     * @param _white White player's wallet address
     * @param _black Black player's wallet address
     * @param _betAmount Required bet per player in wei
     */
    function createGame(
        bytes32 _gameId,
        address _white,
        address _black,
        uint256 _betAmount
    ) external onlyReferee {
        require(games[_gameId].createdAt == 0, "Game already exists");
        require(_white != address(0) && _black != address(0), "Invalid player");
        require(_white != _black, "Same player");
        require(_betAmount > 0, "Bet must be > 0");

        games[_gameId] = Game({
            gameId: _gameId,
            white: _white,
            black: _black,
            betAmount: _betAmount,
            whiteDeposit: 0,
            blackDeposit: 0,
            status: GameStatus.WaitingForDeposits,
            winner: address(0),
            createdAt: block.timestamp,
            depositDeadline: block.timestamp + DEPOSIT_DEADLINE_SECONDS
        });

        emit GameCreated(_gameId, _white, _black, _betAmount);
    }

    /**
     * @notice Player deposits their bet into escrow.
     * @param _gameId The game to deposit for
     */
    function deposit(bytes32 _gameId) external payable gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.WaitingForDeposits, "Not accepting deposits");
        require(block.timestamp <= game.depositDeadline, "Deposit deadline passed");
        require(msg.value == game.betAmount, "Wrong deposit amount");

        if (msg.sender == game.white) {
            require(game.whiteDeposit == 0, "Already deposited");
            game.whiteDeposit = msg.value;
        } else if (msg.sender == game.black) {
            require(game.blackDeposit == 0, "Already deposited");
            game.blackDeposit = msg.value;
        } else {
            revert("Not a player in this game");
        }

        emit DepositMade(_gameId, msg.sender, msg.value);

        // If both deposited, game is active
        if (game.whiteDeposit > 0 && game.blackDeposit > 0) {
            game.status = GameStatus.Active;
            emit GameStarted(_gameId);
        }
    }

    /**
     * @notice Referee reports the winner. Contract pays out automatically.
     * @param _gameId The game to resolve
     * @param _winner The winning player's address
     */
    function reportWinner(bytes32 _gameId, address _winner) external onlyReferee gameExists(_gameId) nonReentrant {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(_winner == game.white || _winner == game.black, "Not a player");

        game.status = GameStatus.Completed;
        game.winner = _winner;

        uint256 totalPot = game.whiteDeposit + game.blackDeposit;
        uint256 cut = (totalPot * houseCutBps) / 10000;
        uint256 payout = totalPot - cut;

        // Pay the winner
        payable(_winner).sendValue(payout);

        // Pay the house
        if (cut > 0) {
            payable(houseWallet).sendValue(cut);
        }

        emit GameResolved(_gameId, _winner, payout, cut);
    }

    /**
     * @notice Referee reports a draw. Both players get full refund.
     * @param _gameId The game to resolve as draw
     */
    function reportDraw(bytes32 _gameId) external onlyReferee gameExists(_gameId) nonReentrant {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");

        game.status = GameStatus.Drawn;

        uint256 whiteRefund = game.whiteDeposit;
        uint256 blackRefund = game.blackDeposit;

        if (whiteRefund > 0) {
            payable(game.white).sendValue(whiteRefund);
        }
        if (blackRefund > 0) {
            payable(game.black).sendValue(blackRefund);
        }

        emit GameDrawn(_gameId, whiteRefund);
    }

    /**
     * @notice Referee cancels a game (e.g., deposit timeout). Refunds all deposits.
     * @param _gameId The game to cancel
     */
    function cancelGame(bytes32 _gameId) external onlyReferee gameExists(_gameId) nonReentrant {
        Game storage game = games[_gameId];
        require(
            game.status == GameStatus.WaitingForDeposits || game.status == GameStatus.Active,
            "Cannot cancel"
        );

        game.status = GameStatus.Cancelled;

        if (game.whiteDeposit > 0) {
            uint256 refund = game.whiteDeposit;
            game.whiteDeposit = 0;
            payable(game.white).sendValue(refund);
            emit RefundIssued(_gameId, game.white, refund);
        }
        if (game.blackDeposit > 0) {
            uint256 refund = game.blackDeposit;
            game.blackDeposit = 0;
            payable(game.black).sendValue(refund);
            emit RefundIssued(_gameId, game.black, refund);
        }

        emit GameCancelled(_gameId);
    }

    /**
     * @notice Player reclaims their deposit after the deadline if the game
     *         hasn't started. Protects against server unavailability where
     *         the referee cannot call cancelGame.
     * @param _gameId The game to reclaim from
     */
    function claimRefundAfterDeadline(bytes32 _gameId) external nonReentrant gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.WaitingForDeposits, "Game already active or resolved");
        require(block.timestamp > game.depositDeadline, "Deadline not yet passed");

        uint256 refund = 0;
        if (msg.sender == game.white && game.whiteDeposit > 0) {
            refund = game.whiteDeposit;
            game.whiteDeposit = 0;
        } else if (msg.sender == game.black && game.blackDeposit > 0) {
            refund = game.blackDeposit;
            game.blackDeposit = 0;
        } else {
            revert("No deposit to reclaim");
        }

        payable(msg.sender).sendValue(refund);
        emit RefundIssued(_gameId, msg.sender, refund);

        // If both deposits have been reclaimed, mark the game cancelled
        if (game.whiteDeposit == 0 && game.blackDeposit == 0) {
            game.status = GameStatus.Cancelled;
            emit GameCancelled(_gameId);
        }
    }

    // ── Admin Functions ─────────────────────────────────────────────────

    function setReferee(address _referee) external onlyOwner {
        require(_referee != address(0), "Invalid referee");
        referee = _referee;
    }

    function setHouseCutBps(uint256 _bps) external onlyOwner {
        require(_bps <= 2000, "Cut too high"); // max 20%
        houseCutBps = _bps;
    }

    function setHouseWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        houseWallet = _wallet;
    }

    // ── View Functions ──────────────────────────────────────────────────

    function getGame(bytes32 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function isGameReady(bytes32 _gameId) external view returns (bool) {
        Game storage game = games[_gameId];
        return game.status == GameStatus.Active;
    }

    function getGameStatus(bytes32 _gameId) external view returns (GameStatus) {
        return games[_gameId].status;
    }
}
