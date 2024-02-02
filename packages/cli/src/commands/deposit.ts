import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { getContract } from 'viem'
import { abi as bojAbi } from '../../../hardhat/artifacts/contracts/PrivateToken.sol/PrivateToken.json'
import { delay } from 'boj-utils'

export default class Deposit extends BaseCommand<typeof Deposit> {
  static description = 'deposit tokens in a bank of jubjub contract'

  static examples = [
    '',
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    bojAddress: Flags.string({ char: 'b' })
  }

  static args = {
    amount: Args.string({ description: 'amount to deposit' }),
    to: Args.string({ description: 'Bank of jubjub account to send to' })
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Deposit)

    const bojContractAddress = flags.bojAddress ?
      flags.bojAddress : this.userConfig.bojContractAddress

    let privateToken = await getContract({
      abi: bojAbi,
      address: bojContractAddress as `0x${string}`,
      client: {
        public: this.publicClient,
        wallet: this.walletClient
      }
    });

    const hash = await privateToken.write.deposit([
      BigInt(args.amount!),
      args.to,
      0,
    ]);

    await delay(5000);

    const receipt = await this.publicClient.getTransactionReceipt({ hash });
    console.log(receipt);
  }
}
