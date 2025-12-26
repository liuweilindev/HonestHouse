# HonestHouse

HonestHouse is a two player, fully homomorphic encrypted contribution game built on Zama FHEVM. Players submit
encrypted coin amounts each round, the higher contribution earns encrypted points, and balances stay private on-chain.

## Project Overview

HonestHouse demonstrates how to build a verifiable, privacy preserving game on Ethereum using FHE. The game keeps
player contributions, balances, and scores encrypted while still enforcing rules such as balance checks and winner
selection. Only non-sensitive metadata like player addresses and game status is public.

## Problems Solved

- Prevents copycat bidding and retaliation by hiding contributions.
- Keeps balances and scores confidential while remaining verifiable.
- Removes the need for a trusted off-chain judge or server.
- Lets anyone discover open games without leaking player strategy.

## Advantages

- On-chain privacy via FHE for all sensitive values.
- Deterministic and auditable rule enforcement.
- Simple two-player flow that is easy to reason about.
- Clear separation of encrypted state and public metadata.
- Frontend workflow uses Zama relayer for encryption and proofs, no mock data.

## Game Rules and Flow

1. A player creates a game and takes seat 1.
2. Another player joins the open game and takes seat 2.
3. Either player starts the game once both seats are filled.
4. Each round, both players submit an encrypted coin amount.
5. A player can only spend up to their remaining coins; if they try to spend more, the contract spends 0.
6. When both have submitted, the contract compares encrypted values:
   - Higher contribution earns +10 encrypted score.
   - Ties yield no points.
7. Contributions reset, the round counter increments, and play continues.

Each player starts with 100 encrypted coins. The game currently has no explicit end condition.

## Privacy and Encryption Model

- Balances, scores, and last contributions are stored as encrypted `euint32`.
- The contract compares encrypted values with FHE operations, never decrypting on-chain.
- Access control grants each player the ability to decrypt their own encrypted fields.
- The frontend uses the Zama relayer to encrypt inputs, generate proofs, and decrypt permitted values.

## Architecture

- Smart contract in `contracts/HonestHouse.sol` implements the game rules.
- Hardhat tasks and tests validate local behavior.
- Deployment script in `deploy/deploy.ts` targets local and Sepolia networks.
- Frontend in `src/` consumes the on-chain ABI and relayer workflows.

## Technology Stack

- Solidity 0.8.27
- Hardhat + hardhat-deploy
- Zama FHEVM libraries and config
- TypeScript
- React + Vite
- viem for contract reads
- ethers v6 for contract writes
- wagmi + RainbowKit for wallet connections
- Plain CSS (no Tailwind)

## Repository Layout

```
contracts/        Smart contracts
deploy/           Deployment scripts
deployments/      Network deployments and ABIs
tasks/            Hardhat tasks
test/             Test suite
src/              Frontend application
```

## Smart Contract Interface

Main contract: `contracts/HonestHouse.sol`

Key functions:

- `createGame()` -> Creates a game and seats the creator.
- `joinGame(gameId)` -> Joins an open game.
- `startGame(gameId)` -> Starts a full game.
- `submitCoins(gameId, encryptedCoins, inputProof)` -> Submits encrypted coins for the round.
- `getGameSummary(gameId)` -> Public status and players.
- `getAllGames()` -> Summary list of all games.
- `getPlayerState(gameId, player)` -> Encrypted coins and score for a player.
- `getRoundStatus(gameId)` -> Round metadata and encrypted contributions.

Notes:

- View functions accept explicit player addresses and do not use `msg.sender`.
- Events: `GameCreated`, `PlayerJoined`, `GameStarted`, `CoinsSubmitted`, `RoundResolved`.

## Frontend Integration Notes

- The frontend must consume the ABI generated in `deployments/sepolia/HonestHouse.json`.
- Read calls use viem; write calls use ethers.
- The frontend does not use environment variables, local storage, or localhost networks.
- The frontend does not import files from the repository root.

## Development and Usage

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

Root dependencies:

```bash
npm install
```

Frontend dependencies:

```bash
cd src
npm install
```

### Configure Environment

Create a root `.env` file for Hardhat deployments:

```
INFURA_API_KEY=
PRIVATE_KEY=
ETHERSCAN_API_KEY=   # optional
REPORT_GAS=          # optional
```

Notes:

- `PRIVATE_KEY` is required for Sepolia deployments.
- Do not use a mnemonic.

### Compile

```bash
npm run compile
```

### Test and Tasks

```bash
npm run test
```

If you use Hardhat tasks, run them from the root, for example:

```bash
npx hardhat accounts
```

### Local Node Deployment

Start a local node:

```bash
npx hardhat node
```

Deploy to the local node:

```bash
npx hardhat deploy --network localhost
```

This local node is for contract testing only. The frontend targets Sepolia.

### Sepolia Deployment

```bash
npx hardhat deploy --network sepolia
```

Optional verification:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

After deployment, copy the ABI from `deployments/sepolia/HonestHouse.json` into the frontend contract config.

### Frontend Development

```bash
cd src
npm run dev
```

## Limitations

- No explicit game end condition or settlement logic yet.
- No timeout or penalty if a player never submits.
- Ties do not award points.
- Only two players are supported.
- UI relies on relayer availability for encryption and decryption.

## Future Roadmap

- Add a clear end condition, final score reveal, and match summary.
- Add inactivity timeouts with safe recovery flows.
- Add match history and per-round reveal options after completion.
- Improve game discovery and filtering in the UI.
- Support multiple simultaneous games and optional room metadata.
- Add contract upgrade plan or migration path for future versions.

## License

BSD-3-Clause-Clear. See `LICENSE`.
