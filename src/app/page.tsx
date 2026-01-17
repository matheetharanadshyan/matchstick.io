"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"

export default function Home() {
  const { username } = useUsername()
  const router = useRouter()

  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")


  const {mutate: createRoom} = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post()

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`)
      }
    }
  })

  return <main className = "flex min-h-screen flex-col items-center justify-center p-4">
    <div className="w-full max-w-md space-y-8">

      {wasDestroyed && <div className="bg-red-900/20 border border-red-400 p-4 text-center"><p className="text-red-300 text-md font-bold">The Room Was Destroyed</p><p className="text-zinc-300 text-sm mt-2">All Messages Were Permanently Deleted</p></div>}

      {error === "room-not-found" && <div className="bg-red-900/20 border border-red-400 p-4 text-center"><p className="text-red-300 text-md font-bold">The Room Is Not Found</p><p className="text-zinc-300 text-sm mt-2">This Room May Have Been Expired Or Never Existed</p></div>}

      {error === "room-full" && <div className="bg-red-900/20 border border-red-400 p-4 text-center"><p className="text-red-300 text-md font-bold">The Room Is Full</p><p className="text-zinc-300 text-sm mt-2">This Room Is At Maximum Capacity</p></div>}

      <div className="text-center space-y-5 pb-5">
        <h1 className="text-3xl font-bold text-orange-400">Matchstick.io</h1>
        <p> A Private Encrypted Self-Destructing Chat Room</p>
      </div>
      <div className="border border-zinc-700 background-zinc-900/50 p-6 backdrop-blur-md">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="flex items-center text-zinc-400 pb-4">Your Identity</label>
          <div className="flex items-center gap-5">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 p-4 text-sm text-zinc-300 font-mono mb-2">
            { username }
            </div>
          </div>
        </div>
        <button onClick= {() => createRoom()} className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50">CREATE MATCHSTICK ROOM</button>
      </div>
      </div>
    </div>
  </main>
}
