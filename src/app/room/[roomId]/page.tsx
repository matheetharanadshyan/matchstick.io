"use client"

import { useParams } from "next/navigation"
import { useRef, useState } from "react"

function formatTimeRemaining(seconds: number) {

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default function Page() {

    const params = useParams()
    const roomId = params.roomId as string

    const [copyStatus, setCopyStatus] = useState("Copy")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(51)
    const [input, setInput] = useState("")

    const inputRef = useRef<HTMLInputElement>(null)

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
                        <span className={`text-md font-bold flex items-center gap-2${timeRemaining !== null && timeRemaining < 60 ? "text-red-500" : "text-amber-500"}`}>{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}</span>
                    </div>
                </div>

                <button className="text-md bg-zinc-800 hover:bg-red-400 px-4 py-3 text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50 hover:animate-pulse">Destroy Now</button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"></div>

            <div className="p-4 border-t border-zinc-700 bg-black">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { inputRef.current?.focus() } }} autoFocus placeholder="Type Out Your Message" className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors mb-0.5 text-zinc-100 placeholder:text-zinc-400 py-3 pl-8 pr-8" />
                    </div>

                    <button className="bg-white text-black px-4 text-md mb-0.5 font-bold hover:text-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Send Message</button>
                </div>
            </div>
        </main>
    )
}
