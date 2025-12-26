import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the HonestHouse address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get("HonestHouse");
  console.log("HonestHouse address is " + deployment.address);
});

task("task:create-game", "Creates a new game and returns the id").setAction(async function (_args, hre) {
  const { ethers, deployments } = hre;
  const deployment = await deployments.get("HonestHouse");
  const contract = await ethers.getContractAt("HonestHouse", deployment.address);
  const tx = await contract.createGame();
  const receipt = await tx.wait();
  const gameCreated = receipt?.logs?.find((log: any) => log.fragment?.name === "GameCreated");
  console.log("tx:", tx.hash);
  if (gameCreated && gameCreated.args) {
    console.log("Game id:", gameCreated.args.gameId.toString());
  }
});

task("task:join-game", "Join an existing game")
  .addParam("game", "Game id")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = await deployments.get("HonestHouse");
    const contract = await ethers.getContractAt("HonestHouse", deployment.address);
    const tx = await contract.joinGame(taskArguments.game);
    await tx.wait();
    console.log(`Joined game ${taskArguments.game} with tx ${tx.hash}`);
  });

task("task:start-game", "Start a game that has two players")
  .addParam("game", "Game id")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = await deployments.get("HonestHouse");
    const contract = await ethers.getContractAt("HonestHouse", deployment.address);
    const tx = await contract.startGame(taskArguments.game);
    await tx.wait();
    console.log(`Started game ${taskArguments.game} with tx ${tx.hash}`);
  });

task("task:submit", "Submit encrypted coins for the round")
  .addParam("game", "Game id")
  .addParam("value", "Coins to submit (integer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    const amount = parseInt(taskArguments.value);
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error("value must be a non-negative integer");
    }

    await fhevm.initializeCLIApi();
    const [signer] = await ethers.getSigners();
    const deployment = await deployments.get("HonestHouse");
    const contract = await ethers.getContractAt("HonestHouse", deployment.address);

    const encrypted = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(amount)
      .encrypt();

    const tx = await contract.submitCoins(taskArguments.game, encrypted.handles[0], encrypted.inputProof);
    await tx.wait();
    console.log(`Submitted ${amount} coins to game ${taskArguments.game} with tx ${tx.hash}`);
  });

task("task:status", "Prints round info and decrypted balances for the first signer")
  .addParam("game", "Game id")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();
    const [signer] = await ethers.getSigners();
    const deployment = await deployments.get("HonestHouse");
    const contract = await ethers.getContractAt("HonestHouse", deployment.address);

    const summary = await contract.getGameSummary(taskArguments.game);
    console.log("Round:", summary.round, "started:", summary.started, "finished:", summary.finished);
    console.log("Players:", summary.players[0], summary.players[1]);

    if (summary.players[0] === ethers.ZeroAddress && summary.players[1] === ethers.ZeroAddress) {
      return;
    }

    try {
      const playerState = await contract.getPlayerState(taskArguments.game, signer.address);
      const coins = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        playerState.coins,
        deployment.address,
        signer,
      );
      const score = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        playerState.score,
        deployment.address,
        signer,
      );
      console.log(`Your coins: ${coins}, score: ${score}, submitted: ${playerState.hasSubmitted}`);
    } catch {
      console.log("Signer is not part of this game or decryption failed");
    }
  });
