import { useEffect, useState, useRef } from 'react'
import { socket } from '../services/socket'

export default function Chat({ code, me }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    socket.on('chat', ({ from, message }) => {
      setMessages((s) => [...s, { from, message }])
    })
    socket.on('typing', ({ from, typing }) => {
      setTyping(typing)
    })
    return () => {
      socket.off('chat')
      socket.off('typing')
    }
  }, [])

  const send = () => {
    if (!text) return
    socket.emit('chat', { code, message: text, from: me })
    setMessages((s) => [...s, { from: me, message: text }])
    setText('')
  }

  const onType = (v) => {
    setText(v)
    socket.emit('typing', { code, from: me, typing: v.length > 0 })
  }

  return (
    <div className="border rounded p-3 bg-white dark:bg-gray-800">
      <div className="h-40 overflow-auto mb-3" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.from === me ? 'text-right' : 'text-left'}`}>
            <div className="inline-block px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">{m.message}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => onType(e.target.value)} className="flex-1 px-2 py-1 border rounded" />
        <button onClick={send} className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
      </div>
      {typing && <div className="text-xs text-gray-500 mt-2">Typing…</div>}
    </div>
  )
}
