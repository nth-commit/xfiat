import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { range } from 'ix/iterable'
import { IncentiveToken, XFiatPegToken } from '../../typechain-types'

export namespace EthersHelpers {
  export function createWalletAddress(): string {
    return ethers.Wallet.createRandom().address
  }

  export function createWalletAddresses(n: number): string[] {
    return Array.from(range(0, n)).map(createWalletAddress)
  }

  export namespace Deployer {
    export async function deployIncentiveToken(): Promise<IncentiveToken> {
      const incentiveTokenFactory = await ethers.getContractFactory('IncentiveToken')
      return incentiveTokenFactory.deploy()
    }

    export async function deployRandomSigner(): Promise<SignerWithAddress> {
      const address = createWalletAddress()

      // Give em some ETH for gas and whatnot
      await network.provider.send('hardhat_setBalance', [address, '0x10000000000000000'])

      return await ethers.getImpersonatedSigner(address)
    }

    export async function deployXFiatPegToken(owner: SignerWithAddress, iso4217Code: string): Promise<XFiatPegToken> {
      const factory = await ethers.getContractFactory('XFiatPegToken')
      return await factory.connect(owner).deploy(iso4217Code)
    }
  }
}
