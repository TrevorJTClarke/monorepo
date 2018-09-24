import * as ethers from "ethers";
import { Address, Bytes, H256 } from "../../types";
import { Abi } from "./types";

export function proxyCallSetStateData(
  appStateHash: H256,
  appCfAddr: H256,
  appLocalNonce: number,
  timeout: number,
  signatures: Bytes,
  registry: Address
): Bytes {
  return new ethers.Interface([Abi.proxyCall]).functions.proxyCall.encode([
    registry,
    appCfAddr,
    new ethers.Interface([Abi.setState]).functions.setState.encode([
      appStateHash,
      appLocalNonce,
      timeout,
      signatures
    ])
  ]);
}
