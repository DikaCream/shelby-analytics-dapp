const RPC_URL = import.meta.env.VITE_SHELBY_RPC_URL || 'https://rpc.testnet.shelby.xyz'
const NETWORK = import.meta.env.VITE_SHELBY_NETWORK || 'testnet'

class MockShelbyClient {
  config: { rpcUrl: string; network: string }

  constructor(config: { rpcUrl: string; network: string }) {
    this.config = config
    console.info(`[Shelby] Terhubung ke ${config.network} @ ${config.rpcUrl}`)
  }

  async openPaymentChannel(): Promise<string> {
    await this._delay(300)
    return `channel_${Math.random().toString(36).slice(2, 10)}`
  }

  async writeBlob(opts: {
    data: Uint8Array | string
    durationDays?: number
    onProgress?: (pct: number) => void
  }): Promise<string> {
    for (let i = 1; i <= 5; i++) {
      await this._delay(200)
      opts.onProgress?.(i * 20)
    }
    return `blob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }

  async readBlob(opts: {
    blobId: string
    onProgress?: (pct: number) => void
  }): Promise<Uint8Array> {
    await this._delay(400)
    opts.onProgress?.(100)
    return new Uint8Array(0)
  }

  private _delay(ms: number) {
    return new Promise(r => setTimeout(r, ms))
  }
}

export const shelbyClient = new MockShelbyClient({ rpcUrl: RPC_URL, network: NETWORK })