import { Command } from "commander";
import * as dotenv from 'dotenv';
import KeyManager from "../src/key-manager";
import Utils from "../src/utils";
dotenv.config();

const program = new Command();

program
  .name('key-utils')
  .description('CLI to manage private keys')
  .version('0.8.0')

program.command('create')
  .description('Create a new private key')
  .argument('<path>', 'file path to store the key')
  .action(async (path, options) => {
    const password = await KeyManager.getPassword(true);
    KeyManager.createPrivateKey(path, password);
  });


program.command('get-address')
  .description('Get address from private key')
  .action(async (options) => {
    console.log((await Utils.getWallet()).address);
  });

program.parse();
