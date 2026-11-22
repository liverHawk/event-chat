export type MockWebSocket = WebSocket & {
  receivedMessages: string[]
  closedCode?: number
  closedReason?: string
  peer?: MockWebSocket
}

const createSocket = (): MockWebSocket => {
  let attachment: unknown = null
  const sock: MockWebSocket = {
    receivedMessages: [] as string[],
    readyState: 1,
    send(data: string | ArrayBuffer) {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
      if (sock.peer) sock.peer.receivedMessages.push(text)
    },
    close(code = 1000, reason = '') {
      sock.readyState = 3
      sock.closedCode = code
      sock.closedReason = reason
    },
    serializeAttachment(value: unknown) {
      attachment = JSON.parse(JSON.stringify(value))
    },
    deserializeAttachment() {
      return attachment ? JSON.parse(JSON.stringify(attachment)) : null
    },
  } as unknown as MockWebSocket
  return sock
}

export const setupWorkersTestGlobals = (): void => {
  const g = globalThis as Record<string, unknown>
  if (g.__workersMockInstalled) return
  g.__workersMockInstalled = true
  g.WebSocketPair = class {
    0: MockWebSocket
    1: MockWebSocket
    constructor() {
      const client = createSocket()
      const server = createSocket()
      client.peer = server
      server.peer = client
      this[0] = client
      this[1] = server
    }
  }
  const OrigResponse = globalThis.Response
  globalThis.Response = class extends OrigResponse {
    constructor(body?: BodyInit | null, init?: ResponseInit & { webSocket?: WebSocket }) {
      if (init?.status === 101) {
        return {
          status: 101,
          ok: false,
          headers: new Headers(init.headers),
          webSocket: init.webSocket,
        } as unknown as Response
      }
      super(body, init)
    }
  } as typeof Response
}
