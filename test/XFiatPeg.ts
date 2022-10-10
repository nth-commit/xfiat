import { Provider } from '@ethersproject/providers'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumber, Signer } from 'ethers'
import { ethers } from 'hardhat'
import { TestERC20, XFiatPeg } from '../typechain-types'
import { XFiatPegToken } from '../typechain-types/contracts/XFiatPeg.sol/XFiatPegToken'
import ObjectHelpers from './helpers/ObjectHelpers'

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

  const EmptyContract = await ethers.getContractFactory('EmptyContract')
  const emptyContract = await EmptyContract.deploy()

  return { xFiatPegFactory, xFiatPeg, xFiatPegToken, fiatToken, emptyContract, owner, otherAccount }
}

type SutBuilder = {
  build(): Promise<Sut>
}

type SutActorId = 'anyone' | 'owner'

type SutActor = { id: SutActorId; address: string }

type SutContracts = {
  peg: XFiatPeg
  pegToken: XFiatPegToken
  fiatToken: TestERC20
}

type Sut = {
  iso4217Code: string
  actors: { [A in SutActorId]: SutActor }
  contracts(actor: SutActor): SutContracts
  any: {
    address(): string
    contractAddress(): string
    nonContractAddress(): string
    amount(): BigNumber
  }
}

namespace SutBuilder {
  export function create(): SutBuilder {
    const state = {
      iso4217Code: 'USD',
    }

    const builder: SutBuilder = {
      build: async (): Promise<Sut> => {
        const { xFiatPeg, xFiatPegToken, fiatToken, owner, emptyContract, otherAccount } = await loadFixture(
          deployXFiatPegFixture
        )

        const contracts: SutContracts = {
          peg: xFiatPeg,
          pegToken: xFiatPegToken,
          fiatToken,
        }

        const getSignerOrProvider = (actor: SutActorId): Signer | Provider | string => {
          switch (actor) {
            case 'anyone':
              return otherAccount
            case 'owner':
              return owner
          }
        }

        return {
          iso4217Code: state.iso4217Code,
          actors: {
            anyone: { id: 'anyone', address: otherAccount.address },
            owner: { id: 'owner', address: owner.address },
          },
          contracts: (actor) => {
            const signerOrProvider = getSignerOrProvider(actor.id)
            return ObjectHelpers.map(contracts, (contract) => contract.connect(signerOrProvider)) as SutContracts
          },
          any: {
            address: () => ethers.Wallet.createRandom().address,
            contractAddress: () => emptyContract.address,
            nonContractAddress: () => ethers.Wallet.createRandom().address,
            amount: () => BigNumber.from(1),
          },
        }
      },
    }

    return builder
  }
}

describe('XFiatPeg', () => {
  describe('pegToken', () => {
    it('name should be correct', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.anyone)

      const actualName = await contracts.pegToken.name()
      const expectedName = `XFiat ${sut.iso4217Code} Peg`
      expect(actualName).to.eq(expectedName)
    })

    it('symbol should be correct', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.anyone)

      const actualSymbol = await contracts.pegToken.symbol()
      const expectedSymbol = `X${sut.iso4217Code}`
      expect(actualSymbol).to.eq(expectedSymbol)
    })

    it('owner should be peg contract', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.anyone)

      const actualOwner = await contracts.pegToken.owner()
      const expectedOwner = contracts.peg.address
      expect(actualOwner).to.eq(expectedOwner)
    })

    it('mint should revert for owner', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const txPromise = contracts.pegToken.mint(sut.any.address(), sut.any.amount())

      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('burn should revert for owner', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const txPromise = contracts.pegToken.burn(sut.any.address(), sut.any.amount())

      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('authorizeTrustedReserve', () => {
    it('should revert if caller not owner', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.anyone)

      const txPromise = contracts.peg.authorizeTrustedReserve(sut.any.address(), sut.any.amount())

      await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if token address is not a contract', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const txPromise = contracts.peg.authorizeTrustedReserve(sut.any.nonContractAddress(), sut.any.amount())

      await expect(txPromise).to.be.revertedWithCustomError(contracts.peg, 'ERC20ValidationError_Contract')
    })

    it('should revert if contract does not contain decimals method', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const txPromise = contracts.peg.authorizeTrustedReserve(sut.any.contractAddress(), sut.any.amount())

      await expect(txPromise).to.be.revertedWithCustomError(contracts.peg, 'ERC20ValidationError_Decimals')
    })

    it('should revert if reserve exists', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)
      await contracts.peg.authorizeTrustedReserve(contracts.fiatToken.address, sut.any.amount())

      const txPromise = contracts.peg.authorizeTrustedReserve(contracts.fiatToken.address, sut.any.amount())

      await expect(txPromise).to.be.revertedWithCustomError(contracts.peg, 'ReserveAlreadyAuthorizedError')
    })

    it('should emit TrustedReserveAuthorized event', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const tx = await contracts.peg.authorizeTrustedReserve(contracts.fiatToken.address, sut.any.amount())

      await expect(tx).to.emit(contracts.peg, 'TrustedReserveAuthorized').withArgs(contracts.fiatToken.address)
    })

    it('should add authorized reserve', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)
      const limit = sut.any.amount()

      await contracts.peg.authorizeTrustedReserve(contracts.fiatToken.address, limit)

      const [actualAddress, actualDecimals, actualLimit] = await contracts.peg.trustedReserves(
        contracts.fiatToken.address
      )
      const actualReserves = {
        address: actualAddress,
        decimals: actualDecimals,
        limit: actualLimit,
      }
      const expectedReserves = {
        address: contracts.fiatToken.address,
        decimals: await contracts.fiatToken.decimals(),
        limit,
      } // satisfies typeof actualReserves;
      expect(actualReserves).to.deep.eq(expectedReserves)
    })
  })

  describe('deposit', () => {
    it('should revert if token address not authorized', async () => {
      const sut = await SutBuilder.create().build()
      const contracts = sut.contracts(sut.actors.owner)

      const txPromise = contracts.peg.deposit(sut.any.address(), sut.any.amount())

      await expect(txPromise).to.be.revertedWithCustomError(contracts.peg, 'ReserveNotAuthorizedError')
    })

    it('should revert if user has not specified allowance', async () => {
      const sut = await SutBuilder.create().build()
      const ownerContracts = sut.contracts(sut.actors.owner)
      const userContracts = sut.contracts(sut.actors.anyone)
      await ownerContracts.peg.authorizeTrustedReserve(ownerContracts.fiatToken.address, sut.any.amount())

      const txPromise = userContracts.peg.deposit(ownerContracts.fiatToken.address, sut.any.amount())

      await expect(txPromise).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('should revert if user has insufficient balance', async () => {
      const sut = await SutBuilder.create().build()
      const ownerContracts = sut.contracts(sut.actors.owner)
      const userContracts = sut.contracts(sut.actors.anyone)
      await ownerContracts.peg.authorizeTrustedReserve(ownerContracts.fiatToken.address, sut.any.amount())
      await userContracts.fiatToken.increaseAllowance(userContracts.peg.address, sut.any.amount())

      const txPromise = userContracts.peg.deposit(ownerContracts.fiatToken.address, sut.any.amount())

      await expect(txPromise).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    it('should be transferred the deposited amount', async () => {
      const sut = await SutBuilder.create().build()
      const ownerContracts = sut.contracts(sut.actors.owner)
      const userContracts = sut.contracts(sut.actors.anyone)
      await ownerContracts.peg.authorizeTrustedReserve(ownerContracts.fiatToken.address, sut.any.amount())

      const depositAmount = sut.any.amount()
      await userContracts.fiatToken.increaseAllowance(userContracts.peg.address, depositAmount)
      await ownerContracts.fiatToken.mint(sut.actors.anyone.address, depositAmount)

      await userContracts.peg.deposit(userContracts.fiatToken.address, depositAmount)

      expect((await ownerContracts.fiatToken.balanceOf(sut.actors.anyone.address)).toNumber()).to.eq(0)
      expect((await ownerContracts.fiatToken.balanceOf(userContracts.peg.address)).toNumber()).to.eq(depositAmount)
    })

    it('should tokenize the deposit to the user', async () => {
      const sut = await SutBuilder.create().build()
      const ownerContracts = sut.contracts(sut.actors.owner)
      const userContracts = sut.contracts(sut.actors.anyone)
      await ownerContracts.peg.authorizeTrustedReserve(ownerContracts.fiatToken.address, sut.any.amount())

      const depositAmount = sut.any.amount()
      await userContracts.fiatToken.increaseAllowance(userContracts.peg.address, depositAmount)
      await ownerContracts.fiatToken.mint(sut.actors.anyone.address, depositAmount)

      await userContracts.peg.deposit(userContracts.fiatToken.address, depositAmount)

      expect(await ownerContracts.pegToken.balanceOf(sut.actors.anyone.address)).to.eq(depositAmount)
      expect(await ownerContracts.pegToken.totalSupply()).to.eq(depositAmount)
    })
  })
})
