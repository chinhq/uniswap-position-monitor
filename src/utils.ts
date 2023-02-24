import { ethers } from "ethers"
import { encodeSqrtRatioX96 } from "@uniswap/v3-sdk"
import { TickMath } from "@uniswap/v3-sdk"

export default class Utils {
  static getWallet(privateKey: string | undefined, provider: ethers.providers.JsonRpcProvider | undefined = undefined) {
    if (!privateKey) {
      throw new Error('No private key provided')
    }
    const wallet = new ethers.Wallet(privateKey, provider)
    return wallet
  }

  static getProvider(providerUrl: string | undefined) {
    if (!providerUrl) {
      throw new Error('No provider URL provided')
    }
    const provider = new ethers.providers.JsonRpcProvider(providerUrl)
    return provider
  }

  static getRatio(num: string | undefined) {
    if (!num) {
      throw new Error('No number provided')
    }
    const [whole, dec] = num.trim().split('.')
    let denominator = '1';
    let numerator = whole;
    if (dec) {
      denominator += '0'.repeat(dec.length)
      numerator = whole + dec
    }
    return [numerator, denominator]
  }

  static getTickAtRatio(num: string | undefined) {
    const [numerator, denominator] = Utils.getRatio(num);
    const sqrtRatioX96 = encodeSqrtRatioX96(numerator, denominator);
    return TickMath.getTickAtSqrtRatio(sqrtRatioX96);    
  }
}
