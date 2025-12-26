// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract HonestHouse is ZamaEthereumConfig {
    struct PlayerState {
        address account;
        euint32 coins;
        euint32 score;
        euint32 lastContribution;
        bool hasSubmitted;
        bool joined;
    }

    struct Game {
        uint256 id;
        PlayerState[2] players;
        bool started;
        bool finished;
        uint8 currentRound;
    }

    struct GameSummary {
        uint256 gameId;
        address[2] players;
        bool started;
        bool finished;
        uint8 round;
    }

    uint256 public nextGameId = 1;
    mapping(uint256 => Game) private games;
    uint256[] private gameIds;

    event GameCreated(uint256 indexed gameId, address indexed creator);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameStarted(uint256 indexed gameId);
    event CoinsSubmitted(uint256 indexed gameId, address indexed player, euint32 encryptedAmount);
    event RoundResolved(uint256 indexed gameId, uint8 round);

    uint32 private constant INITIAL_COINS = 100;
    uint32 private constant ROUND_REWARD = 10;

    function createGame() external returns (uint256 gameId) {
        gameId = nextGameId++;
        Game storage game = games[gameId];
        game.id = gameId;
        game.currentRound = 1;

        _seatPlayer(game.players[0], msg.sender);

        gameIds.push(gameId);

        emit GameCreated(gameId, msg.sender);
    }

    function joinGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");
        require(!game.started, "Game already started");
        require(!game.finished, "Game finished");
        require(!_isPlayer(game, msg.sender), "Already in game");
        require(!game.players[1].joined, "Game full");

        _seatPlayer(game.players[1], msg.sender);

        emit PlayerJoined(gameId, msg.sender);
    }

    function startGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");
        require(!game.started, "Game already started");
        require(!game.finished, "Game finished");
        require(game.players[0].joined && game.players[1].joined, "Need two players");
        require(msg.sender == game.players[0].account || msg.sender == game.players[1].account, "Not a player");

        game.started = true;
        game.finished = false;
        game.currentRound = 1;
        game.players[0].hasSubmitted = false;
        game.players[1].hasSubmitted = false;
        game.players[0].lastContribution = FHE.asEuint32(0);
        game.players[1].lastContribution = FHE.asEuint32(0);

        FHE.allowThis(game.players[0].lastContribution);
        FHE.allowThis(game.players[1].lastContribution);
        FHE.allow(game.players[0].lastContribution, game.players[0].account);
        FHE.allow(game.players[1].lastContribution, game.players[1].account);

        emit GameStarted(gameId);
    }

    function submitCoins(uint256 gameId, externalEuint32 encryptedCoins, bytes calldata inputProof) external {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");
        require(game.started, "Game not started");
        require(!game.finished, "Game finished");

        uint256 playerIndex = _requirePlayerIndex(game, msg.sender);
        PlayerState storage player = game.players[playerIndex];

        euint32 requested = FHE.fromExternal(encryptedCoins, inputProof);
        ebool canSpend = FHE.le(requested, player.coins);
        euint32 spendAmount = FHE.select(canSpend, requested, FHE.asEuint32(0));

        player.coins = FHE.sub(player.coins, spendAmount);
        player.lastContribution = spendAmount;
        player.hasSubmitted = true;

        FHE.allowThis(player.coins);
        FHE.allow(player.coins, player.account);
        FHE.allowThis(player.lastContribution);
        FHE.allow(player.lastContribution, player.account);

        emit CoinsSubmitted(gameId, player.account, spendAmount);

        if (game.players[0].hasSubmitted && game.players[1].hasSubmitted) {
            _resolveRound(game);
        }
    }

    function getGameSummary(uint256 gameId) external view returns (GameSummary memory summary) {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");

        summary = GameSummary({
            gameId: game.id,
            players: [game.players[0].account, game.players[1].account],
            started: game.started,
            finished: game.finished,
            round: game.currentRound
        });
    }

    function getAllGames() external view returns (GameSummary[] memory summaries) {
        summaries = new GameSummary[](gameIds.length);
        for (uint256 i = 0; i < gameIds.length; i++) {
            Game storage game = games[gameIds[i]];
            summaries[i] = GameSummary({
                gameId: game.id,
                players: [game.players[0].account, game.players[1].account],
                started: game.started,
                finished: game.finished,
                round: game.currentRound
            });
        }
    }

    function getPlayerState(uint256 gameId, address player)
        external
        view
        returns (euint32 coins, euint32 score, bool hasSubmitted, uint8 seat)
    {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");

        seat = _playerIndex(game, player);
        require(seat < 2, "Not in game");

        PlayerState storage state = game.players[seat];
        coins = state.coins;
        score = state.score;
        hasSubmitted = state.hasSubmitted;
    }

    function getRoundStatus(uint256 gameId)
        external
        view
        returns (
            uint8 round,
            bool started,
            bool finished,
            bool firstSubmitted,
            bool secondSubmitted,
            euint32 firstContribution,
            euint32 secondContribution
        )
    {
        Game storage game = games[gameId];
        require(game.id != 0, "Game not found");

        round = game.currentRound;
        started = game.started;
        finished = game.finished;
        firstSubmitted = game.players[0].hasSubmitted;
        secondSubmitted = game.players[1].hasSubmitted;
        firstContribution = game.players[0].lastContribution;
        secondContribution = game.players[1].lastContribution;
    }

    function _resolveRound(Game storage game) internal {
        ebool firstBeatsSecond = FHE.gt(game.players[0].lastContribution, game.players[1].lastContribution);
        ebool secondBeatsFirst = FHE.gt(game.players[1].lastContribution, game.players[0].lastContribution);

        euint32 reward = FHE.asEuint32(ROUND_REWARD);
        euint32 zeroValue = FHE.asEuint32(0);

        game.players[0].score = FHE.add(game.players[0].score, FHE.select(firstBeatsSecond, reward, zeroValue));
        game.players[1].score = FHE.add(game.players[1].score, FHE.select(secondBeatsFirst, reward, zeroValue));

        FHE.allowThis(game.players[0].score);
        FHE.allowThis(game.players[1].score);
        FHE.allow(game.players[0].score, game.players[0].account);
        FHE.allow(game.players[1].score, game.players[1].account);

        game.players[0].lastContribution = zeroValue;
        game.players[1].lastContribution = zeroValue;
        game.players[0].hasSubmitted = false;
        game.players[1].hasSubmitted = false;
        game.currentRound += 1;

        FHE.allowThis(game.players[0].lastContribution);
        FHE.allowThis(game.players[1].lastContribution);
        FHE.allow(game.players[0].lastContribution, game.players[0].account);
        FHE.allow(game.players[1].lastContribution, game.players[1].account);

        emit RoundResolved(game.id, game.currentRound - 1);
    }

    function _seatPlayer(PlayerState storage player, address account) internal {
        player.account = account;
        player.coins = FHE.asEuint32(INITIAL_COINS);
        player.score = FHE.asEuint32(0);
        player.lastContribution = FHE.asEuint32(0);
        player.hasSubmitted = false;
        player.joined = true;

        FHE.allowThis(player.coins);
        FHE.allow(player.coins, account);
        FHE.allowThis(player.score);
        FHE.allow(player.score, account);
        FHE.allowThis(player.lastContribution);
        FHE.allow(player.lastContribution, account);
    }

    function _isPlayer(Game storage game, address account) internal view returns (bool) {
        return (game.players[0].account == account && game.players[0].joined)
            || (game.players[1].account == account && game.players[1].joined);
    }

    function _playerIndex(Game storage game, address account) internal view returns (uint8) {
        if (game.players[0].account == account && game.players[0].joined) {
            return 0;
        }
        if (game.players[1].account == account && game.players[1].joined) {
            return 1;
        }
        return type(uint8).max;
    }

    function _requirePlayerIndex(Game storage game, address account) internal view returns (uint8) {
        uint8 index = _playerIndex(game, account);
        require(index < 2, "Not in game");
        return index;
    }
}
