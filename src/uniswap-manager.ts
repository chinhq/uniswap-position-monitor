import { ethers } from 'ethers';
import { Pool, Position, nearestUsableTick } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as IUniswapV3FactoryABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import { abi as INonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json';
import { abi as IERC20MetadataABI } from '@openzeppelin/contracts/build/contracts/IERC20Metadata.json';
import { abi as IMulticall } from '@uniswap/v3-periphery/artifacts/contracts/interfaces/IMulticall.sol/IMulticall.json';
import { abi as SwapRouterABI } from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import chalk from 'chalk';
import Utils from './utils';
import {
  Networks,
} from './constants';
import AlchemyHelper from './alchemy';

export interface MintRequest {
  token0: string, //address
  token1: string, //address
  fee: number,
  maxAmount0: number,
  maxAmount1: number,
  priceLower: string,
  priceUpper: string,
}

interface TokenMeta {
  decimals: number,
  symbol: string,
  name: string,
}

interface TokenSummary {
  amount: string,
  meta: TokenMeta
}

interface PositionStatus {
  positionId: string,
  status: string,
  token0: TokenSummary,
  token1: TokenSummary,
}

interface State {
  tickSpacing: number,
  fee: number,
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

export default class UniswapManager {
  private static async getTokenMeta(tokenAddress: string, provider: ethers.providers.JsonRpcProvider): Promise<TokenMeta> {
    const tokenContract = new ethers.Contract(tokenAddress, IERC20MetadataABI, provider);
    const [decimals, symbol, name] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ])

    return {
      decimals: decimals,
      symbol: symbol,
      name: name,
    }
  }

  private static async getPoolData(
    poolAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<State> {
    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      provider
    );

    const [tickSpacing, fee, liquidity, slot] = await Promise.all([
      poolContract.tickSpacing(),
      poolContract.fee(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

    return {
      tickSpacing: tickSpacing,
      fee: fee,
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

  private static async getPosition(poolContract: ethers.Contract, priceLower: string, priceUpper: string, network: string) {
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const token0Addr = await poolContract.token0();
    const token1Addr = await poolContract.token1();
    const poolData = await this.getPoolData(poolContract.address, provider)

    const token0Data = await this.getTokenMeta(token0Addr, provider);
    const token1Data = await this.getTokenMeta(token1Addr, provider);
    const chainId = Networks[network].chainId;

    const token0 = new Token(chainId, token0Addr, token0Data.decimals, token0Data.symbol, token0Data.name)
    const token1 = new Token(chainId, token1Addr, token1Data.decimals, token1Data.symbol, token1Data.name)

    const pool = new Pool(
      token0,
      token1,
      poolData.fee,
      poolData.sqrtPriceX96.toString(),
      poolData.liquidity.toString(),
      poolData.tick
    )
    const lowerBound = Utils.getTickAtRatio(priceLower);
    const upperBound = Utils.getTickAtRatio(priceUpper);

    return Position.fromAmount0({
      pool: pool,
      tickLower: nearestUsableTick(lowerBound, poolData.tickSpacing),
      tickUpper: nearestUsableTick(upperBound, poolData.tickSpacing),
      amount0: ethers.utils.parseUnits('0.001', 18).toString(),
      // amount1: ethers.utils.parseUnits('0.001', 18).toString(),
      useFullPrecision: true
    });
  }

  // read mint request from csv file
  private static async getMintRequests(path: string) {
    const csv = require('csvtojson');
    const jsonArray = await csv().fromFile(path);
    return jsonArray;
  }


  private static async fetch(positionId: string, network: string): Promise<PositionStatus> {
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const nonfungiblePositionManagerContract = new ethers.Contract(
      Networks[network].uniswapNftPositionManager,
      INonfungiblePositionManagerABI,
      provider
    );
    const posInfo = await nonfungiblePositionManagerContract.positions(
      positionId
    );

    const factoryContract = new ethers.Contract(
      Networks[network].uniswapV3Factory,
      IUniswapV3FactoryABI,
      provider
    );
    const poolAddress = await factoryContract.getPool(
      posInfo.token0,
      posInfo.token1,
      posInfo.fee
    );
    const state = await this.getPoolData(poolAddress, provider);

    const token0Meta = await this.getTokenMeta(posInfo.token0, provider);
    const token1Meta = await this.getTokenMeta(posInfo.token1, provider);

    const token0 = new Token(
      Networks[network].chainId,
      posInfo.token0,
      token0Meta.decimals
    );
    const token1 = new Token(
      Networks[network].chainId,
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
      token0: { meta: token0Meta, amount: pos.amount0.quotient.toString() },
      token1: { meta: token1Meta, amount: pos.amount1.quotient.toString() },
    };

    const summary = `${token0Meta.symbol}:${ethers.utils.formatUnits(result.token0.amount, token0Meta.decimals).toString()} ${token1Meta.symbol}:${ethers.utils.formatUnits(result.token1.amount, token1Meta.decimals).toString()}`
    if (posInfo.liquidity.isZero()) {
      console.log(chalk.red(positionId, "Position is closed"), summary);
    } else if (pool.tickCurrent < posInfo.tickLower || pool.tickCurrent > posInfo.tickUpper) {
      console.log(chalk.yellow(positionId, "Position is out of range"), summary, chalk.yellow());
    } else {
      console.log(chalk.green(positionId, "Position is active"), summary)
    }

    return {
      positionId,
      token0: { meta: token0Meta, amount: pos.amount0.quotient.toString() },
      token1: { meta: token1Meta, amount: pos.amount1.quotient.toString() },
      status: posInfo.liquidity.isZero() ? 'CLOSED' : (pool.tickCurrent < posInfo.tickLower || pool.tickCurrent > posInfo.tickUpper ? 'OUT_OF_RANGE' : 'ACTIVE')
    }
  }

  static async approve(token: string, network: string) {
    console.log("Token", token, "Network", network, "Approving Uniswap Position Manager");
    const provider = Utils.getProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const approvalAmount = ethers.constants.MaxUint256.toString()
    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const transaction = await tokenContract.connect(wallet).approve(
      Networks[network].uniswapNftPositionManager,
      approvalAmount
    )
    return transaction.hash
  }

  static async fetchPosition(positionId: string, network: string): Promise<PositionStatus> {
    console.log('Fetching info for position', positionId);
    return this.fetch(positionId, network);
  }

  static async fetchAllPositions(address: string, network: string): Promise<PositionStatus[]> {
    console.log(address, network);
    const helper = new AlchemyHelper(network);
    const nfts = await helper.getNFTs(address, "0xC36442b4a4522E871399CD717aBDD847Ab11FE88")
    const tokenIds = nfts.ownedNfts.map((nft) => nft.tokenId);
    let result = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const status = await this.fetch(tokenIds[i], network);
      result.push(status);
    }
    return result;
  }

  static async mintPosition(mintRequest: MintRequest, network: string): Promise<string> {
    console.log("Minting position", mintRequest, "Network", network)
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);

    const nonfungiblePositionManagerContract = new ethers.Contract(
      Networks[network].uniswapNftPositionManager,
      INonfungiblePositionManagerABI,
      provider
    )

    const factoryContract = new ethers.Contract(
      Networks[network].uniswapV3Factory,
      IUniswapV3FactoryABI,
      provider
    );

    const poolAddress = await factoryContract.getPool(
      mintRequest.token0,
      mintRequest.token1,
      mintRequest.fee
    );
    console.log("poolAddress", poolAddress);
    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      provider
    )

    const token0Addr = await poolContract.token0();
    const token1Addr = await poolContract.token1();


    const position = await this.getPosition(poolContract, mintRequest.priceLower, mintRequest.priceUpper, network);

    const wallet = await Utils.getWallet(provider);

    const { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts
    console.log('amounts', token0Addr, amount0Desired.toString(), token1Addr, amount1Desired.toString());

    const params = {
      token0: token0Addr,
      token1: token1Addr,
      fee: mintRequest.fee,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0Desired: amount0Desired.toString(),
      amount1Desired: amount1Desired.toString(),
      amount0Min: 0,
      amount1Min: 0,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + (60 * 10)
    }

    const transaction = await nonfungiblePositionManagerContract.connect(wallet).mint(params);
    console.log(transaction.hash)
    return transaction.hash;
  }

  static async mintPositions(path: string, network: string): Promise<string[]> {
    console.log('Minting positions');
    const mintRequests = await UniswapManager.getMintRequests(path);
    let result = [];
    for (let i = 0; i < mintRequests.length; i++) {
      const mintRequest = mintRequests[i];
      const hash = await UniswapManager.mintPosition(mintRequest, network);
      result.push(hash);
    }
    return result;
  }

  static async removePosition(positionId: string, network: string): Promise<string> {
    console.log('Remove position with id', positionId);
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const nonfungiblePositionManagerContract = new ethers.Contract(
      Networks[network].uniswapNftPositionManager,
      INonfungiblePositionManagerABI,
      provider
    );
    const posInfo = await nonfungiblePositionManagerContract.positions(
      positionId
    );
    const totalLiquidity = posInfo.liquidity.toString()

    const params = {
      tokenId: positionId,
      liquidity: totalLiquidity,
      amount0Min: 0,
      amount1Min: 0,
      deadline: Math.floor(Date.now() / 1000) + (60 * 10),
    }
    const removeData = (await nonfungiblePositionManagerContract.populateTransaction.decreaseLiquidity(params)).data!;
    const collectParams = {
      tokenId: positionId,
      recipient: wallet.address,
      amount0Max: '0xffffffffffffffffffffffffffffffff', // maxUint128
      amount1Max: '0xffffffffffffffffffffffffffffffff',
    }
    const collectData = (await nonfungiblePositionManagerContract.populateTransaction.collect(collectParams)).data!;
    return this.multicall([removeData, collectData], network);
  }

  // Collects all fees for a given position
  static async collectAllFees(tokenId: string, network: string): Promise<string> {
    console.log('Collecting all tokens for position', tokenId);
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const nonfungiblePositionManagerContract = new ethers.Contract(
      Networks[network].uniswapNftPositionManager,
      INonfungiblePositionManagerABI,
      provider
    );
    const params = {
      tokenId: tokenId,
      recipient: wallet.address,
      amount0Max: '0xffffffffffffffffffffffffffffffff', // maxUint128
      amount1Max: '0xffffffffffffffffffffffffffffffff',
    }
    const transaction = await nonfungiblePositionManagerContract.connect(wallet).collect(params)
    console.log(transaction.hash)
    return transaction.hash
  }

  // Uniswap V3 - Call multiple functions in one transaction
  static async multicall(data: string[], network: string): Promise<string> {
    console.log('Multicall');
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const nonfungiblePositionManagerContract = new ethers.Contract(
      Networks[network].uniswapNftPositionManager,
      IMulticall,
      provider
    );
    const transaction = await nonfungiblePositionManagerContract.connect(wallet).multicall(data)
    console.log(transaction.hash)
    return transaction.hash
  }

  static async swap(amount: string, token: string, toToken: string, fee: number, network: string): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);

    const factoryContract = new ethers.Contract(
      Networks[network].uniswapV3Factory,
      IUniswapV3FactoryABI,
      provider
    );

    const poolAddress = await factoryContract.getPool(
      token,
      toToken,
      fee
    );

    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      provider
    )
    const poolData = await this.getPoolData(poolAddress, provider)

    const swapRouterContract = new ethers.Contract(
      Networks[network].uniswapSwapRouter,
      SwapRouterABI,
      provider
    )

    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const decimals = await tokenContract.decimals()

    const amountIn = ethers.utils.parseUnits(
      amount,
      decimals
    )

    const params = {
      tokenIn: token,
      tokenOut: toToken,
      fee: poolData.fee,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + (60 * 10),
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0, //ignored
    }

    const transaction = await swapRouterContract.connect(wallet).exactInputSingle(params)
    console.log(transaction.hash)
    return transaction.hash
  }
}