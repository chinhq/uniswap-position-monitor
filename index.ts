import {ethers} from 'ethers';
import {Pool, Position} from '@uniswap/v3-sdk';
import {Token} from '@uniswap/sdk-core';
import {abi as IUniswapV3PoolABI} from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import {abi as IUniswapV3FactoryABI} from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import {abi as INonfungiblePositionManagerABI} from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json';
import {abi as IERC20MetadataABI} from '@openzeppelin/contracts/build/contracts/IERC20Metadata.json';
import * as Enquirer from 'enquirer';
const enquirer = new Enquirer();

import {
  UNISWAP_V3_FACTORY,
  UNISWAP_NFT_POSITION_MANAGER,
  CHAIN_IDS,
  RPC_URLS,
} from './constants';

interface State {
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

interface TokenMeta {
  decimals: number;
  symbol: string;
}

async function getPoolState(
  poolAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<State> {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };
}

async function getTokenMeta(
  tokenAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<TokenMeta> {
  const token0Contract = new ethers.Contract(
    tokenAddress,
    IERC20MetadataABI,
    provider
  );
  return {
    decimals: await token0Contract.decimals(),
    symbol: await token0Contract.symbol(),
  };
}

async function fetch(positionId: number, network: string) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URLS[network]);
  const nonfungiblePositionManagerContract = new ethers.Contract(
    UNISWAP_NFT_POSITION_MANAGER,
    INonfungiblePositionManagerABI,
    provider
  );
  const posInfo = await nonfungiblePositionManagerContract.positions(
    positionId
  );
  const factoryContract = new ethers.Contract(
    UNISWAP_V3_FACTORY,
    IUniswapV3FactoryABI,
    provider
  );
  const poolAddress = await factoryContract.getPool(
    posInfo.token0,
    posInfo.token1,
    posInfo.fee
  );
  const state = await getPoolState(poolAddress, provider);

  const token0Meta = await getTokenMeta(posInfo.token0, provider);
  const token1Meta = await getTokenMeta(posInfo.token1, provider);

  const token0 = new Token(
    CHAIN_IDS[network],
    posInfo.token0,
    token0Meta.decimals
  );
  const token1 = new Token(
    CHAIN_IDS[network],
    posInfo.token1,
    token1Meta.decimals
  );

  const pool = new Pool(
    token0,
    token1,
    posInfo.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );

  const pos = new Position({
    pool: pool,
    liquidity: posInfo.liquidity,
    tickLower: posInfo.tickLower,
    tickUpper: posInfo.tickUpper,
  });
  const result = {
    token0: {meta: token0Meta, amount: pos.amount0.quotient.toString()},
    token1: {meta: token1Meta, amount: pos.amount1.quotient.toString()},
  };
  console.log(result);
}

async function main() {
  const args: {[key: string]: any} = await enquirer.prompt([
    {
      type: 'select',
      choices: ['mainnet', 'arbitrumOne'],
      name: 'network',
      message: 'Which network?',
    },
    {type: 'input', name: 'positionId', message: 'NFT Position ID'},
  ]);
  const network = args['network'];
  const positionId = +args['positionId'];
  console.log('Fetching info for position', positionId);
  fetch(positionId, network);
}

main().catch(console.log);
