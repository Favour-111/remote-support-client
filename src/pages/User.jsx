import { useEffect, useState, useRef } from 'react'
import { socket } from '../services/socket'

export default function UserPage() {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)

  useEffect(() => {
    socket.emit('create-session', ({ code }) => {
      setCode(code)
    })

    socket.on('incoming-request', ({ from }) => {
      setStatus('incoming')
      pendingRef.current = from
    })

    socket.on('signal', async ({ from, data }) => {
      if (data.type === 'offer') {
        // create answer
        pcRef.current = new RTCPeerConnection()
        localStreamRef.current.getTracks().forEach((t) => pcRef.current.addTrack(t, localStreamRef.current))
        pcRef.current.ontrack = (e) => {
          // no-op for user
        }
        pcRef.current.onicecandidate = (e) => {
          if (e.candidate) socket.emit('signal', { to: from, data: { type: 'candidate', candidate: e.candidate } })
        }
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
        const answer = await pcRef.current.createAnswer()
        await pcRef.current.setLocalDescription(answer)
        socket.emit('signal', { to: from, data: pcRef.current.localDescription })
      } else if (data.type === 'candidate') {
        try {
          await pcRef.current.addIceCandidate(data.candidate)
        } catch (e) {
          // ignore
        }
      }
    })

    return () => {
      socket.off('incoming-request')
      socket.off('signal')
    }
  }, [])

  const pendingRef = useRef(null)

  const accept = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      localStreamRef.current = stream
      setStatus('sharing')
      socket.emit('request-response', { code, accepted: true, supportSocket: pendingRef.current })

      // create peer connection to send to support
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: pendingRef.current, data: { type: 'candidate', candidate: e.candidate } })
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('signal', { to: pendingRef.current, data: pc.localDescription })

      // handle stop sharing
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setStatus('idle')
        socket.emit('end-session', { code })
      })
    } catch (e) {
      setStatus('idle')
    }
  }

  const decline = () => {
    socket.emit('request-response', { code, accepted: false, supportSocket: pendingRef.current })
    setStatus('idle')
  }

  const stopSharing = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      setStatus('idle')
      socket.emit('end-session', { code })
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl p-6 bg-white dark:bg-gray-800 shadow">
          <h2 className="text-lg font-medium">Your session code</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-2xl font-semibold">{code || '—'}</div>
            <div className="text-sm text-gray-500">Share this with support</div>
          </div>

          <div className="mt-6">
            {status === 'idle' && <div className="text-sm text-gray-600">Waiting for support</div>}
            {status === 'incoming' && (
              <div>
                <div className="mb-3">Support is requesting to view your screen.</div>
                <div className="flex gap-3">
                  <button onClick={accept} className="px-3 py-2 bg-blue-600 text-white rounded">Accept</button>
                  <button onClick={decline} className="px-3 py-2 border rounded">Decline</button>
                </div>
              </div>
            )}
            {status === 'sharing' && (
              <div>
                <div className="mb-3 text-sm text-green-600">Screen Sharing</div>
                <button onClick={stopSharing} className="px-4 py-2 bg-red-600 text-white rounded">Stop Sharing</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
