import { DatabaseSync } from 'node:sqlite'
import type { MockWebSocket } from './ws-mock.ts'

export type ChatRoomClassType = new (
  ctx: DurableObjectState,
  env: unknown,
) => {
  fetch(req: Request): Promise<Response>
  webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void>
  webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void>
}

export const createTestChatRoomNamespace = (
  ChatRoomClass: ChatRoomClassType,
  getEnv: () => unknown,
) => {
  const instances = new Map<string, InstanceType<ChatRoomClassType>>()
  const rawDbs = new Map<string, DatabaseSync>()

  const getOrCreate = (roomKey: string) => {
    const existing = instances.get(roomKey)
    if (existing) return existing
    const db = new DatabaseSync(':memory:')
    rawDbs.set(roomKey, db)
    const sockets = new Set<MockWebSocket>()
    const ctx = {
      storage: {
        sql: {
          exec<T>(query: string, ...bindings: unknown[]) {
            const params = bindings.map((v) =>
              v === undefined ? null : (v as string | number | null),
            )
            const upper = query.trim().toUpperCase()
            if (upper.startsWith('SELECT') || upper.includes('RETURNING')) {
              const rows = db.prepare(query).all(...params) as T[]
              return {
                toArray: () => rows,
                one: () => {
                  if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`)
                  return rows[0]
                },
              }
            }
            if (params.length === 0) db.exec(query)
            else db.prepare(query).run(...params)
            return {
              toArray: () => [] as T[],
              one: () => {
                throw new Error('No rows')
              },
            }
          },
        },
      },
      acceptWebSocket(ws: WebSocket) {
        sockets.add(ws as MockWebSocket)
      },
      getWebSockets() {
        return Array.from(sockets).filter((s) => s.readyState === 1)
      },
    } as unknown as DurableObjectState
    const instance = new ChatRoomClass(ctx, getEnv())
    instances.set(roomKey, instance)
    return instance
  }

  const namespace = {
    idFromName: (name: string) => ({ toString: () => name }) as DurableObjectId,
    get: (id: DurableObjectId) => ({
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const req = input instanceof Request ? input : new Request(input, init)
        return getOrCreate(id.toString()).fetch(req)
      },
    }),
  } as unknown as DurableObjectNamespace

  return {
    namespace,
    getInstance: getOrCreate,
    getRawDb: (roomKey: string) => rawDbs.get(roomKey),
  }
}
