import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socket = null

export function useSocket(events = {}) {
  const handlersRef = useRef(events)
  handlersRef.current = events

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      })
    }

    const registered = []

    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      const wrapped = (...args) => handlersRef.current[event]?.(...args)
      socket.on(event, wrapped)
      registered.push([event, wrapped])
    })

    return () => {
      registered.forEach(([event, handler]) => socket.off(event, handler))
    }
  }, [])

  return socket
}
