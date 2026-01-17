"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function formatTimeRemaining(seconds: number) {

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default function Page() {

    const { username } = useUsername()

    const params = useParams()
    const roomId = params.roomId as string

    const router = useRouter()

    const [copyStatus, setCopyStatus] = useState("Copy")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [input, setInput] = useState("")

    const inputRef = useRef<HTMLInputElement>(null)

    const { data: ttlData } = useQuery({
        queryKey: ["ttl", roomId],
        queryFn: async () => {
            const res = await client.room.ttl.get( { query: {roomId} })
            return res.data
        }
    })

    useEffect(() => {
        if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
      }, [ttlData])
    
      useEffect(() => {
        if (timeRemaining === null || timeRemaining < 0) return
    
        if (timeRemaining === 0) {
          router.push("/?destroyed=true")
          return
        }
    
        const interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
    
        return () => clearInterval(interval)
      }, [timeRemaining, router])

    const {data: messages, refetch } = useQuery({
        queryKey: ["messages", roomId],
        queryFn: async () => {
            const res = await client.messages.get({ query: { roomId } })

            return res.data
        }
    })

    const {mutate: sendMessage, isPending} = useMutation({
        mutationFn: async ({ text }: {text: string}) => {
            await client.messages.post({ sender: username, text }, {query: {roomId} })

            setInput("")
        }
    })

    useRealtime({
        channels: [roomId],
        events: ["chat.message", "chat.destroy"],
        onData: ({ event }) => {
            if(event === "chat.message") {
                refetch()
            }

            if(event === "chat.destroy") {
                router.push("/?destroyed=true")
            }
        }
    })

    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
          await client.room.delete(null, { query: { roomId } })
        },
      })

    const copyLink = () => {
        const url = window.location.href
        navigator.clipboard.writeText(url)
        setCopyStatus("Copied")
        setTimeout(() => setCopyStatus("Copy"), 2000)
    }

    return (
        <main className="flex flex-col h-screen max-h-screen overflow-hidden">
            <header className="border-b border-zinc-700 p-4 flex items-center justify-between bg-black">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-sm text-zinc-500 uppercase">ROOM ID:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-md font-bold text-orange-400">{roomId}</span>
                            <button onClick={copyLink} className="text-[10px] bg-zinc-900 hover:bg-zinc-700 ml-1 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors">{copyStatus}</button>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-zinc-700"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-zinc-400 uppercase">Self-Destruct</span>
                        <span className={`text-sm font-bold flex items-center gap-2 ${ timeRemaining !== null && timeRemaining < 60 ? "text-red-400" : "text-amber-400"}`}>{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}</span>
                    </div>
                </div>

                <button onClick={() => destroyRoom()} className="text-md bg-zinc-800 hover:bg-red-400 px-4 py-3 text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50 hover:animate-pulse">Destroy Now</button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages?.messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <h2 className="text-zinc-600 font-mono text-md">No Messages Yet, Start The Conversation</h2>
                    </div>
                )}

                {messages?.messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-start">
                        <div className="max-w-[80%] group">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className={`text-sm font-bold ${msg.sender === username ? 'text-orange-300' : 'text-teal-300'} `}>
                                    { msg.sender === username ? "You" : msg.sender }
                                </span>

                                <span className="text-[10px] text-zinc-500">{format(msg.timestamp, "HH:mm")}</span>
                            </div>

                            <p className="text-sm text-zinc-300 leading-relaxed break-all">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-zinc-700 bg-black">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { sendMessage({text: input}), inputRef.current?.focus() } }} autoFocus placeholder="Type Out Your Message" className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors mb-0.5 text-zinc-100 placeholder:text-zinc-400 py-3 pl-8 pr-8" />
                    </div>

                    <button onClick={() => {sendMessage( { text: input} ), inputRef.current?.focus}} disabled={!input.trim() || isPending } className="bg-white text-black px-4 text-md mb-0.5 font-bold hover:text-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Send Message</button>
                </div>
            </div>
        </main>
    )
}
