import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('XFiatPeg', () => {
  const iso4217Code = 'USD'

  async function deployXFiatPegFixture() {
    const [owner, otherAccount] = await ethers.getSigners()

    const XFiatPegFactory = await ethers.getContractFactory('XFiatPegFactory')
    const xFiatPegFactory = await XFiatPegFactory.deploy()

    await xFiatPegFactory.createPeg(iso4217Code)
    const pegAddress = await xFiatPegFactory.pegs(iso4217Code)

    const xFiatPeg = await ethers.getContractAt('XFiatPeg', pegAddress)

    return { xFiatPegFactory, xFiatPeg, owner, otherAccount }
  }

  describe('pegToken', () => {
    it('name should be correct', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())

      const name = await xFiatPegToken.name()

      expect(name).to.eq('XFiat USD Peg')
    })

    it('symbol should be correct', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())

      const symbol = await xFiatPegToken.symbol()

      expect(symbol).to.eq('XUSD')
    })

    it('owner should be XFiatPeg', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())

      const owner = await xFiatPegToken.owner()
      expect(owner).to.eq(xFiatPeg.address)
    })

    it('mint should revert for root owner', async () => {
      const { xFiatPeg, owner } = await loadFixture(deployXFiatPegFixture)
      const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())
      const wallet = ethers.Wallet.createRandom()

      const txPromise = xFiatPegToken.connect(owner).mint(wallet.address, 1)

      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('burn should revert for root owner', async () => {
      const { xFiatPeg, owner } = await loadFixture(deployXFiatPegFixture)
      const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())
      const wallet = ethers.Wallet.createRandom()

      const txPromise = xFiatPegToken.connect(owner).burn(wallet.address, 1)

      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
