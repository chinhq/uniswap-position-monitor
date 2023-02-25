// REST API handlers for the position commands
// Powered by Fastify
import fastify from "fastify";
import UniswapManager from "./uniswap-manager";
import EulerManager from "./euler-manager";
import KeyManager from "./key-manager";
import { MintRequest } from "./uniswap-manager";
import * as dotenv from 'dotenv';
dotenv.config();

const app = fastify();

interface IPositionParams {
  id: string;
}
interface INetworkQuery {
  network: string;
}
interface EulerDepositRequest {
  amount: string;
  token: string;
}

interface EulerShortRequest {
  amount: string;
  token: string;
  toToken: string;
  fee: number;
}

// POST /uni/:token/approve approves a token to be spent by the UniswapManager
// params: token - the token to approve
// query: network - the network to use. Default to goerli
// returns the transaction hash
// curl -X POST -H "Content-Type: application/json" -d '{}' localhost:3000/uni/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/approve
app.post<{Params: {token: string}, Querystring: INetworkQuery }>("/uni/:token/approve", async (request, reply) => {
  const { network } = request.query;
  const hash = await UniswapManager.approve(request.params.token, network || 'goerli')
  reply.send({hash: hash})
});

// curl localhost:3000/positions/55722
app.get<{ Params: IPositionParams, Querystring: INetworkQuery }>("/uni/positions/:id", async (request, reply) => {
  // get tokenId from params
  const tokenId = request.params.id;
  const { network } = request.query;
  const position = await UniswapManager.fetchPosition(tokenId, network || 'goerli');
  reply.send(position);
})

// curl localhost:3000/uni/positions\?address=0xfd453e341bacaec3a26c5f60a90c7c4fd3d52d5c
app.get<{ Querystring: { address: string, network: string } }>("/uni/positions", async (request, reply) => {
  const { address, network } = request.query;
  console.log(address)
  const positions = await UniswapManager.fetchAllPositions(address, network || 'goerli');
  reply.send(positions);
})

//curl -X POST -H "Content-Type: application/json" -d '{"token0":"0x1f9840a85d5af5bf1d1762f925bdaddc4201f984","token1":"0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6","fee":3000,"maxAmount0":"0.001","maxAmount1":"0.002","priceLower":"0.7","priceUpper":"0.8"}' localhost:3000/uni/positions
app.post<{ Body: MintRequest, Querystring: INetworkQuery }>("/uni/positions", async (request, reply) => {
  const mintRequest = request.body;
  const { network } = request.query;
  const hash = await UniswapManager.mintPosition(mintRequest, network || 'goerli');
  reply.send({hash: hash})
})

//curl -X DELETE localhost:3000/uni/positions/56868
app.delete<{ Params: IPositionParams, Querystring: INetworkQuery }>("/uni/positions/:id", async (request, reply) => {
  // get tokenId from params
  const tokenId = request.params.id;
  const { network } = request.query;
  const hash = await UniswapManager.removePosition(tokenId, network || 'goerli');
  reply.send({hash: hash})
})

// curl -X POST -H "Content-Type: application/json" -d '{}' localhost:3000/euler/0x693FaeC006aeBCAE7849141a2ea60c6dd8097E25/approve
app.post<{Params: {token: string}, Querystring: INetworkQuery }>("/euler/:token/approve", async (request, reply) => {
  const { network } = request.query;
  const hash = await EulerManager.approve(request.params.token, network || 'goerli')
  reply.send({hash: hash})
});

// curl -X POST -H "Content-Type: application/json" -d '{"amount":"0.001","token":"0x693faec006aebcae7849141a2ea60c6dd8097e25"}' localhost:3000/euler/deposit
app.post<{ Body: EulerDepositRequest, Querystring: INetworkQuery }>("/euler/deposit", async (request, reply) => {
  const dr = request.body;
  const { network } = request.query;
  const hash = await EulerManager.deposit(dr.amount, dr.token, network || 'goerli');
  reply.send({hash: hash})
})

// curl -X POST -H "Content-Type: application/json" -d '{"amount":"0.001","token":"0x693faec006aebcae7849141a2ea60c6dd8097e25","toToken":"0xa3401dfdbd584e918f59fd1c3a558467e373dacc","fee":3000}' localhost:3000/euler/short
app.post<{ Body: EulerShortRequest, Querystring: INetworkQuery }>("/euler/short", async (request, reply) => {
  const shortRequest = request.body;
  const { network } = request.query;
  const hash = await EulerManager.short(shortRequest.amount, shortRequest.token, shortRequest.toToken, shortRequest.fee, network || 'goerli');
  reply.send({hash: hash})
})

app.listen({ port: 3000 }, async (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  await KeyManager.getPrivateKey(process.env.PRV_KEY_PATH);
  console.log(`Server listening at ${address}`);
})
