import { BigNumber } from 'ethers'
import fc from 'fast-check'
import { EthersHelpers } from './EthersHelpers'

export namespace Arbitrary {
  const walletAddresses = EthersHelpers.createWalletAddresses(50)

  export const walletAddress: fc.Arbitrary<string> = fc.constantFrom(...walletAddresses)

  export const bigNumber: fc.Arbitrary<BigNumber> = fc.nat().map(BigNumber.from)
}
