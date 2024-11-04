import Client from "@walletconnect/sign-client";
import type { SignClientTypes, EngineTypes } from "@walletconnect/types";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let WalletConnectModal: typeof import("@walletconnect/modal").WalletConnectModal;
import("@walletconnect/modal").then((module) => {
  WalletConnectModal = module.WalletConnectModal;
});
import type { EventEmitterService, WalletEvents } from "@near-wallet-selector/core";

class WalletConnectClient {
  private client!: Client;
  private emitter: EventEmitterService<WalletEvents>;
  private modal!: typeof WalletConnectModal.prototype;

  async init(opts: SignClientTypes.Options) {
    this.client = await Client.init(opts);
}

  constructor(emitter: EventEmitterService<WalletEvents>) {
    this.emitter = emitter;
  }

  get session() {
    return this.client.session;
  }

  on<Event extends SignClientTypes.Event>(
    event: Event,
    callback: (args: SignClientTypes.EventArguments[Event]) => void,
  ) {
    this.client.on(event, callback);

    return {
      remove: () => this.client.removeListener(event, callback),
    };
  }

  once<Event extends SignClientTypes.Event>(
    event: Event,
    callback: (args: SignClientTypes.EventArguments[Event]) => void,
  ) {
    this.client.once(event, callback);
  }

  async connect(params: EngineTypes.ConnectParams, projectId: string, chainId: string) {
    if (!this.modal) {
      this.modal = new WalletConnectModal({
        projectId,
        chains: [chainId],
      });
    }

    try {
      const { approval, uri } = await this.client.connect({
        ...params,
      });

      if (uri) {
        this.modal.openModal({ uri, standaloneChains: [chainId] });
        this.emitter.emit("uriChanged", { uri });
      }

      const session = await approval();
      return session;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        throw new Error(error.message);
      }
      return null;
    } finally {
      this.modal.closeModal();
    }
  }

  async request<Response>(params: EngineTypes.RequestParams): Promise<Response> {
    return this.client.request(params);
  }

  async disconnect(params: EngineTypes.DisconnectParams) {
    return this.client.disconnect(params);
  }
}

export default WalletConnectClient;
