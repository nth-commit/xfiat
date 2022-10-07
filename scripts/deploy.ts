import { ethers } from 'hardhat'

async function main() {
  const XFiatFactory = await ethers.getContractFactory('XFiatFactory')
  const xFiatFactory = await XFiatFactory.deploy()

  await xFiatFactory.deployed()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
