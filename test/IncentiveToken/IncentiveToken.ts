import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import fc from 'fast-check'
import { ethers } from 'hardhat'

import { IncentiveToken } from '../../typechain-types'
import { Arbitrary } from '../helpers/Arbitrary'
import { EthersHelpers } from '../helpers/EthersHelpers'
import { expectBigNumber } from '../helpers/ExpectHelpers'

type System = {
  owner: SignerWithAddress
  nonOwner: SignerWithAddress
  contracts(actor: SignerWithAddress): {
    incentiveToken: IncentiveToken
  }
}

describe('IncentiveToken', () => {
  const systemFixture = createSystemFixture()

  it('name should be correct', async () => {
    const { nonOwner, contracts } = await loadFixture(systemFixture)
    const { incentiveToken } = contracts(nonOwner)

    const actualName = await incentiveToken.name()
    expect(actualName).to.eq('XFiat Incentive Token')
  })

  it('symbol should be correct', async () => {
    const { nonOwner, contracts } = await loadFixture(systemFixture)
    const { incentiveToken } = contracts(nonOwner)

    const actualSymbol = await incentiveToken.symbol()
    expect(actualSymbol).to.eq('XINC')
  })

  describe('mint', () => {
    it('should revert if caller not owner', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.walletAddress, Arbitrary.bigNumber, async (address, amount) => {
          const { nonOwner, contracts } = await loadFixture(systemFixture)
          const { incentiveToken } = contracts(nonOwner)

          const txPromise = incentiveToken.mint(address, amount)

          await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
        })
      )
    })

    it('should transfer amount to the target', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.walletAddress, Arbitrary.bigNumber, async (address, amount) => {
          const { owner, contracts } = await loadFixture(systemFixture)
          const { incentiveToken } = contracts(owner)

          await incentiveToken.mint(address, amount)

          const addressBalance = await incentiveToken.balanceOf(address)
          expectBigNumber(addressBalance).toEqual(amount)
        })
      )
    })
  })
})

type SystemFixture = () => Promise<System>

function createSystemFixture(): SystemFixture {
  return async function systemFixture() {
    const [owner] = await ethers.getSigners()
    const nonOwner = await EthersHelpers.Deployer.deployRandomSigner()

    const incentiveToken = await EthersHelpers.Deployer.deployIncentiveToken()

    return {
      owner,
      nonOwner,
      contracts: (actor) => ({
        incentiveToken: incentiveToken.connect(actor),
      }),
    }
  }
}
