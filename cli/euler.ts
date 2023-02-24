import { Command } from "commander";
import EulerManager from "../src/euler-manager";
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
  .name('position')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0')

// DONE
program.command('approve')
  .description('Approve Euler to spend a token')
  .argument('<currency>', 'token to approve')
  .action((currency, options) => {
    EulerManager.approve(currency, options.network)
  });

// DONE 
program.command('deposit')
  .description('Deposit to Euler main account (0)')
  .argument('<amount>', 'amount to deposit')
  .argument('<currency>', 'currency to deposit')
  .action((amount, currency, options) => {
    EulerManager.deposit(amount, currency, options.network)
  });

// DONE
program.command('mint')
  .description('Mint a debt position')
  .argument('<amount>', 'amount to mint')
  .argument('<currency>', 'currency to mint')
  .action((amount, currency, options) => {
    EulerManager.mint(amount, currency, options.network)
  });

program.command('short')
  .description('Short a token')
  .argument('<amount>', 'amount to short')
  .argument('<currency>', 'token to short')
  .argument('<to-currency>', 'token to receive from the short')
  .argument('<fee>', 'Uniswap pool fee')
  .action((amount, currency, toCurrency, fee, options) => {
    EulerManager.short(amount, currency, toCurrency, fee, options.network);
  });

program.parse();
