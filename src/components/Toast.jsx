import { useEffect, useState } from 'react'

export default function Toast({ message, show }) {
  const [visible, setVisible] = useState(show)
  useEffect(() => setVisible(show), [show])
  if (!visible) return null
  return (
    <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded shadow">
      {message}
    </div>
  )
}
