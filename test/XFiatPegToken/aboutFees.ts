import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import fc from 'fast-check'
import { ethers } from 'hardhat'

import { XFiatPegToken } from '../../typechain-types'
import { Arbitrary } from '../helpers/Arbitrary'
import { EthersHelpers } from '../helpers/EthersHelpers'
import { expectBigNumber } from '../helpers/ExpectHelpers'

describe('XFiatPegToken', () => {
  describe('about fees', () => {
    const systemFixture = createSystemFixture('USD')
    const maxFeeRate = BigNumber.from(100_000)

    it('should revert if fee > fee resolution', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.bigNumber({ min: maxFeeRate.add(1) }), async (feeRate) => {
          // Arrange
          const { owner, contracts } = await loadFixture(systemFixture)

          // Act
          const txPromise = contracts(owner).xFiatPegToken.setFeeRate(feeRate)

          // Assert
          await expect(txPromise).to.be.revertedWithCustomError(contracts.xFiatPegToken, 'FeeRateOutOfBounds')
        })
      )
    })

    it('should set the fee rate', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.bigNumber({ max: maxFeeRate }), async (feeRate) => {
          // Arrange
          const { owner, contracts } = await loadFixture(systemFixture)

          // Act
          await contracts(owner).xFiatPegToken.setFeeRate(feeRate)

          // Assert
          const actualFee = await contracts(owner).xFiatPegToken.feeRate()
          expectBigNumber(actualFee).toEqual(feeRate)
        })
      )
    })

    it('fee rate = 0, should not subtract fee', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.bigNumber({ min: 1 }), Arbitrary.walletAddress, async (amount, receiverAddress) => {
          // Arrange
          const { contracts, owner, nonOwner } = await loadFixture(systemFixture)
          await contracts(owner).xFiatPegToken.setFeeRate(0)
          await contracts(owner).xFiatPegToken.mint(nonOwner.address, amount)

          // Act
          await contracts(nonOwner).xFiatPegToken.approve(receiverAddress, amount)
          await contracts(nonOwner).xFiatPegToken.transfer(receiverAddress, amount)

          // Assert
          const expectedFee = 0
          const actualFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
          expectBigNumber(actualFee).toEqual(expectedFee)
        })
      )
    })

    it('fee rate = 1, should subtract the fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          Arbitrary.bigNumber({ min: 1 }),
          Arbitrary.walletAddress,
          async (transferAmountMultiplicand, receiverAddress) => {
            // Arrange
            const transferAmount = maxFeeRate.mul(transferAmountMultiplicand)
            const { contracts, owner, nonOwner } = await loadFixture(systemFixture)
            await contracts(owner).xFiatPegToken.setFeeRate(1)
            await contracts(owner).xFiatPegToken.mint(nonOwner.address, transferAmount)

            // Act
            await contracts(nonOwner).xFiatPegToken.approve(receiverAddress, transferAmount)
            await contracts(nonOwner).xFiatPegToken.transfer(receiverAddress, transferAmount)

            // Assert
            const expectedFee = transferAmountMultiplicand
            const actualFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
            expectBigNumber(actualFee).toEqual(expectedFee)
          }
        )
      )
    })

    it('transfer amount = max fee resolution, should subtract the fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          Arbitrary.bigNumber({ min: 0, max: maxFeeRate }),
          Arbitrary.walletAddress,
          async (feeRate, receiverAddress) => {
            // Arrange
            const transferAmount = maxFeeRate
            const { contracts, owner, nonOwner } = await loadFixture(systemFixture)
            await contracts(owner).xFiatPegToken.setFeeRate(feeRate)
            await contracts(owner).xFiatPegToken.mint(nonOwner.address, transferAmount)

            // Act
            await contracts(nonOwner).xFiatPegToken.approve(receiverAddress, transferAmount)
            await contracts(nonOwner).xFiatPegToken.transfer(receiverAddress, transferAmount)

            // Assert
            const expectedFee = feeRate
            const actualFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
            expectBigNumber(actualFee).toEqual(expectedFee)
          }
        )
      )
    })

    it('sender = owner, should not subtract fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          Arbitrary.bigNumber({ min: 0, max: maxFeeRate }),
          Arbitrary.bigNumber(),
          Arbitrary.walletAddress,
          async (feeRate, transferAmount, receiverAddress) => {
            // Arrange
            const { contracts, owner } = await loadFixture(systemFixture)
            await contracts(owner).xFiatPegToken.setFeeRate(feeRate)
            await contracts(owner).xFiatPegToken.mint(owner.address, transferAmount)

            // Act
            await contracts(owner).xFiatPegToken.approve(receiverAddress, transferAmount)
            await contracts(owner).xFiatPegToken.transfer(receiverAddress, transferAmount)

            // Assert
            const actualFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
            expectBigNumber(actualFee).toEqual(0)
          }
        )
      )
    })

    it('receiver = owner, should not subtract fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          Arbitrary.bigNumber({ min: 0, max: maxFeeRate }),
          Arbitrary.bigNumber(),
          async (feeRate, transferAmount) => {
            // Arrange
            const { contracts, owner, nonOwner } = await loadFixture(systemFixture)
            await contracts(owner).xFiatPegToken.setFeeRate(feeRate)
            await contracts(owner).xFiatPegToken.mint(nonOwner.address, transferAmount)

            // Act
            await contracts(nonOwner).xFiatPegToken.approve(owner.address, transferAmount)
            await contracts(nonOwner).xFiatPegToken.transfer(owner.address, transferAmount)

            // Assert
            const actualFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
            expectBigNumber(actualFee).toEqual(0)
          }
        )
      )
    })

    it('should allow owner to collect fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          Arbitrary.bigNumber({ min: 0, max: maxFeeRate }),
          Arbitrary.bigNumber(),
          Arbitrary.walletAddress,
          async (feeRate, transferAmount, receiverAddress) => {
            // Arrange
            const { contracts, owner, nonOwner } = await loadFixture(systemFixture)
            await contracts(owner).xFiatPegToken.setFeeRate(feeRate)
            await contracts(owner).xFiatPegToken.mint(nonOwner.address, transferAmount)
            await contracts(nonOwner).xFiatPegToken.approve(receiverAddress, transferAmount)
            await contracts(nonOwner).xFiatPegToken.transfer(receiverAddress, transferAmount)

            // Act
            const accruedFee = await contracts.xFiatPegToken.balanceOf(contracts.xFiatPegToken.address)
            await contracts(owner).xFiatPegToken.collectFee(owner.address, accruedFee)

            // Assert
            const actualCollectedFee = await contracts.xFiatPegToken.balanceOf(owner.address)
            expectBigNumber(actualCollectedFee).toEqual(accruedFee)
          }
        )
      )
    })
  })
})

type Contracts = {
  xFiatPegToken: XFiatPegToken
}

type System = {
  owner: SignerWithAddress
  nonOwner: SignerWithAddress
  contracts: Contracts & ((actor: SignerWithAddress) => Contracts)
}

type SystemFixture = () => Promise<System>

function createSystemFixture(iso4217Code: string): SystemFixture {
  return async function systemFixture() {
    const [owner] = await ethers.getSigners()

    const nonOwner = await EthersHelpers.Deployer.deployRandomSigner()

    const xFiatPegToken = await EthersHelpers.Deployer.deployXFiatPegToken(owner, iso4217Code)

    const makeContracts = (actor: SignerWithAddress): Contracts => ({
      xFiatPegToken: xFiatPegToken.connect(actor),
    })

    const defaultContracts = makeContracts(nonOwner)

    return {
      owner,
      nonOwner,
      contracts: Object.assign(makeContracts, defaultContracts),
    }
  }
}
