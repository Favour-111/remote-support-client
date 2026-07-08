import { useState, useRef, useEffect } from 'react'
import { socket } from '../services/socket'

export default function SupportPage() {
  const [code, setCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const pcRef = useRef(null)

  useEffect(() => {
    socket.on('request-accepted', () => {
      // start listening for signal offer
      setConnected(true)
    })

    socket.on('signal', async ({ from, data }) => {
      if (data.type === 'candidate') {
        try {
          await pcRef.current.addIceCandidate(data.candidate)
        } catch (e) {
          // ignore
        }
      } else {
        // assume answer
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
      }
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
                <div>Viewing screen</div>
                <div className="mt-3">
                  <video autoPlay playsInline ref={(el) => { if (el && remoteStream) el.srcObject = remoteStream }} className="w-full rounded" />
                </div>
                <div className="mt-3">
                  <button onClick={endSession} className="px-3 py-2 bg-red-600 text-white rounded">End Session</button>
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
