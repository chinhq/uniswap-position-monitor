const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_NFT_POSITION_MANAGER = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const UNISWAP_SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'

export const Networks : {[key: string]: {[key: string]: any}} = {
  mainnet: {
    chainId: 1,
    name: 'mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/2hKGvFJBVfFtYlu6t6dRA0gklAxicYxF',
    uniswapV3Factory: UNISWAP_V3_FACTORY,
    uniswapNftPositionManager: UNISWAP_NFT_POSITION_MANAGER,
    uniswapSwapRouter: UNISWAP_SWAP_ROUTER,
    euler: '0x27182842E098f60e3D576794A5bFFb0777E025d3',
    // uniToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    // wethToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  goerli: {
    chainId: 5,
    name: 'goerli',
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/M22enwrgPGKXfR3VSCcSnZiGprg5HSEn',
    uniswapV3Factory: UNISWAP_V3_FACTORY,
    uniswapNftPositionManager: UNISWAP_NFT_POSITION_MANAGER,
    uniswapSwapRouter: UNISWAP_SWAP_ROUTER,
    euler: '0x931172BB95549d0f29e10ae2D079ABA3C63318B3',
    // uniToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    // wethToken: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  },
  arbitrumOne: {
    chainId: 42161,
    name: 'arbitrum',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/AtIYjgcxlhkJ0BLmdPOYJRsp6P8H3oMa',
    uniswapV3Factory: UNISWAP_V3_FACTORY,
    uniswapNftPositionManager: UNISWAP_NFT_POSITION_MANAGER,
    uniswapSwapRouter: UNISWAP_SWAP_ROUTER,
    // uniToken: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    // wethToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  }
}