import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("----------------------------------------------------");
  console.log("Deploying SupplyChainRegistry...");
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", network.name);

  const factory = await ethers.getContractFactory("SupplyChainRegistry");
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  const txHash = deploymentTx ? deploymentTx.hash : "N/A";
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();

  console.log("====================================================");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log("Deployment Transaction:", txHash);
  console.log("====================================================");

  // Write deployment information for consumption by apps/api and other packages
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId,
    deploymentTransaction: txHash,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, `${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Saved deployment info to deployments/${network.name}.json`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
