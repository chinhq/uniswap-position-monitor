import {ethers} from 'ethers';
import {abi as IERC20MetadataABI} from '@openzeppelin/contracts/build/contracts/IERC20Metadata.json';
import { Euler } from '@eulerxyz/euler-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

import Utils from './utils'

import { Networks } from './constants';
const chainId: number = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1;

export default class EulerManager {
  static async approve(token: string, network: string): Promise<string> {
    if (Networks[network].euler == undefined) {
      throw new Error('No Euler contract address for network')
    }
    const provider = Utils.getProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const approvalAmount = ethers.constants.MaxUint256.toString()
    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const transaction = await tokenContract.connect(wallet).approve(
      Networks[network].euler,
      approvalAmount
    )
    console.log(transaction.hash);
    return transaction.hash
  }

  static async deposit(amount: string, token: string, network: string): Promise<string> {
    const provider = Utils.getProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const euler = new Euler(wallet, chainId);
    const eCurrency = await euler.eTokenOf(token)
    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const decimals = await tokenContract.decimals()

    const batchItems = [
      {
        contract: eCurrency, // eToken contract
        method: 'deposit', // method name
        args: [0, ethers.utils.parseUnits(amount, decimals)], // method arguments
      },
      {
        contract: 'markets',
        method: 'enterMarket',
        args: [0, token]
      }
    ]
    const tx = await euler.contracts.exec.batchDispatch(euler.buildBatch(batchItems), [])
    // const receipt = await tx.wait();
    // console.log(receipt.transactionHash)
    console.log(tx.hash)
    return tx.hash
  }

  static async mint(amount: string, token: string, network: string): Promise<string> {
    const provider = Utils.getProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const euler = new Euler(wallet, chainId);
    const eCurrency = await euler.eTokenOf(token)
    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const decimals = await tokenContract.decimals()
    const transaction = await eCurrency.mint(0, ethers.utils.parseUnits(amount, decimals))
    console.log(transaction.hash);
    return transaction.hash
  }

  static async short(amount: string, token: string, toToken: string, fee: number, network: string): Promise<string> {
    const provider = Utils.getProvider(Networks[network].rpcUrl);
    const wallet = await Utils.getWallet(provider);
    const euler = new Euler(wallet, chainId);

    const eCurrency = await euler.eTokenOf(token);
    const tokenContract = new ethers.Contract(token, IERC20MetadataABI, provider)
    const decimals = await tokenContract.decimals()

    const mintAmount = ethers.utils.parseUnits(amount, decimals)
    const batchItems = [
      {
        contract: eCurrency, // eToken contract
        method: 'mint', // method name
        args: [0, mintAmount], // method arguments
      },
      {
        contract: euler.contracts.swap,
        method: 'swapUniExactInputSingle',
        args: [
          {
            subAccountIdIn: 0,
            subAccountIdOut: 0,
            underlyingIn: token,
            underlyingOut: toToken,
            amountIn: mintAmount,
            amountOutMinimum: 0,
            deadline: 0,
            fee: fee,
            sqrtPriceLimitX96: 0
          }
        ]
      }
    ]
    const tx = await euler.contracts.exec.batchDispatch(euler.buildBatch(batchItems), [wallet.address])
    // const receipt = await tx.wait();
    console.log(tx.hash)
    return tx.hash
  }
}
