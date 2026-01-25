"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { generateKey } from "@/lib/encryption"
import { Suspense, useEffect, useRef } from "react"
import { animate } from "motion"

const Home = () => {
  return <Suspense><Lobby /></Suspense>
}

function Lobby() {
  const { username } = useUsername()
  const router = useRouter()

  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")

  const cardRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (titleRef.current) {
      titleRef.current.setAttribute('data-animating', 'true')
      titleRef.current.style.opacity = '0'
      titleRef.current.style.transform = 'translateY(20px)'
    }
    if (cardRef.current) {
      cardRef.current.setAttribute('data-animating', 'true')
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'translateY(20px)'
    }
    
    if (prefersReducedMotion) {
      if (titleRef.current) {
        titleRef.current.style.opacity = '1'
        titleRef.current.style.transform = 'translateY(0)'
      }
      if (cardRef.current) {
        cardRef.current.style.opacity = '1'
        cardRef.current.style.transform = 'translateY(0)'
      }
      return
    }

    requestAnimationFrame(() => {
      if (titleRef.current) {
        const animation = animate(
          titleRef.current,
          // @ts-ignore
          { opacity: [0, 1], y: [20, 0] },
          { duration: 0.6, easing: [0.16, 1, 0.3, 1], delay: 0.1 }
        )
        animation.then(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (titleRef.current) {
                titleRef.current.classList.add('animate-complete')
                titleRef.current.style.opacity = '1'
                titleRef.current.style.transform = 'translateY(0)'
                titleRef.current.removeAttribute('data-animating')
              }
            })
          })
        })
      }

      if (cardRef.current) {
        const animation = animate(
          cardRef.current,
          // @ts-ignore
          { opacity: [0, 1], y: [20, 0] },
          { duration: 0.6, easing: [0.16, 1, 0.3, 1], delay: 0.2 }
        )
        animation.then(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (cardRef.current) {
                cardRef.current.classList.add('animate-complete')
                cardRef.current.style.opacity = '1'
                cardRef.current.style.transform = 'translateY(0)'
                cardRef.current.removeAttribute('data-animating')
              }
            })
          })
        })
      }
    })
  }, [])

  useEffect(() => {
    if (errorRef.current && (wasDestroyed || error)) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        animate(errorRef.current, 
        // @ts-ignore
        { opacity: [0, 1] }, { duration: 0.2 })
      } else {
        animate(
          errorRef.current,
          // @ts-ignore
          { opacity: [0, 1], y: [15, 0] },
          { duration: 0.4, easing: [0.16, 1, 0.3, 1] }
        )
      }
    }
  }, [wasDestroyed, error])

  const {mutate: createRoom} = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post()

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}#${generateKey()}`)
      }
    }
  })

  const handleCreateRoom = () => {
    if (buttonRef.current) {
      animate(
        buttonRef.current,
        // @ts-ignore
        { scale: [1, 0.98, 1] },
        { duration: 0.2, easing: [0.16, 1, 0.3, 1] }
      )
    }
    createRoom()
  }

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEntering: boolean) => {
    if (buttonRef.current) {
      animate(
        buttonRef.current,
        // @ts-ignore
        { scale: isEntering ? 1.01 : 1, y: isEntering ? -1 : 0 },
        { duration: 0.25, easing: [0.16, 1, 0.3, 1] }
      )
    }
  }

  return <main className = "flex min-h-screen flex-col items-center justify-center p-4">
    <div className="w-full max-w-md space-y-8">

      {wasDestroyed && (
        <div 
          ref={errorRef}
          className="bg-red-900/20 border border-red-400 p-4 text-center"
        >
          <p className="text-red-300 text-md font-bold">The Room Was Destroyed</p>
          <p className="text-zinc-300 text-sm mt-2">All Messages Were Permanently Deleted</p>
        </div>
      )}

      {error === "room-not-found" && (
        <div 
          ref={errorRef}
          className="bg-red-900/20 border border-red-400 p-4 text-center"
        >
          <p className="text-red-300 text-md font-bold">The Room Is Not Found</p>
          <p className="text-zinc-300 text-sm mt-2">This Room May Have Been Expired Or Never Existed</p>
        </div>
      )}

      {error === "room-full" && (
        <div 
          ref={errorRef}
          className="bg-red-900/20 border border-red-400 p-4 text-center"
        >
          <p className="text-red-300 text-md font-bold">The Room Is Full</p>
          <p className="text-zinc-300 text-sm mt-2">This Room Is At Maximum Capacity</p>
        </div>
      )}

      {error === "missing-key" && (
        <div 
          ref={errorRef}
          className="bg-red-900/20 border border-red-400 p-4 text-center"
        >
          <p className="text-red-300 text-md font-bold">The Encryption Key Is Missing</p>
          <p className="text-zinc-300 text-sm mt-2">The Encryption Key Is Missing From The URL</p>
        </div>
      )}

      {error === "invalid-key" && (
        <div 
          ref={errorRef}
          className="bg-red-900/20 border border-red-400 p-4 text-center"
        >
          <p className="text-red-300 text-md font-bold">The Encryption Key Is Invalid</p>
          <p className="text-zinc-300 text-sm mt-2">The Encryption Key Is Provided In The URL Is Invalid</p>
        </div>
      )}

      <div ref={titleRef} className="text-center space-y-5 pb-5">
        <h1 className="text-3xl font-bold text-orange-400">Matchstick.io</h1>
        <p>Encrypted Conversations, Designed To Disappear</p>
      </div>
      <div ref={cardRef} className="border border-zinc-700 background-zinc-900/50 p-6 backdrop-blur-md">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="flex items-center text-zinc-400 pb-4">Your Identity</label>
          <div className="flex items-center gap-5">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 p-4 text-sm text-zinc-300 font-mono mb-2">
            { username }
            </div>
          </div>
        </div>
        <button 
          ref={buttonRef}
          onClick={handleCreateRoom}
          onMouseEnter={(e) => handleButtonHover(e, true)}
          onMouseLeave={(e) => handleButtonHover(e, false)}
          className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
        >
          CREATE MATCHSTICK ROOM
        </button>
      </div>
      </div>
    </div>
  </main>
}

export default Home;