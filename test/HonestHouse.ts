import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HonestHouse, HonestHouse__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HonestHouse")) as HonestHouse__factory;
  const contract = (await factory.deploy()) as HonestHouse;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("HonestHouse", function () {
  let signers: Signers;
  let contract: HonestHouse;
  let contractAddress: string;

  before(async function () {
    const accounts: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: accounts[0], bob: accounts[1], carol: accounts[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ contract: contract, address: contractAddress } = await deployFixture());
  });

  async function decryptBalance(
    player: HardhatEthersSigner,
  ): Promise<{ coins: bigint; score: bigint; submitted: boolean; seat: number }> {
    const state = await contract.getPlayerState(1, player.address);
    const coins = await fhevm.userDecryptEuint(FhevmType.euint32, state.coins, contractAddress, player);
    const score = await fhevm.userDecryptEuint(FhevmType.euint32, state.score, contractAddress, player);
    return { coins: BigInt(coins), score: BigInt(score), submitted: state.hasSubmitted, seat: state.seat };
  }

  it("seats creator with encrypted coins and score", async function () {
    const tx = await contract.connect(signers.alice).createGame();
    await tx.wait();

    const summary = await contract.getGameSummary(1);
    expect(summary.players[0]).to.equal(signers.alice.address);
    expect(summary.players[1]).to.equal(ethers.ZeroAddress);
    expect(summary.started).to.be.false;

    const state = await contract.getPlayerState(1, signers.alice.address);
    const coins = await fhevm.userDecryptEuint(FhevmType.euint32, state.coins, contractAddress, signers.alice);
    const score = await fhevm.userDecryptEuint(FhevmType.euint32, state.score, contractAddress, signers.alice);

    expect(coins).to.equal(100);
    expect(score).to.equal(0);
  });

  it("resolves a round and rewards the higher contribution", async function () {
    await contract.connect(signers.alice).createGame();
    await contract.connect(signers.bob).joinGame(1);
    await contract.connect(signers.alice).startGame(1);

    const aliceInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(7).encrypt();
    await contract.connect(signers.alice).submitCoins(1, aliceInput.handles[0], aliceInput.inputProof);

    const bobInput = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add32(3).encrypt();
    await contract.connect(signers.bob).submitCoins(1, bobInput.handles[0], bobInput.inputProof);

    const aliceState = await decryptBalance(signers.alice);
    const bobState = await decryptBalance(signers.bob);

    expect(aliceState.coins).to.equal(BigInt(93));
    expect(bobState.coins).to.equal(BigInt(97));
    expect(aliceState.score).to.equal(BigInt(10));
    expect(bobState.score).to.equal(BigInt(0));

    const summary = await contract.getGameSummary(1);
    expect(summary.round).to.equal(2);
  });

  it("clamps submissions that exceed the remaining coins", async function () {
    await contract.connect(signers.alice).createGame();
    await contract.connect(signers.bob).joinGame(1);
    await contract.connect(signers.alice).startGame(1);

    const overSpend = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(150).encrypt();
    await contract.connect(signers.alice).submitCoins(1, overSpend.handles[0], overSpend.inputProof);

    const smallSpend = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add32(1).encrypt();
    await contract.connect(signers.bob).submitCoins(1, smallSpend.handles[0], smallSpend.inputProof);

    const aliceState = await decryptBalance(signers.alice);
    const bobState = await decryptBalance(signers.bob);

    expect(aliceState.coins).to.equal(BigInt(100));
    expect(bobState.coins).to.equal(BigInt(99));
    expect(bobState.score).to.equal(BigInt(10));
  });
});
