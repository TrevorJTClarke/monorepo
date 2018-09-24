import { CfFreeBalance } from "./middleware/cf-operation/types";
import {
  Address,
  AppChannelInfo,
  AppChannelInfos,
  ChannelStates,
  H256,
  NetworkContext,
  OpCodeResult,
  StateChannelInfo,
  StateChannelInfos
} from "./types";
import { CounterfactualVM } from "./vm";

export class CfState {
  public channelStates: ChannelStates;
  public networkContext: NetworkContext;

  constructor(channelStates: ChannelStates, network: NetworkContext) {
    this.channelStates = channelStates;
    this.networkContext = network;
  }

  public stateChannel(multisig: Address): StateChannelInfo {
    return this.channelStates[multisig];
  }

  public stateChannelFromAddress(toAddress: Address): StateChannelInfo {
    const multisig = Object.keys(this.channelStates).find(multisig => {
      return this.channelStates[multisig].me === toAddress;
    });

    if (multisig) {
      return this.channelStates[multisig];
    } else {
      throw Error(`Could not find multisig for address ${toAddress}`);
    }
  }

  public stateChannelFromMultisigAddress(
    multisigAddress: Address
  ): StateChannelInfo {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress];
    } else {
      throw Error(`Could not find multisig of address ${multisigAddress}`);
    }
  }

  public app(multisig: Address, cfAddr: H256): AppChannelInfo {
    return this.channelStates[multisig].appChannels[cfAddr];
  }

  public freeBalanceFromAddress(toAddress: Address): CfFreeBalance {
    return this.stateChannelFromAddress(toAddress).freeBalance;
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: Address
  ): CfFreeBalance {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress].freeBalance;
    } else {
      throw Error(`Could not find multisig of address ${multisigAddress}`);
    }
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): StateChannelInfos {
    return JSON.parse(JSON.stringify(this.channelStates));
  }

  public appChannelInfos(): AppChannelInfos {
    const infos = {};
    for (const channel of Object.keys(this.channelStates)) {
      for (const appChannel of Object.keys(
        this.channelStates[channel].appChannels
      )) {
        infos[appChannel] = this.channelStates[channel].appChannels[appChannel];
      }
    }
    return infos;
  }
}

export class StateChannelInfoImpl implements StateChannelInfo {
  constructor(
    readonly counterParty: Address,
    readonly me: Address,
    readonly multisigAddress: Address,
    readonly appChannels: AppChannelInfos = {},
    readonly freeBalance: CfFreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}

export class AppChannelInfoImpl {
  public id?: H256;
  public amount?: any;
  public toSigningKey?: Address;
  public fromSigningKey?: Address;
  public stateChannel?: StateChannelInfo;
  public rootNonce?: number;
  public encodedState?: any;
  public appStateHash?: H256;
  public appState?: any;
  public localNonce?: number;
}

export class Context {
  public results: OpCodeResult[] = Object.create(null);
  public instructionPointer: number = Object.create(null);
  public vm: CounterfactualVM = Object.create(null);
}
