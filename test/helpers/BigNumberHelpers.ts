import { BigNumber } from 'ethers'

export namespace BigNumberHelpers {
  export function sum(xs: BigNumber[]): BigNumber {
    return xs.reduce((acc, curr) => acc.add(curr), BigNumber.from(0))
  }
}
