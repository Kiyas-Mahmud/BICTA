<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const props = defineProps({
  colors: {
    type: Array as () => string[],
    default: () => ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']
  },
  waveOpacity: {
    type: Number,
    default: 0.6
  },
  blur: {
    type: Number,
    default: 80
  },
  speed: {
    type: Number,
    default: 0.003
  }
})

let animationFrame: number
let time = 0

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Logical width/height independent of DPR
  const width = window.innerWidth
  const height = window.innerHeight

  ctx.clearRect(0, 0, width, height)
  
  // Draw waves
  const waves = [
    { amplitude: height * 0.3, frequency: 0.001, speed: props.speed * 1.2, offset: 0, color: props.colors[0] },
    { amplitude: height * 0.4, frequency: 0.0008, speed: props.speed, offset: 2, color: props.colors[1] },
    { amplitude: height * 0.35, frequency: 0.0012, speed: props.speed * 1.5, offset: 4, color: props.colors[2] },
    { amplitude: height * 0.25, frequency: 0.0015, speed: props.speed * 0.8, offset: 6, color: props.colors[3] },
  ]

  waves.forEach(wave => {
    ctx.beginPath()
    ctx.moveTo(0, height)
    for (let x = 0; x <= width; x += 20) {
      const y = height / 2 + Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * wave.amplitude
      ctx.lineTo(x, y)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    
    ctx.fillStyle = wave.color
    ctx.globalAlpha = props.waveOpacity
    ctx.fill()
    ctx.globalAlpha = 1.0
  })

  time += 1
  animationFrame = requestAnimationFrame(draw)
}

const resize = () => {
  if (canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight
    
    canvasRef.value.width = width * dpr
    canvasRef.value.height = height * dpr
    
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
    
    canvasRef.value.style.width = `${width}px`
    canvasRef.value.style.height = `${height}px`
  }
}

onMounted(() => {
  window.addEventListener('resize', resize)
  resize()
  draw()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div class="fixed inset-0 z-0 overflow-hidden bg-[#e2e8f0]">
    <canvas 
      ref="canvasRef" 
      class="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none mix-blend-multiply" 
      :style="{ filter: `blur(${blur}px)` }"
    />
  </div>
</template>
