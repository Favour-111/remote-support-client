export default function ErrorBanner({ message, onClose }) {
  if (!message) return null
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded flex items-center justify-between">
      <div>{message}</div>
      <button onClick={onClose} className="ml-4 text-red-600">Dismiss</button>
    </div>
  )
}
