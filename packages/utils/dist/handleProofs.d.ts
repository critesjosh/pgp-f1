import { EncryptedBalanceArray } from "boj-types";
export declare function getProcessTransferInputs(to: string, oldEncBalance: EncryptedBalanceArray, newBalance: number): void;
export declare function getTransferProof(): Promise<`0x${string}`>;
export declare function getProcessDepositProof(): Promise<`0x${string}`>;
export declare function getProcessTransfersProof(): Promise<`0x${string}`>;
export declare function getAddEthSignerProof(): Promise<`0x${string}`>;
export declare function getWithdrawProof(): Promise<`0x${string}`>;
