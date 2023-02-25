import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import inquirer from 'inquirer';
import { ethers } from 'ethers';
import GlobalKey from './global-key';


class KeyManager {
  private static cipherAlgo = 'aes-256-cbc'
  private static hashFunc = 'sha256'

  private static hashPassword(password: string): Buffer {
    const hash = createHash(this.hashFunc);
    hash.update(password);
    return Buffer.from(hash.digest());
  }

  static async getPrivateKey(path: string | undefined): Promise<string> {
    if (path == undefined) throw(Error('No key file provided'));
    const keyManager = GlobalKey.getInstance();
    if (keyManager.hasKey()) return keyManager.getKey();
    const password = await KeyManager.getPassword(false);
    const privateKey = KeyManager.readEncrypted(path, password);
    keyManager.setKey(privateKey);
    return privateKey;
  }
  
  // create an ECDSA keypair and save the private key to an encrypted file
  static createPrivateKey(outputPath: string, password: string) {
    const wallet = ethers.Wallet.createRandom()
    const privateKey = wallet.privateKey;
    this.writeEncrypted(privateKey, outputPath, password)
  }

  static writeEncrypted(inputString: string, outputPath: string, password: string) {
    // Generate a random 16-byte initialization vector
    const iv = randomBytes(16);
  
    // Create the cipher using the AES-256-CBC algorithm
    const cipher = createCipheriv(this.cipherAlgo, this.hashPassword(password), iv);
  
    // Encrypt the input string
    const encrypted = Buffer.concat([cipher.update(inputString), cipher.final()]);

    // check if outputPath exists, if yes, throw error
    if (existsSync(outputPath)) throw Error('Key file already exists');
    writeFileSync(outputPath, JSON.stringify({ iv: iv.toString('hex'), encrypted: encrypted.toString('hex')}))

  }

  static readEncrypted(inputPath: string | undefined, password: string) {
    if (inputPath == undefined) throw Error('No key file provided');
    const data = JSON.parse(readFileSync(inputPath, 'utf8'));
    const iv = Buffer.from(data.iv, 'hex');
    const encrypted = Buffer.from(data.encrypted, 'hex');
    const decipher = createDecipheriv(this.cipherAlgo, this.hashPassword(password), iv);
    // Updating encrypted text
    let decrypted = decipher.update(encrypted);
    try {
      decrypted = Buffer.concat([decrypted, decipher.final()]);
    } catch(e) {
      throw Error('Invalid password');
    }
    // returns data after decryption
    return decrypted.toString();
  }

  static async getPassword(isCreate: boolean): Promise<string> {
    let prompts = [
      {
        type: 'password',
        name: 'password',
        message: 'Enter password',
        validate: (input: string) => {
          if (input.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return true;
        },
      },
    ]
    if (isCreate) prompts.push(
      {
        type: 'password',
        name: 'passwordConf',
        message: 'Confirm password',
        validate: (input: string) => {
          if (input.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return true;
        },
      }
    )

    const answers = await inquirer.prompt(prompts)

    if (isCreate) {
      if (answers.password !== answers.passwordConf) throw Error('Passwords do not match');
    }

    return answers.password!;
  }
}

export default KeyManager;
