import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { BigNumber } from 'ethers'
import fc from 'fast-check'
import { ethers, network } from 'hardhat'
import { UniswapV3Deployer } from '@uniswap/hardhat-v3-deploy/dist/deployer/UniswapV3Deployer'

import { State } from './Types'
import { ERC20, ReserveFunding } from '../../typechain-types'
import { expectBigNumber } from '../helpers/ExpectHelpers'
import { BigNumberHelpers } from '../helpers/BigNumberHelpers'
import { AsyncCommandFactory } from '../helpers/AsyncCommandFactory'
import { EthersHelpers } from '../helpers/EthersHelpers'

type Model = {
  readonly initialActorBalances: Map<string, BigNumber>
  state: State
}

type System = {
  reserveFunding: ReserveFunding
  fiatToken: ERC20
}

type Invariant = AsyncCommandFactory.Invariant<Model, System>

it('LiquidityAccumulatingModel', async () => {
  const targetLiquidity = BigNumber.from(100)
  const actorBalances = new Map(
    EthersHelpers.createWalletAddresses(10).map((actor) => [actor, BigNumber.from(10000000000000)])
  )

  const invariants = [
    async function totalLiquidityMustNotExceedTargetLiquidity(_, r) {
      const totalLiquidity = await r.reserveFunding.totalLiquidity()
      const targetLiquidity = await r.reserveFunding.targetLiquidity()
      expectBigNumber(totalLiquidity).toBeLessThanOrEqual(targetLiquidity)
    },
    async function totalLiquidityMustEqualBalance(_, r) {
      const totalLiquidity = await r.reserveFunding.totalLiquidity()
      const balance = await r.fiatToken.balanceOf(r.reserveFunding.address)
      expectBigNumber(totalLiquidity).toEqual(balance)
    },
    async function totalLiquidityMustEqualSumOfActorBalances(_, r) {
      const totalLiquidity = await r.reserveFunding.totalLiquidity()
      const liquidityForActors = await Promise.all([...actorBalances.keys()].map((a) => r.reserveFunding.liquidity(a)))
      expectBigNumber(BigNumberHelpers.sum(liquidityForActors)).toEqual(totalLiquidity)
    },
  ] satisfies Invariant[]

  const commands = fc.commands(createCommands(targetLiquidity, actorBalances, invariants), { size: '+4' })

  const systemFixture = createSystemFixture(targetLiquidity, actorBalances)

  await fc.assert(
    fc.asyncProperty(commands, (commands) =>
      fc.asyncModelRun(() => setupModelRun(systemFixture, actorBalances), commands)
    )
  )
})

const createCommands = (targetLiquidity: BigNumber, actorBalances: Map<string, BigNumber>, invariants: Invariant[]) => {
  const commandFactory = AsyncCommandFactory.create<Model, System>({
    globalCheck: (m) => m.state === 'liquidityAccumulating',
    globalPostRun: async (m, r) => {
      m.state = await State.query(r.reserveFunding)
    },
    invariants,
  })

  const addLiquidityCommand = (amount: BigNumber, actor: string) =>
    commandFactory.createCommand({
      run: async (_, r) => {
        const signer = await ethers.getImpersonatedSigner(actor)
        await r.fiatToken.connect(signer).approve(r.reserveFunding.address, amount)
        await r.reserveFunding.connect(signer).addLiquidity(amount)
      },
      toString: () => `AddLiquidity(${amount}, ${actor})`,
    })

  const clearLiquidityCommand = (actor: string) =>
    commandFactory.createCommand({
      run: async (m, r) => {
        const signer = await ethers.getImpersonatedSigner(actor)
        await r.reserveFunding.connect(signer).clearLiquidity()

        const actorBalance = await r.fiatToken.balanceOf(actor)
        expectBigNumber(actorBalance).toEqual(m.initialActorBalances.get(actor)!)
      },
      toString: () => `ClearLiquidity(${actor})`,
    })

  const arbActor = (): fc.Arbitrary<string> => fc.constantFrom(...actorBalances.keys())

  const arbAmount = (): fc.Arbitrary<BigNumber> =>
    fc.integer({ min: 0, max: targetLiquidity.mul(2).toNumber() }).map((a) => BigNumber.from(a))

  return [
    fc.tuple(arbAmount(), arbActor()).map(([amount, actor]) => addLiquidityCommand(amount, actor)),
    arbActor().map((actor) => clearLiquidityCommand(actor)),
  ]
}

type SystemFixture = () => Promise<System>

const createSystemFixture = (targetLiquidity: BigNumber, actorBalances: Map<string, BigNumber>): SystemFixture =>
  async function systemFixture() {
    const actors = [...actorBalances.keys()]

    await Promise.all(actors.map((actor) => network.provider.send('hardhat_setBalance', [actor, '0x100000000000000'])))

    // Create the fiat token to fund
    const testERC20Factory = await ethers.getContractFactory('TestERC20')
    const fiatToken = await testERC20Factory.deploy()

    // Give all the actors a large balance
    const signers = await Promise.all(actors.map((actor) => ethers.getImpersonatedSigner(actor)))
    await Promise.all(signers.map((signer) => fiatToken.mint(signer.address, actorBalances.get(signer.address)!)))

    // Deploy the Uniswap V3 contracts
    const [owner] = await ethers.getSigners()
    const { factory: uniswapFactory } = await UniswapV3Deployer.deploy(owner)

    // Create the reserve funding contract
    const reserveFundingFactory = await ethers.getContractFactory('ReserveFunding')
    const reserveFunding = await reserveFundingFactory.deploy(
      fiatToken.address,
      targetLiquidity,
      uniswapFactory.address
    )

    return { fiatToken, reserveFunding }
  }

const setupModelRun = async (
  systemFixture: SystemFixture,
  actorBalances: Map<string, BigNumber>
): Promise<{ real: System; model: Model }> => {
  const system = await loadFixture(systemFixture)
  return {
    real: system,
    model: {
      state: await State.query(system.reserveFunding),
      initialActorBalances: actorBalances,
    },
  }
}
