import '@nomicfoundation/hardhat-toolbox'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-watcher'
import fc from 'fast-check'

fc.configureGlobal({ numRuns: 10 })

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  watcher: {
    test: {
      tasks: ['test'],
      files: ['./contracts', './test'],
      clearOnStart: true,
    },
  },
}

export default config
