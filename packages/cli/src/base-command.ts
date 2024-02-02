import { Command, Flags, Interfaces } from '@oclif/core'
import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BabyJubJubUtils } from 'boj-utils';
import { PublicClient, createWalletClient, toBytes, toHex, createPublicClient, http, WalletClient, Chain, isAddress, PrivateKeyAccount } from 'viem';
import { mainnet, arbitrumSepolia, hardhat } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts';
const babyjub = new BabyJubJubUtils();

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

enum LogLevel {
    debug = 'debug',
    error = 'error',
    info = 'info',
    warn = 'warn',
}

type UserConfig = {
    bojPrivateKey: `0x${string}`,
    bojPublicKey: `0x${string}`,
    erc20Address: string,
    bojContractAddress: string,
    network: string,
    ethPrivateKey: `0x${string}`,
    ethAccount: PrivateKeyAccount
}

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {

    // define flags that can be inherited by any command that extends BaseCommand
    static baseFlags = {
        'log-level': Flags.custom<LogLevel>({
            helpGroup: 'GLOBAL',
            options: Object.values(LogLevel),
            summary: 'Specify level for logging.',
        })(),
    }

    // add the --json flag
    static enableJsonFlag = true

    protected args!: Args<T>
    protected flags!: Flags<T>
    public publicClient: PublicClient
    public walletClient: WalletClient
    public network: string
    public userConfig: UserConfig

    protected async catch(err: Error & { exitCode?: number }): Promise<unknown> {
        // add any custom logic to handle errors from the command
        // or simply return the parent class error handling
        return super.catch(err)
    }

    protected async finally(_: Error | undefined): Promise<unknown> {
        // called after run and catch regardless of whether or not the command errored
        return super.finally(_)
    }

    public async init(): Promise<void> {
        await super.init()
        const { args, flags } = await this.parse({
            args: this.ctor.args,
            baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
            enableJsonFlag: this.ctor.enableJsonFlag,
            flags: this.ctor.flags,
            strict: this.ctor.strict,
        })
        this.flags = flags as Flags<T>
        this.args = args as Args<T>

        await babyjub.init()

        // this setting controls where the config file is searched for
        // DEV looks in the project root for a config
        // anything else looks in the oclif default location, https://oclif.io/docs/config#custom-user-configuration
        const configFile =
            process.env.ENV === "DEV"
                ? path.join(__dirname, "..", "config.json")
                : path.join(this.config.configDir, "config.json");

        // Get the private key from, .env, or user config, or create a new one
        if (process.env.BOJ_PRIVATE_KEY && process.env.BOJ_PRIVATE_KEY.length > 0) {
            this.userConfig.bojPrivateKey = process.env.BOJ_PRIVATE_KEY as `0x${string}`
        } else {
            try {
                const data = await fs.readFileSync(configFile)
                this.userConfig = JSON.parse(data.toString())
            } catch {
                let { privateKey: newPrivateKey, publicKey } = await babyjub.generatePrivateAndPublicKey();
                let keys = { privateKey: "", publicKey: "" };
                keys.privateKey = toHex(newPrivateKey)
                keys.publicKey = toHex(babyjub.packPublicKey([toBytes(publicKey.x), toBytes(publicKey.y)]))
                console.log(keys)
                this.userConfig.bojPrivateKey = keys.privateKey as `0x${string}`
                console.log("No user config file found. Generating a key pair.");
            }
        }

        if (process.env.ETH_PRIVATE_KEY) {
            this.userConfig.ethPrivateKey = process.env.ETH_PRIVATE_KEY as `0x${string}`
        }
        this.userConfig.ethAccount = privateKeyToAccount(this.userConfig.ethPrivateKey)


        let publicKey = babyjub.privateToPublicKey(this.userConfig.bojPrivateKey);
        this.userConfig.bojPublicKey = toHex(babyjub.packPublicKey(
            [toBytes(publicKey.x),
            toBytes(publicKey.y)]));

        let chain: Chain
        switch (this.userConfig.network) {
            case "arbitrumSeplia":
                chain = arbitrumSepolia
            default:
                chain = hardhat
        }

        this.publicClient = createPublicClient({
            chain,
            transport: http()
        });

        this.walletClient = createWalletClient({
            chain,
            transport: http(),
            account: privateKeyToAccount(process.env.ETH_PRIVATE_KEY as `0x${string}`)
        })

        if (this.userConfig.erc20Address.length > 0 &&
            !isAddress(this.userConfig.erc20Address)) {
            throw new Error("User config has invalid erc20 address")
        }

        if (this.userConfig.bojContractAddress.length > 0 &&
            !isAddress(this.userConfig.bojContractAddress)) {
            throw new Error("User config has invalid boj contract address")
        }

    }
}

// src/commands/my-command.ts

// export default class MyCommand extends BaseCommand<typeof MyCommand> {
//     static examples = [
//         '<%= config.bin %> <%= command.id %>',
//         '<%= config.bin %> <%= command.id %> --json',
//         '<%= config.bin %> <%= command.id %> --log-level debug',
//     ]

//     static summary = 'child class that extends BaseCommand'

//     static flags = {
//         name: Flags.string({
//             char: 'n',
//             summary: 'Name to print.',
//             required: true,
//         }),
//     }

//     public async run(): Promise<Flags<typeof MyCommand>> {
//         for (const [flag, value] of Object.entries(this.flags)) {
//             this.log(`${flag}: ${value}`)
//         }

//         return this.flags
//     }
// }