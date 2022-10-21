import { BigNumber } from 'ethers'
import fc, { IntegerConstraints } from 'fast-check'
import { EthersHelpers } from './EthersHelpers'

export namespace Arbitrary {
  const walletAddresses = EthersHelpers.createWalletAddresses(50)

  export const walletAddress: fc.Arbitrary<string> = fc.constantFrom(...walletAddresses)

  export type BigNumberConstraints = {
    min: BigNumber | number
    max: BigNumber | number
  }

  export const bigNumber = (constraints: Partial<BigNumberConstraints> = {}): fc.Arbitrary<BigNumber> => {
    const integerConstraints: IntegerConstraints = {}

    if ('min' in constraints) {
      integerConstraints.min = typeof constraints.min === 'number' ? constraints.min : constraints.min!.toNumber()
    } else {
      integerConstraints.min = 0
    }

    if ('max' in constraints) {
      integerConstraints.max = typeof constraints.max === 'number' ? constraints.max : constraints.max!.toNumber()
    }

    return fc.integer(integerConstraints).map(BigNumber.from)
  }
}
