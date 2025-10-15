import { useEffect } from 'react'

export default function DynamicThemeColor() {
  useEffect(() => {
    // Colores del degradado (celeste y mint) - más suaves para mejor integración
    const colors = [
      '#e0f2fe', // cyan-100
      '#d1fae5', // emerald-100
      '#a7f3d0', // emerald-200
      '#bae6fd', // cyan-200
      '#e0f2fe', // cyan-100 (volver al inicio)
    ]

    let currentIndex = 0
    let progress = 0
    const speed = 0.005 // Velocidad de la animación

    const metaThemeColor = document.querySelector('meta[name="theme-color"]')

    const interpolateColor = (color1: string, color2: string, factor: number): string => {
      const c1 = parseInt(color1.slice(1), 16)
      const c2 = parseInt(color2.slice(1), 16)

      const r1 = (c1 >> 16) & 0xff
      const g1 = (c1 >> 8) & 0xff
      const b1 = c1 & 0xff

      const r2 = (c2 >> 16) & 0xff
      const g2 = (c2 >> 8) & 0xff
      const b2 = c2 & 0xff

      const r = Math.round(r1 + (r2 - r1) * factor)
      const g = Math.round(g1 + (g2 - g1) * factor)
      const b = Math.round(b1 + (b2 - b1) * factor)

      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
    }

    const animate = () => {
      progress += speed

      if (progress >= 1) {
        progress = 0
        currentIndex = (currentIndex + 1) % (colors.length - 1)
      }

      const color1 = colors[currentIndex]
      const color2 = colors[currentIndex + 1]
      const currentColor = interpolateColor(color1, color2, progress)

      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', currentColor)
      }

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      // Restaurar color original al desmontar
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#22d3ee')
      }
    }
  }, [])

  return null
}
