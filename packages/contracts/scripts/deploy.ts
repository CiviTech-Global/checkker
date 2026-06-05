import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CheckkerEscrow with account:", deployer.address);

  const refereeAddress = process.env.REFEREE_ADDRESS ?? deployer.address;
  const houseWallet = process.env.HOUSE_WALLET ?? deployer.address;

  console.log("Referee:", refereeAddress);
  console.log("House wallet:", houseWallet);

  const CheckkerEscrow = await ethers.getContractFactory("CheckkerEscrow");
  const escrow = await CheckkerEscrow.deploy(refereeAddress, houseWallet);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("CheckkerEscrow deployed to:", address);
  console.log("\nAdd to your .env:");
  console.log(`CHECKKER_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
