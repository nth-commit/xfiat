import { ReserveFunding } from '../../typechain-types'

export type State = 'liquidityAccumulating' | 'liquidityLocked' | 'liquidityExposed' | 'completed' | 'cancelled'

export namespace State {
  export function parse(state: number): State {
    switch (state) {
      case 0:
        return 'liquidityAccumulating'
      case 1:
        return 'liquidityLocked'
      case 2:
        return 'liquidityExposed'
      case 3:
        return 'completed'
      case 4:
        return 'cancelled'
      default:
        throw new Error(`Unhandled state: ${state}`)
    }
  }

  export async function query(reserveFunding: ReserveFunding): Promise<State> {
    return parse(await reserveFunding.state())
  }
}
