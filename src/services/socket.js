import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:4000' : '')
console.log('RemoteDesk: using socket URL ->', URL)
export const socket = io(URL)
