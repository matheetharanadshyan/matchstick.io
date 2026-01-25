"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { decrypt, encrypt } from "@/lib/encryption"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, memo, useTransition } from "react"
import { animate } from "motion"

function formatTimeRemaining(seconds: number) {

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

const DecryptedMessage = memo(({
    text,
    encryptionKey,
}: {
    text: string
    encryptionKey: string | null
}) => {
    const { data: decrypted } = useQuery({
        queryKey: ["decrypted", text, encryptionKey],
        queryFn: async () => {
            if (!encryptionKey) return null
            return await decrypt(text, encryptionKey)
        },
        staleTime: Infinity,
        retry: false,
    })

    if(!encryptionKey) {
        return(
            <span className="text-zinc-400 italic flex items-center gap-1">Encrypted Content</span>
        )
    }

    if(decrypted === null && encryptionKey) {
        return(
            <div className="bg-red-900/20 border border-red-400 p-4 text-center">
                <div className="flex flex-col">
                    <span className="text-red-300 text-md font-bold">Decryption Failed</span>
                    <span className="text-zinc-300 text-sm mt-2">The Encryption Key Provided Cannot Decrypt The Message</span>
                </div>
            </div>
        )
    }

    return <span className="wrap-break-word whitespace-pre-wrap">{decrypted || <span className="animate-pulse">...</span>}</span>
})

const GROUP_TIME_THRESHOLD = 5 * 60 * 1000 // 5 minutes

type GroupedMessage = {
    id: string
    sender: string
    text: string
    timestamp: number
    roomId: string
    isFirstInGroup: boolean
}

function groupMessages(messages: Array<{ id: string; sender: string; text: string; timestamp: number; roomId: string }>): GroupedMessage[] {
    if (!messages || messages.length === 0) return []
    
    const grouped: GroupedMessage[] = []
    
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        const prevMsg = messages[i - 1]
        
        const shouldGroup = prevMsg && 
            prevMsg.sender === msg.sender && 
            (msg.timestamp - prevMsg.timestamp) < GROUP_TIME_THRESHOLD
        
        grouped.push({
            ...msg,
            isFirstInGroup: !shouldGroup
        })
    }
    
    return grouped
}

const MessageItem = memo(({
    message,
    isFirstInGroup,
    username,
    encryptionKey,
    isNewMessage
}: {
    message: GroupedMessage
    isFirstInGroup: boolean
    username: string
    encryptionKey: string | null
    isNewMessage: boolean
}) => {
    const messageRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isNewMessage && messageRef.current) {
            // Check for reduced motion preference
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            
            if (prefersReducedMotion) {
                // Only animate opacity for reduced motion
                animate(messageRef.current, { opacity: [0, 1] }, { duration: 0.2, easing: "ease-out" })
            } else {
                // Full animation: fade in and slide up
                animate(
                    messageRef.current,
                    { opacity: [0, 1], y: [4, 0] },
                    { duration: 0.2, easing: "ease-out" }
                )
            }
        }
    }, [isNewMessage])

    return (
        <div 
            ref={messageRef}
            className={`flex flex-col items-start ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
        >
            <div className="max-w-[80%] group">
                {isFirstInGroup && (
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className={`text-sm font-bold ${message.sender === username ? 'text-orange-300' : 'text-teal-300'}`}>
                            {message.sender === username ? "You" : message.sender}
                        </span>
                        <span className="text-[10px] text-zinc-500">{format(message.timestamp, "HH:mm")}</span>
                    </div>
                )}
                {!isFirstInGroup && (
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-[10px] text-zinc-500 ml-0">{format(message.timestamp, "HH:mm")}</span>
                    </div>
                )}
                <div className="text-sm text-zinc-300 leading-relaxed break-all">
                    <DecryptedMessage text={message.text} encryptionKey={encryptionKey} />
                </div>
            </div>
        </div>
    )
})

MessageItem.displayName = "MessageItem"

export default function Page() {

    const { username } = useUsername()

    const params = useParams()
    const roomId = params.roomId as string

    const router = useRouter()

    const [copyStatus, setCopyStatus] = useState("Copy")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [input, setInput] = useState("")
    const [encryptionKey, setEncryptionKey] = useState<string | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const previousMessageIdsRef = useRef<Set<string>>(new Set())
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [isPendingTransition, startTransition] = useTransition()
    const headerRef = useRef<HTMLElement>(null)
    const inputContainerRef = useRef<HTMLDivElement>(null)
    const sendButtonRef = useRef<HTMLButtonElement>(null)
    const destroyButtonRef = useRef<HTMLButtonElement>(null)
    const copyButtonRef = useRef<HTMLButtonElement>(null)
    const timerRef = useRef<HTMLSpanElement>(null)
    const emptyStateRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace("#", "")
            if (hash) {
                if (hash.length !== 64) {
                    router.push("/?error=invalid-key")
                } else {
                    setEncryptionKey(hash)
                }
            } else {
                router.push("/?error=missing-key")
            }
        }

        handleHashChange()

        window.addEventListener("hashchange", handleHashChange)
        return () => window.removeEventListener("hashchange", handleHashChange)
    }, [router])

    const { data: ttlData } = useQuery({
        queryKey: ["ttl", roomId],
        queryFn: async () => {
            const res = await client.room.ttl.get( { query: {roomId} })
            return res.data
        },
        refetchInterval: 1000,
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

    // Debounced refetch function
    const debouncedRefetch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
            startTransition(() => {
                refetch()
            })
        }, 300)
    }, [refetch, startTransition])

    // Group messages and track new ones for animations
    const groupedMessages = useMemo(() => {
        if (!messages?.messages) return []
        return groupMessages(messages.messages)
    }, [messages?.messages])

    // Track which messages are new for animation
    const newMessageIds = useMemo(() => {
        if (!messages?.messages) return new Set<string>()
        
        const currentIds = new Set(messages.messages.map(m => m.id))
        const newIds = new Set<string>()
        
        currentIds.forEach(id => {
            if (!previousMessageIdsRef.current.has(id)) {
                newIds.add(id)
            }
        })
        
        previousMessageIdsRef.current = currentIds
        return newIds
    }, [messages?.messages])

    useEffect(() => {
        if (messagesEndRef.current) {
            const container = messagesEndRef.current.parentElement
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
                if (isNearBottom) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
                }
            }
        }
    }, [messages?.messages])

    const {mutate: sendMessage, isPending} = useMutation({
        mutationFn: async ({ text }: {text: string}) => {
            const encrypted = encryptionKey ? await encrypt(text, encryptionKey) : text

            await client.messages.post(
                { sender: username, text: encrypted },
                { query: { roomId } }
            )

            setInput("")
        },
        onSuccess: () => {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    })

    useRealtime({
        channels: [roomId],
        events: ["chat.message", "chat.destroy"],
        onData: ({ event }) => {
            if(event === "chat.message") {
                debouncedRefetch()
            }

            if(event === "chat.destroy") {
                router.push("/?destroyed=true")
            }
        }
    })

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [])

    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
          await client.room.delete(null, { query: { roomId } })
        },
      })

    const handleDestroyRoom = useCallback(() => {
        destroyRoom()
    }, [destroyRoom])

    const copyLink = useCallback(async () => {
        try {
            const url = window.location.href
            await navigator.clipboard.writeText(url)
            setCopyStatus("Copied")
            setTimeout(() => setCopyStatus("Copy"), 2000)
        } catch (error) {
            console.error("Failed to copy link:", error)
            setCopyStatus("Failed")
            setTimeout(() => setCopyStatus("Copy"), 2000)
        }
    }, [])

    const handleSendMessageClick = useCallback(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (sendButtonRef.current && !prefersReducedMotion) {
            animate(
                sendButtonRef.current,
                { scale: [1, 0.98, 1] },
                { duration: 0.15, easing: "ease-out" }
            )
        }
        if (!input.trim() || isPending) return
        sendMessage({ text: input })
        inputRef.current?.focus()
    }, [input, isPending, sendMessage])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && input.trim()) {
            handleSendMessageClick()
        } else if (e.key === "Escape") {
            setInput("")
            inputRef.current?.focus()
        }
    }, [input, handleSendMessageClick])

    const formattedTime = useMemo(() => {
        if (timeRemaining === null) return "--:--"
        return formatTimeRemaining(timeRemaining)
    }, [timeRemaining])

    // Subtle page entrance - just fade in
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (prefersReducedMotion) return

        if (headerRef.current) {
            animate(headerRef.current, { opacity: [0, 1] }, { duration: 0.3, easing: "ease-out" })
        }
        if (inputContainerRef.current) {
            animate(inputContainerRef.current, { opacity: [0, 1] }, { duration: 0.3, easing: "ease-out" })
        }
    }, [])

    // Subtle empty state animation
    useEffect(() => {
        if (emptyStateRef.current && groupedMessages.length === 0) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            if (prefersReducedMotion) {
                animate(emptyStateRef.current, { opacity: [0, 1] }, { duration: 0.2 })
            } else {
                animate(emptyStateRef.current, { opacity: [0, 1] }, { duration: 0.3, easing: "ease-out" })
            }
        }
    }, [groupedMessages.length])

    // Subtle timer update animation (only when time is low)
    useEffect(() => {
        if (timerRef.current && timeRemaining !== null && timeRemaining < 60 && timeRemaining > 0) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            if (!prefersReducedMotion) {
                animate(
                    timerRef.current,
                    { scale: [1, 1.05, 1] },
                    { duration: 0.2, easing: "ease-out" }
                )
            }
        }
    }, [timeRemaining])

    // Subtle input focus animation
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (inputRef.current && !prefersReducedMotion) {
            animate(
                inputRef.current,
                { scale: [1, 1.005] },
                { duration: 0.2, easing: "ease-out" }
            )
        }
    }

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (inputRef.current) {
            animate(
                inputRef.current,
                { scale: [1.005, 1] },
                { duration: 0.2, easing: "ease-out" }
            )
        }
    }

    // Subtle button hover animations
    const handleSendButtonHover = (isEntering: boolean) => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (sendButtonRef.current && !prefersReducedMotion) {
            animate(
                sendButtonRef.current,
                { scale: isEntering ? 1.02 : 1, y: isEntering ? -1 : 0 },
                { duration: 0.2, easing: "ease-out" }
            )
        }
    }

    const handleDestroyButtonHover = (isEntering: boolean) => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (destroyButtonRef.current && !prefersReducedMotion) {
            animate(
                destroyButtonRef.current,
                { scale: isEntering ? 1.02 : 1, y: isEntering ? -1 : 0 },
                { duration: 0.2, easing: "ease-out" }
            )
        }
    }

    const handleCopyButtonClick = () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (copyButtonRef.current && !prefersReducedMotion) {
            animate(
                copyButtonRef.current,
                { scale: [1, 0.95, 1] },
                { duration: 0.15, easing: "ease-out" }
            )
        }
    }

    const handleDestroyClick = () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (destroyButtonRef.current && !prefersReducedMotion) {
            animate(
                destroyButtonRef.current,
                { scale: [1, 0.98, 1] },
                { duration: 0.15, easing: "ease-out" }
            )
        }
        handleDestroyRoom()
    }

    return (
        <main className="flex flex-col h-screen max-h-screen overflow-hidden">
            <header ref={headerRef} className="border-b border-zinc-700 p-4 flex items-center justify-between bg-black">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-sm text-zinc-500 uppercase">ROOM ID:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-md font-bold text-orange-400">{roomId}</span>
                            <button 
                                ref={copyButtonRef}
                                onClick={() => {
                                    handleCopyButtonClick()
                                    copyLink()
                                }}
                                onMouseEnter={() => {
                                    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                    if (copyButtonRef.current && !prefersReducedMotion) {
                                        animate(
                                            copyButtonRef.current,
                                            { scale: 1.05 },
                                            { duration: 0.2, easing: "ease-out" }
                                        )
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (copyButtonRef.current) {
                                        animate(
                                            copyButtonRef.current,
                                            { scale: 1 },
                                            { duration: 0.2, easing: "ease-out" }
                                        )
                                    }
                                }}
                                aria-label="Copy room link"
                                className="text-[10px] bg-zinc-900 hover:bg-zinc-700 ml-1 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                {copyStatus}
                            </button>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-zinc-700"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-zinc-400 uppercase">Self-Destruct</span>
                        <span 
                            ref={timerRef}
                            className={`text-sm font-bold flex items-center gap-2 ${ timeRemaining !== null && timeRemaining < 60 ? "text-red-400" : "text-amber-400"}`}
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {formattedTime}
                        </span>
                    </div>
                </div>

                <button 
                    ref={destroyButtonRef}
                    onClick={handleDestroyClick}
                    onMouseEnter={() => handleDestroyButtonHover(true)}
                    onMouseLeave={() => handleDestroyButtonHover(false)}
                    aria-label="Destroy room immediately"
                    className="text-md bg-zinc-800 hover:bg-red-400 px-4 py-3 text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
                >
                    Destroy Now
                </button>
            </header>

            <div 
                className="flex-1 overflow-y-auto p-4 scrollbar-thin"
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
            >
                {groupedMessages.length === 0 && (
                    <div ref={emptyStateRef} className="flex items-center justify-center h-full">
                        <h2 className="text-zinc-600 font-mono text-md">No Messages Yet, Start The Conversation</h2>
                    </div>
                )}

                {groupedMessages.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        message={msg}
                        isFirstInGroup={msg.isFirstInGroup}
                        username={username}
                        encryptionKey={encryptionKey}
                        isNewMessage={newMessageIds.has(msg.id)}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div ref={inputContainerRef} className="p-4 border-t border-zinc-700 bg-black">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            autoFocus 
                            placeholder={ encryptionKey ? "Type Out Your Message" : "Checking The Validity Of Your Encryption"} 
                            disabled={!encryptionKey} 
                            aria-label="Message Input"
                            aria-describedby={encryptionKey ? undefined : "encryption-status"}
                            className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors mb-0.5 text-zinc-100 placeholder:text-zinc-400 py-3 pl-8 pr-8 disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                        {!encryptionKey && (
                            <span id="encryption-status" className="sr-only">Checking encryption key validity</span>
                        )}
                    </div>

                    <button 
                        ref={sendButtonRef}
                        onClick={handleSendMessageClick}
                        onMouseEnter={() => handleSendButtonHover(true)}
                        onMouseLeave={() => handleSendButtonHover(false)}
                        disabled={!input.trim() || isPending} 
                        aria-label="Send Message"
                        className="bg-white text-black px-4 text-md mb-0.5 font-bold hover:text-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Send Message
                    </button>
                </div>
            </div>
        </main>
    )
}
