import { useEffect, useRef } from 'react'

export default function AnnotationLayer({ width = 640, height = 360, onStroke, incomingStrokes = [], clearSignal }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const points = useRef([])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = width
    c.height = height
    const ctx = c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height)
    // draw incoming strokes
    incomingStrokes.forEach((s) => {
      drawStroke(ctx, s)
    })
  }, [incomingStrokes, width, height, clearSignal])

  function drawStroke(ctx, s) {
    if (!s || !s.points || s.points.length === 0) return
    ctx.strokeStyle = s.color || 'red'
    ctx.lineWidth = s.width || 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    const first = s.points[0]
    ctx.moveTo(first.x * ctx.canvas.width, first.y * ctx.canvas.height)
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i]
      ctx.lineTo(p.x * ctx.canvas.width, p.y * ctx.canvas.height)
    }
    ctx.stroke()
  }

  function start(e) {
    drawing.current = true
    points.current = []
    addPoint(e)
  }
  function addPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height
    points.current.push({ x, y })
    // draw immediate
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (points.current.length === 1) ctx.beginPath()
    if (points.current.length >= 2) {
      const p1 = points.current[points.current.length - 2]
      const p2 = points.current[points.current.length - 1]
      ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height)
      ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height)
      ctx.stroke()
    }
  }
  function end() {
    if (!drawing.current) return
    drawing.current = false
    if (points.current.length > 0) {
      const stroke = { points: points.current.slice(), color: 'red', width: 2 }
      if (onStroke) onStroke(stroke)
    }
    points.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
      onMouseDown={start}
      onMouseMove={(e) => drawing.current && addPoint(e)}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={(e) => drawing.current && addPoint(e)}
      onTouchEnd={end}
    />
  )
}
