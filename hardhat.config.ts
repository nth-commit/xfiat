import '@nomicfoundation/hardhat-toolbox'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-watcher'

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
