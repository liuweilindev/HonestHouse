import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHonestHouse = await deploy("HonestHouse", {
    from: deployer,
    log: true,
  });

  console.log(`HonestHouse contract: `, deployedHonestHouse.address);
};
export default func;
func.id = "deploy_honestHouse"; // id required to prevent reexecution
func.tags = ["HonestHouse"];
