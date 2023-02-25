# Interactive Client for Uniswap & Euler
The project is used to interact with different smart contract functions on Uniswap V3 (all supported-networks except Celo) and Euler (Ethereum mainnet)
User has the option to use command-line tools or a web server
## Setting up
```
npm install
```

## Environment Variables
The API server and the commands that require write permission require the private key path to be set\
We can either set it in a .env file with the following content
```
PRV_KEY_PATH=./keys/mywallet.json
```
Or set it in the shell
```
export PRV_KEY_PATH=./keys/mywallet.json
```

## Create a new Encrypted Private Key
```
npx ts-node cli/key create <path-to-key>
```
Once the key is created, set your PRV_KEY_PATH env to `<path-to-key>`


## API Server
To start the server, run
```
npx ts-node src/api
```

## Command-line tools
### Uniswap
```
npx ts-node cli/uniswap 
```

### Euler
```
npx ts-node cli/uniswap 
```

### Key
```
npx ts-node cli/key 
```