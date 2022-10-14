import { ethers } from 'ethers'
import { range } from 'ix/iterable'

export namespace EthersHelpers {
  export function createWalletAddresses(n: number): string[] {
    return Array.from(range(0, n)).map(() => ethers.Wallet.createRandom().address)
  }
}
