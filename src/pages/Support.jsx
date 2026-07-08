import { useState, useRef, useEffect } from 'react'
import { socket } from '../services/socket'
import Chat from '../components/Chat'
import AnnotationLayer from '../components/AnnotationLayer'

export default function SupportPage() {
  const [code, setCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pcRef = useRef(null)
  const videoRef = useRef(null)
  const [strokes, setStrokes] = useState([])
  const [clearSignal, setClearSignal] = useState(0)
  const [listening, setListening] = useState(false)

  useEffect(() => {

    socket.on('request-accepted', () => {
      // server informed us the user accepted; we'll wait for the user's offer
      setConnected(true)
      setLoading(true)
      setError(null)
    })

    socket.on('request-declined', () => {
      setError('User declined the request')
      setLoading(false)
      setConnected(false)
    })

    socket.on('signal', async ({ from, data }) => {
      if (data.type === 'candidate') {
        try {
          if (pcRef.current) await pcRef.current.addIceCandidate(data.candidate)
        } catch (e) {
          // ignore
        }
      } else if (data.type === 'offer') {
        // User is sending an offer; create peer, set remote, create answer
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        pcRef.current = pc
        const remoteStream = new MediaStream()
        setRemoteStream(remoteStream)

        pc.ontrack = (e) => {
          e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t))
        }

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit('signal', { to: from, data: { type: 'candidate', candidate: e.candidate } })
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal', { to: from, data: pc.localDescription })
          setLoading(false)
          setConnected(true)
        } catch (e) {
          setError('Failed to establish peer connection')
          setLoading(false)
        }
      } else if (data.type === 'answer') {
        // shouldn't normally happen on support side
      }
    })

    socket.on('annotation', ({ from, stroke }) => {
      setStrokes((s) => [...s, stroke])
    })

    socket.on('clear-annotations', () => {
      setStrokes([])
      setClearSignal((n) => n + 1)
    })

    socket.on('session-ended', () => {
      setConnected(false)
      setRemoteStream(null)
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    })

    return () => {
      socket.off('signal')
      socket.off('request-accepted')
      socket.off('session-ended')
    }
  }, [])

  const sendRequest = () => {
    socket.emit('request-connect', { code })
  }

  const connectPeer = async () => {
    const pc = new RTCPeerConnection()
    pcRef.current = pc
    const remoteStream = new MediaStream()
    setRemoteStream(remoteStream)

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t))
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('signal', { to: null, data: { type: 'candidate', candidate: e.candidate } })
    }

    // wait for offer via signaling

  }

  const endSession = () => {
    socket.emit('end-session', { code })
  }

  const onStroke = (stroke) => {
    // broadcast to session
    socket.emit('annotation', { code, stroke })
    setStrokes((s) => [...s, stroke])
  }

  const clearAnnotations = () => {
    socket.emit('clear-annotations', { code })
    setStrokes([])
    setClearSignal((n) => n + 1)
  }

  const toggleFullscreen = () => {
    const v = videoRef.current
    if (!v) return
    if (document.fullscreenElement) document.exitFullscreen()
    else v.requestFullscreen().catch(() => {})
  }

  const startVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) {
      setError('Speech Recognition not supported in this browser')
      return
    }
    const recog = new Speech()
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.onresult = (e) => {
      const text = e.results[0][0].transcript
      socket.emit('chat', { code, message: text, from: 'support (voice)' })
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.start()
    setListening(true)
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl p-6 bg-white dark:bg-gray-800 shadow">
          <h2 className="text-lg font-medium">Connect to user</h2>
          <div className="mt-3 flex gap-3">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Session code" className="px-3 py-2 border rounded flex-1" />
            <button onClick={sendRequest} className="px-3 py-2 bg-blue-600 text-white rounded">Request</button>
          </div>

          <div className="mt-6">
            {connected ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Viewing screen</div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleFullscreen} className="px-2 py-1 border rounded">Expand</button>
                    <button onClick={clearAnnotations} className="px-2 py-1 border rounded">Clear</button>
                    <button onClick={startVoice} className={`px-2 py-1 border rounded ${listening ? 'bg-blue-600 text-white' : ''}`}>{listening ? 'Listening...' : 'Voice'}</button>
                  </div>
                </div>
                <div className="mt-3 relative" style={{ paddingTop: '56.25%' }}>
                  <video autoPlay playsInline ref={(el) => { videoRef.current = el; if (el && remoteStream) el.srcObject = remoteStream }} className="absolute inset-0 w-full h-full object-contain rounded" />
                  <div className="absolute inset-0 pointer-events-auto">
                    <AnnotationLayer incomingStrokes={strokes} clearSignal={clearSignal} onStroke={onStroke} />
                  </div>
                </div>
                <div className="mt-3">
                  <button onClick={endSession} className="px-3 py-2 bg-red-600 text-white rounded">End Session</button>
                </div>
                <div className="mt-4">
                  <Chat code={code} me={'support'} />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Waiting for user to accept</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
