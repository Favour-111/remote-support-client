import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900">
      <div className="max-w-md w-full p-8 rounded-xl bg-white/80 dark:bg-gray-800 shadow-lg">
        <h1 className="text-2xl font-semibold mb-4">RemoteDesk</h1>
        <p className="text-sm text-gray-600 mb-6">Lightweight screen-sharing MVP</p>
        <div className="flex gap-4">
          <Link to="/user" className="flex-1 py-2 px-4 bg-white border rounded-md text-center">Join as User</Link>
          <Link to="/support" className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-center">Join as Support</Link>
        </div>
      </div>
    </div>
  )
}
