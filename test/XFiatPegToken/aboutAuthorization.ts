import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import fc from 'fast-check'
import { ethers } from 'hardhat'

import { XFiatPegToken } from '../../typechain-types'
import { Arbitrary } from '../helpers/Arbitrary'
import { EthersHelpers } from '../helpers/EthersHelpers'

type System = {
  owner: SignerWithAddress
  nonOwner: SignerWithAddress
  contracts(actor: SignerWithAddress): {
    xFiatPegToken: XFiatPegToken
  }
}

describe('XFiatPegToken', () => {
  describe('about authorization', () => {
    const systemFixture = createSystemFixture('USD')

    it('mint should revert for non-owner', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.walletAddress, Arbitrary.bigNumber(), async (address, amount) => {
          const { nonOwner, contracts } = await loadFixture(systemFixture)
          const { xFiatPegToken } = contracts(nonOwner)

          const txPromise = xFiatPegToken.mint(address, amount)

          await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
        })
      )
    })

    it('burn should revert for non-owner', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.walletAddress, Arbitrary.bigNumber(), async (address, amount) => {
          const { nonOwner, contracts } = await loadFixture(systemFixture)
          const { xFiatPegToken } = contracts(nonOwner)

          const txPromise = xFiatPegToken.burn(address, amount)

          await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
        })
      )
    })

    it('setFeeRate should revert for non-owner', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.bigNumber(), async (amount) => {
          const { nonOwner, contracts } = await loadFixture(systemFixture)
          const { xFiatPegToken } = contracts(nonOwner)

          const txPromise = xFiatPegToken.setFeeRate(amount)

          await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
        })
      )
    })

    it('collectFee should revert for non-owner', async () => {
      await fc.assert(
        fc.asyncProperty(Arbitrary.walletAddress, Arbitrary.bigNumber(), async (address, requestedAmount) => {
          const { nonOwner, contracts } = await loadFixture(systemFixture)
          const { xFiatPegToken } = contracts(nonOwner)

          const txPromise = xFiatPegToken.collectFee(address, requestedAmount)

          await expect(txPromise).to.be.revertedWith('Ownable: caller is not the owner')
        })
      )
    })
  })
})

type SystemFixture = () => Promise<System>

function createSystemFixture(iso4217Code: string): SystemFixture {
  return async function systemFixture() {
    const [owner] = await ethers.getSigners()

    const nonOwner = await EthersHelpers.Deployer.deployRandomSigner()

    const xFiatPegToken = await EthersHelpers.Deployer.deployXFiatPegToken(owner, iso4217Code)

    return {
      owner,
      nonOwner,
      contracts: (actor) => ({
        xFiatPegToken: xFiatPegToken.connect(actor),
      }),
    }
  }
}
