import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('XFiatPegFactory', () => {
  async function deployXFiatPegFactoryFixture() {
    const [owner, otherAccount] = await ethers.getSigners()

    const XFiatPegFactory = await ethers.getContractFactory('XFiatPegFactory')
    const xFiatPegFactory = await XFiatPegFactory.deploy()

    return { xFiatPegFactory, owner, otherAccount }
  }

  describe('createPeg', () => {
    it('should revert if caller not owner', async () => {
      const { xFiatPegFactory, otherAccount } = await loadFixture(deployXFiatPegFactoryFixture)

      const txPromise = xFiatPegFactory.connect(otherAccount).createPeg('USD')
      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if peg exists', async () => {
      const iso4217Code = 'USD'
      const { xFiatPegFactory } = await loadFixture(deployXFiatPegFactoryFixture)
      await xFiatPegFactory.createPeg(iso4217Code)

      const txPromise = xFiatPegFactory.createPeg(iso4217Code)
      await expect(txPromise).to.be.revertedWith('Peg already existed')
    })

    it('should persist the address of the peg', async () => {
      const iso4217Code = 'USD'
      const { xFiatPegFactory } = await loadFixture(deployXFiatPegFactoryFixture)

      await xFiatPegFactory.createPeg(iso4217Code)

      const pegAddress = await xFiatPegFactory.pegs(iso4217Code)
      expect(pegAddress).not.to.eq(ethers.constants.AddressZero)
    })

    it('should emit PegCreated event', async () => {
      const iso4217Code = 'USD'
      const { xFiatPegFactory } = await loadFixture(deployXFiatPegFactoryFixture)

      const tx = await xFiatPegFactory.createPeg(iso4217Code)

      const pegAddress = await xFiatPegFactory.pegs(iso4217Code)
      expect(tx).to.emit(xFiatPegFactory, 'PegCreated').withArgs(iso4217Code, pegAddress)
    })

    it('should create a XFiatPeg instance', async () => {
      const iso4217Code = 'USD'
      const { xFiatPegFactory } = await loadFixture(deployXFiatPegFactoryFixture)

      await xFiatPegFactory.createPeg(iso4217Code)
      const pegAddress = await xFiatPegFactory.pegs(iso4217Code)

      const xFiatPeg = await ethers.getContractAt('XFiatPeg', pegAddress)
      expect(await xFiatPeg.factory()).to.eq(xFiatPegFactory.address)
      expect(await xFiatPeg.iso4217Code()).to.eq(iso4217Code)
    })
  })
})
