import { useEffect, useState, useRef } from 'react'
import { socket } from '../services/socket'
import Loader from '../components/Loader'
import ErrorBanner from '../components/ErrorBanner'

export default function UserPage() {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [canShare, setCanShare] = useState(true)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    socket.emit('create-session', ({ code }) => {
      setCode(code)
    })

    // runtime capability check for getDisplayMedia
    try {
      const supported = !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
      setCanShare(supported)
    } catch (e) {
      setCanShare(false)
    }

    socket.on('incoming-request', ({ from }) => {
      setStatus('incoming')
      setError(null)
      pendingRef.current = from
    })

    socket.on('signal', async ({ from, data }) => {
      if (data.type === 'answer') {
        // Support answered our offer
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
          setLoading(false)
          setStatus('sharing')
        }
      } else if (data.type === 'candidate') {
        try {
          if (pcRef.current) await pcRef.current.addIceCandidate(data.candidate)
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
      setError(null)
      setLoading(true)
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      localStreamRef.current = stream
      // tell server to notify support that we accepted
      socket.emit('request-response', { code, accepted: true, supportSocket: pendingRef.current })

      // create peer connection to send to support
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: pendingRef.current, data: { type: 'candidate', candidate: e.candidate } })
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setLoading(false)
          setStatus('sharing')
        }
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
      setLoading(false)
      setStatus('idle')
      setError('Unable to start screen sharing — permission denied or an error occurred.')
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
      <div className="max-w-3xl mx-auto mb-4">
        <ErrorBanner message={error} onClose={() => setError(null)} />
      </div>
      {!canShare && (
        <div className="max-w-3xl mx-auto mb-4 p-4 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
          <h3 className="font-medium">Screen sharing not available</h3>
          <p className="text-sm mt-2">Your browser or device doesn't support screen sharing via the web. On iPhone/iOS this is restricted. Suggested workarounds:</p>
          <ul className="mt-2 text-sm list-disc list-inside">
            <li>Mirror your iPhone to a Mac (QuickTime) and share the Mac screen.</li>
            <li>Use AirPlay to mirror to a Mac/Apple TV and then share that screen.</li>
            <li>Use a native iOS app (ReplayKit) or a mirroring tool and share the mirrored desktop.</li>
            <li>As a last resort, point your camera at the device screen.</li>
          </ul>
        </div>
      )}
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
                  <button onClick={accept} className="px-3 py-2 bg-blue-600 text-white rounded" disabled={loading}>
                    {loading ? <Loader size={1.2} /> : 'Accept'}
                  </button>
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
            {loading && status !== 'sharing' && (
              <div className="mt-3 flex items-center gap-2"><Loader size={1} /><div className="text-sm">Connecting…</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
