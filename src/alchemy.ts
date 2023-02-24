import { Alchemy, GetBaseNftsForOwnerOptions } from "alchemy-sdk";
import { Networks } from "./constants";

export default class AlchemyHelper {
  alchemy: Alchemy;
  constructor(network: string) {
    this.alchemy = new Alchemy({url: Networks[network].rpcUrl});    
  }
  async getNFTs(owner: string, contract: string) {
    const options: GetBaseNftsForOwnerOptions = {contractAddresses: [contract], omitMetadata: true};
    return this.alchemy.nft.getNftsForOwner(owner, options)
  }
}