export default function Loader({ size = 6 }) {
  const s = `${size}rem`
  return (
    <div style={{ width: s, height: s }} className="rounded-full border-4 border-t-blue-600 border-gray-200 animate-spin" />
  )
}
