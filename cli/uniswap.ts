import { Command } from "commander";
import UniswapManager from "../src/uniswap-manager"
import * as dotenv from 'dotenv';
dotenv.config();

class RootCommand extends Command {
  createCommand(name: string) {
    const cmd = new Command(name);
    cmd.option('-n, --network <name>', 'network to use. Default to goerli', 'goerli');
    return cmd;
  }
}

const program = new RootCommand();

program
  .name('uniswap')
  .description('CLI to uniswap smart contracts')
  .version('0.8.0')

// DONE
program.command('fetch')
  .description('Fetch a position')
  .argument('<token-id>', 'position id to fetch')
  .action((tokenId, options) => {
    UniswapManager.fetchPosition(tokenId, options.network);
  });

// DONE 
program.command('fetch-all')
  .description('Fetch all positions for an address')
  .argument('<address>', 'owner address to fetch')
  .action((address, options) => {
    UniswapManager.fetchAllPositions(address, options.network);
  });


// DONE
program.command('mint')
  .description('Mint a position')
  .argument('<csv-path>', 'list of positions to mint')
  .action((csvPath, options) => {
    UniswapManager.mintPositions(csvPath, options.network);
  });

program.command('remove')
  .description('Remove liquidity from a position')
  .argument('<token-id>', 'position id to remove')
  .action((tokenId, options) => {
    UniswapManager.removePosition(tokenId, options.network);
  });

program.command('collect')
  .description('Collect all tokens from a position')
  .argument('<token-id>', 'position id to collect')
  .action((tokenId, options) => {
    UniswapManager.collectAllFees(tokenId, options.network);
  });

program.parse();  