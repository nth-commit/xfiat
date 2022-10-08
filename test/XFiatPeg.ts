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

  async function deployEmptyContractFixture() {
    const EmptyContract = await ethers.getContractFactory('EmptyContract')
    const emptyContract = await EmptyContract.deploy()

    return { emptyContract }
  }

  async function deployExternalERC20Fixture() {
    const ERC20 = await ethers.getContractFactory('ERC20')
    const externalErc20 = await ERC20.deploy('USDC', 'USDC')

    return { externalErc20 }
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

  describe('authorizeTrustedReserve', () => {
    it('should revert if caller not owner', async () => {
      const { xFiatPeg, otherAccount } = await loadFixture(deployXFiatPegFixture)
      const tokenContractAddress = ethers.Wallet.createRandom().address

      const txPromise = xFiatPeg.connect(otherAccount).authorizeTrustedReserve(tokenContractAddress, 1)
      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if token address is not a contract', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = ethers.Wallet.createRandom().address

      const txPromise = xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)
      await expect(txPromise).to.be.revertedWithCustomError(xFiatPeg, 'ERC20ValidationError_Contract')
    })

    it('should revert if contract does not contain decimals', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const { emptyContract } = await loadFixture(deployEmptyContractFixture)

      const txPromise = xFiatPeg.authorizeTrustedReserve(emptyContract.address, 1)
      await expect(txPromise).to.be.revertedWithCustomError(xFiatPeg, 'ERC20ValidationError_Decimals')
    })

    it('should revert if reserve exists', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const { externalErc20 } = await loadFixture(deployExternalERC20Fixture)
      await xFiatPeg.authorizeTrustedReserve(externalErc20.address, 1)

      const txPromise = xFiatPeg.authorizeTrustedReserve(externalErc20.address, 1)
      await expect(txPromise).to.be.revertedWithCustomError(xFiatPeg, 'ReserveExistedError')
    })
  })
})
