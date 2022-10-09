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
    const xFiatPegToken = await ethers.getContractAt('XFiatPegToken', await xFiatPeg.pegToken())

    const TestERC20 = await ethers.getContractFactory('TestERC20')
    const fiatToken = await TestERC20.deploy()

    return { xFiatPegFactory, xFiatPeg, xFiatPegToken, fiatToken, owner, otherAccount }
  }

  async function deployEmptyContractFixture() {
    const EmptyContract = await ethers.getContractFactory('EmptyContract')
    const emptyContract = await EmptyContract.deploy()

    return { emptyContract }
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
      const { xFiatPeg, fiatToken } = await loadFixture(deployXFiatPegFixture)
      await xFiatPeg.authorizeTrustedReserve(fiatToken.address, 1)

      const txPromise = xFiatPeg.authorizeTrustedReserve(fiatToken.address, 1)

      await expect(txPromise).to.be.revertedWithCustomError(xFiatPeg, 'ReserveAlreadyAuthorizedError')
    })

    it('should emit TrustedReserveAuthorized event', async () => {
      const { xFiatPeg, fiatToken } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address

      const tx = await xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)

      await expect(tx).to.emit(xFiatPeg, 'TrustedReserveAuthorized').withArgs(tokenAddress)
    })

    it('should add authorized reserve', async () => {
      const { xFiatPeg, fiatToken } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address
      const decimals = await fiatToken.decimals()
      const limit = 1

      await xFiatPeg.authorizeTrustedReserve(tokenAddress, limit)

      const trustedReserve = await xFiatPeg.trustedReserves(fiatToken.address)
      expect(trustedReserve[0]).to.eq(tokenAddress)
      expect(trustedReserve[1]).to.eq(decimals)
      expect(trustedReserve[2].toNumber()).to.eq(limit)
    })
  })

  describe('deposit', () => {
    it('should revert if token address not authorized', async () => {
      const { xFiatPeg } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = ethers.Wallet.createRandom().address

      const txPromise = xFiatPeg.deposit(tokenAddress, 1)

      await expect(txPromise).to.be.revertedWithCustomError(xFiatPeg, 'ReserveNotAuthorizedError')
    })

    it('should revert if user has not specified allowance', async () => {
      const { xFiatPeg, fiatToken, otherAccount } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address
      await xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)
      const xFiatPegAsUser = xFiatPeg.connect(otherAccount)

      const txPromise = xFiatPegAsUser.deposit(tokenAddress, 1)

      await expect(txPromise).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('should revert if user has insufficient balance', async () => {
      const { xFiatPeg, fiatToken, otherAccount } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address
      await xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)
      const xFiatPegAsUser = xFiatPeg.connect(otherAccount)
      const fiatTokenAsUser = fiatToken.connect(otherAccount)
      await fiatTokenAsUser.increaseAllowance(xFiatPegAsUser.address, 1)

      const txPromise = xFiatPegAsUser.deposit(tokenAddress, 1)

      await expect(txPromise).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    it('should be transferred the deposited amount', async () => {
      const { xFiatPeg, xFiatPegToken, fiatToken, otherAccount } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address
      await xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)
      await fiatToken.mint(otherAccount.address, 1)

      const xFiatPegAsUser = xFiatPeg.connect(otherAccount)
      const fiatTokenAsUser = fiatToken.connect(otherAccount)
      await fiatTokenAsUser.increaseAllowance(xFiatPegAsUser.address, 1)

      await xFiatPegAsUser.deposit(tokenAddress, 1)

      expect((await fiatToken.balanceOf(otherAccount.address)).toNumber()).to.eq(0)
      expect((await fiatToken.balanceOf(xFiatPeg.address)).toNumber()).to.eq(1)
    })

    it('should tokenize the deposit to the user', async () => {
      const { xFiatPeg, xFiatPegToken, fiatToken, otherAccount } = await loadFixture(deployXFiatPegFixture)
      const tokenAddress = fiatToken.address
      await xFiatPeg.authorizeTrustedReserve(tokenAddress, 1)
      await fiatToken.mint(otherAccount.address, 1)

      const xFiatPegAsUser = xFiatPeg.connect(otherAccount)
      const fiatTokenAsUser = fiatToken.connect(otherAccount)
      await fiatTokenAsUser.increaseAllowance(xFiatPegAsUser.address, 1)

      await xFiatPegAsUser.deposit(tokenAddress, 1)

      expect((await xFiatPegToken.balanceOf(otherAccount.address)).toNumber()).to.eq(1)
      expect((await xFiatPegToken.totalSupply()).toNumber()).to.eq(1)
    })
  })
})
