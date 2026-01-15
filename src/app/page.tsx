"use client"

import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const ANIMALS = ["Lion", "Tiger", "Dog", "Cat"]
const STORAGE_KEY = "chat_username"

const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `Anonymous-${word}-${nanoid(5)}`
}

export default function Home() {

  const [username, setUsername] = useState("");
  const router = useRouter()

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY)

      if(stored) {
        setUsername(stored)
        return
      }

      const generated = generateUsername()
      localStorage.setItem(STORAGE_KEY, generated)
      setUsername(generated)
    }

    main()
  }, [])

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
              {username}
            </div>
          </div>
        </div>

        <button onClick= {() => createRoom()} className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50">CREATE MATCHSTICK ROOM</button>
      </div>
      </div>
    </div>
  </main>
}
