import { Message, realtime } from '@/lib/realtime'
import { redis } from '@/lib/redis'
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { authMiddleware } from './auth'

const ROOM_TTL_SECONDS = 60 * 10

const rooms = new Elysia({ prefix: '/room' }).post('/create', async () => {
    const roomId = nanoid()

    await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
    })

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS)

    return { roomId }
})

const messages = new Elysia({ prefix: '/messages' }).use(authMiddleware).post("/", async ({ body, auth }) => {
    const { sender, text } = body
    const { roomId } = auth

    const roomExists = await redis.exists(`meta:${roomId}`)

    if (!roomExists) {
        throw new Error("The Room Does Not Exist")
    }

    const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
    }

    await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token })
    await realtime.channel(roomId).emit("chat.message", message)

    const remaining = await redis.ttl(`meta:${roomId}`)
    await redis.expire(`messages:${roomId}`, remaining)
    await redis.expire(`history:${roomId}`, remaining)
    await redis.expire(roomId, remaining)
}, {
    query: z.object({ roomId: z.string() }),
    body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
    })
}).get("/", async ({ auth }) => {
    const messages = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1)

    return {
        messages: messages.map((m) => ({
            ...m,
            token: m.token === auth.token ? auth.token : undefined,
        })),
    }
}, {
    query: z.object({ roomId: z.string() })
}
)

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages)
    .get('/', 'Hello Nextjs')
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app