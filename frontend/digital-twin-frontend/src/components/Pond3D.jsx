import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ─────────────────────────────────────────────
//  WATER SURFACE
// ─────────────────────────────────────────────
function WaterSurface({ status }) {
  const ref = useRef()
  const color = status === 'DANGER' ? '#ff4444' : status === 'WARNING' ? '#ffaa00' : '#00aaee'

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = 0.5 + Math.sin(t * 1.2) * 0.04
    ref.current.rotation.z = Math.sin(t * 0.6) * 0.015
  })

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.5, 0]}>
      <planeGeometry args={[7.8, 7.8, 1, 1]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.55}
        roughness={0.1}
        metalness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function WaterLayer2() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = 0.42 + Math.sin(t * 0.9 + 1) * 0.03
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.42, 0]}>
      <planeGeometry args={[7.6, 7.6, 1, 1]} />
      <meshStandardMaterial color="#006699" transparent opacity={0.35} roughness={0.1} metalness={0.2} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─────────────────────────────────────────────
//  POND FLOOR + WALLS
// ─────────────────────────────────────────────
function PondFloor() {
  const pebbles = useMemo(() =>
    Array.from({ length: 35 }).map((_, i) => ({
      x: (Math.random() - 0.5) * 6.5,
      z: (Math.random() - 0.5) * 6.5,
      sx: 0.05 + Math.random() * 0.12,
      sy: 0.03 + Math.random() * 0.06,
      sz: 0.05 + Math.random() * 0.1,
      h: `hsl(${25 + Math.random() * 25},${20 + Math.random() * 30}%,${38 + Math.random() * 22}%)`,
    }))
  , [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.0, 0]}>
        <planeGeometry args={[8.5, 8.5]} />
        <meshStandardMaterial color="#c4a060" roughness={1} />
      </mesh>
      {pebbles.map((p, i) => (
        <mesh key={i} position={[p.x, -0.97, p.z]} scale={[p.sx, p.sy, p.sz]}>
          <sphereGeometry args={[1, 7, 7]} />
          <meshStandardMaterial color={p.h} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function PondWalls() {
  return (
    <group>
      <mesh position={[0, -0.3, -4.05]}>
        <boxGeometry args={[8.5, 1.6, 0.2]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.3, 4.05]}>
        <boxGeometry args={[8.5, 1.6, 0.2]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.85} />
      </mesh>
      <mesh position={[-4.05, -0.3, 0]}>
        <boxGeometry args={[0.2, 1.6, 8.5]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.85} />
      </mesh>
      <mesh position={[4.05, -0.3, 0]}>
        <boxGeometry args={[0.2, 1.6, 8.5]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.85} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
//  SEAGRASS
// ─────────────────────────────────────────────
function GrassBlade({ x, z, height, colorH }) {
  const ref = useRef()
  const phaseX = useMemo(() => Math.random() * Math.PI * 2, [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.9 + phaseX) * 0.22
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.7 + phaseX) * 0.08
  })
  return (
    <mesh ref={ref} position={[x, -1.0 + height / 2, z]}>
      <boxGeometry args={[0.04, height, 0.018]} />
      <meshStandardMaterial
        color={`hsl(${colorH}, 52%, 32%)`}
        roughness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function PlantPatches() {
  const blades = useMemo(() => {
    const result = []
    const centers = [
      [-3.2, -3.0], [-3.0, 2.8], [3.1, -2.9], [3.0, 2.5],
      [-1.5, 3.4], [1.6, -3.6], [-3.6, 0.4], [3.3, -0.5],
      [0.5, 3.5], [-2.0, -3.5],
    ]
    centers.forEach(([cx, cz]) => {
      for (let b = 0; b < 7; b++) {
        result.push({
          x: cx + (Math.random() - 0.5) * 0.5,
          z: cz + (Math.random() - 0.5) * 0.5,
          height: 0.4 + Math.random() * 0.8,
          colorH: 110 + Math.random() * 35,
        })
      }
    })
    return result
  }, [])

  return (
    <>
      {blades.map((b, i) => <GrassBlade key={i} {...b} />)}
    </>
  )
}

// ─────────────────────────────────────────────
//  SINGLE SHRIMP
// ─────────────────────────────────────────────
function Shrimp({ cx, cz, speed, phase, swimY }) {
  const groupRef = useRef()
  const bodyGroupRef = useRef()

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime() * speed + phase
    groupRef.current.position.x = cx + Math.sin(t) * 1.6
    groupRef.current.position.z = cz + Math.cos(t * 0.75) * 1.4
    groupRef.current.position.y = swimY + Math.sin(t * 2.3) * 0.1
    const dx = Math.cos(t) * 1.6
    const dz = -Math.sin(t * 0.75) * 1.4
    groupRef.current.rotation.y = Math.atan2(dx, dz)
    if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.z = Math.sin(t * 5) * 0.1
    }
  })

  const segColors = ['#ff7043', '#ff7043', '#ff6035', '#ef5350', '#e53935']

  return (
    <group ref={groupRef}>
      <group ref={bodyGroupRef}>
        {segColors.map((col, i) => (
          <mesh key={i} position={[-0.26 + i * 0.13, 0, 0]} scale={[0.13, 0.075 - i * 0.006, 0.09]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={col} roughness={0.55} />
          </mesh>
        ))}
        <mesh position={[-0.34, 0.015, 0]} scale={[0.14, 0.1, 0.105]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ff5722" roughness={0.45} />
        </mesh>
        <mesh position={[-0.42, 0.06, 0.055]}>
          <sphereGeometry args={[0.019, 7, 7]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh position={[-0.42, 0.06, -0.055]}>
          <sphereGeometry args={[0.019, 7, 7]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh position={[-0.47, 0.07, 0.04]} rotation={[0.15, 0, 0.55]}>
          <cylinderGeometry args={[0.006, 0.003, 0.25, 4]} />
          <meshStandardMaterial color="#ffab91" />
        </mesh>
        <mesh position={[-0.47, 0.07, -0.04]} rotation={[-0.15, 0, 0.55]}>
          <cylinderGeometry args={[0.006, 0.003, 0.25, 4]} />
          <meshStandardMaterial color="#ffab91" />
        </mesh>
        {[-0.18, -0.07, 0.04, 0.13, 0.22].map((lx, i) => (
          <React.Fragment key={i}>
            <mesh position={[lx, -0.055, 0.09]} rotation={[0.5, 0, 0.25]}>
              <cylinderGeometry args={[0.007, 0.004, 0.1, 4]} />
              <meshStandardMaterial color="#ffab91" />
            </mesh>
            <mesh position={[lx, -0.055, -0.09]} rotation={[-0.5, 0, -0.25]}>
              <cylinderGeometry args={[0.007, 0.004, 0.1, 4]} />
              <meshStandardMaterial color="#ffab91" />
            </mesh>
          </React.Fragment>
        ))}
        {[-0.065, 0, 0.065].map((zo, i) => (
          <mesh key={i} position={[0.42, -0.01, zo]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.14, 0.035, 0.048]} />
            <meshStandardMaterial color="#e64a19" roughness={0.7} transparent opacity={0.88} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ShrimpSchool({ count = 12 }) {
  const data = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      cx: (Math.random() - 0.5) * 4.5,
      cz: (Math.random() - 0.5) * 4.5,
      speed: 0.28 + Math.random() * 0.38,
      phase: Math.random() * Math.PI * 2,
      swimY: -0.18 - Math.random() * 0.52,
    }))
  , [count])

  return <>{data.map(d => <Shrimp key={d.id} {...d} />)}</>
}

// ─────────────────────────────────────────────
//  BUBBLES
// ─────────────────────────────────────────────
function Bubble({ bx, bz, bDelay }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = ((clock.getElapsedTime() * 0.45 + bDelay) % 1)
    ref.current.position.y = -0.92 + t * 1.45
    ref.current.position.x = bx + Math.sin(clock.getElapsedTime() * 1.8 + bDelay * 5) * 0.07
    ref.current.position.z = bz + Math.cos(clock.getElapsedTime() * 1.5 + bDelay * 4) * 0.07
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1
    ref.current.material.opacity = 0.38 * fade
  })
  return (
    <mesh ref={ref} position={[bx, -0.92, bz]}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshStandardMaterial color="#b8e8ff" transparent opacity={0.38} roughness={0} metalness={0.15} />
    </mesh>
  )
}

function BubbleField({ count = 40 }) {
  const data = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      bx: (Math.random() - 0.5) * 7.2,
      bz: (Math.random() - 0.5) * 7.2,
      bDelay: Math.random() * 2.2,
    }))
  , [count])
  return <>{data.map(d => <Bubble key={d.id} {...d} />)}</>
}

// ─────────────────────────────────────────────
//  CAUSTIC LIGHTS
// ─────────────────────────────────────────────
function LightShaft({ x, z, ph }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.intensity = 0.18 + Math.sin(clock.getElapsedTime() * 0.7 + ph) * 0.1
  })
  return <pointLight ref={ref} position={[x, 0.3, z]} color="#88ddff" intensity={0.25} distance={4} />
}

// ─────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────
export default function Pond3D({ status = 'GOOD' }) {
  const statusLabel = status === 'DANGER' ? 'CRITICAL' : status === 'WARNING' ? 'WARNING' : 'HEALTHY'
  const statusColor = status === 'DANGER' ? '#ff6666' : status === 'WARNING' ? '#ffcc44' : '#00ff88'
  const statusBg = status === 'DANGER' ? 'rgba(255,60,60,0.18)' : status === 'WARNING' ? 'rgba(255,170,0,0.18)' : 'rgba(0,200,100,0.18)'
  const statusBorder = status === 'DANGER' ? '#ff4444' : status === 'WARNING' ? '#ffaa00' : '#00cc66'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>

      <div style={{
        position: 'absolute', top: 12, left: 14, zIndex: 20,
        padding: '4px 16px', borderRadius: 20,
        background: statusBg, border: `1.5px solid ${statusBorder}`,
        color: statusColor, fontFamily: 'monospace', fontWeight: 700,
        fontSize: 12, letterSpacing: 2, backdropFilter: 'blur(6px)',
        userSelect: 'none',
      }}>
        ● {statusLabel}
      </div>

      <div style={{
        position: 'absolute', top: 12, right: 14, zIndex: 20,
        padding: '4px 14px', borderRadius: 20,
        background: 'rgba(0,20,50,0.6)', border: '1.5px solid rgba(0,170,255,0.3)',
        color: '#88ccff', fontFamily: 'monospace', fontSize: 12,
        backdropFilter: 'blur(6px)', userSelect: 'none',
      }}>
        🦐 12 shrimps
      </div>

      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        padding: '3px 14px', borderRadius: 20,
        background: 'rgba(0,20,50,0.5)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: 11,
        userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        drag to rotate · scroll to zoom
      </div>

      <Canvas
        camera={{ position: [3, 5, 7], fov: 50 }}
        style={{ background: 'linear-gradient(180deg,#051828 0%,#083050 100%)' }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} color="#99bbdd" />
        <directionalLight position={[8, 14, 6]} intensity={1.0} color="#fff8e0" />
        <directionalLight position={[-6, 8, -5]} intensity={0.28} color="#88bbff" />

        {[
          { x: -2, z: -1.5, ph: 0 },
          { x: 2, z: 2, ph: 1.2 },
          { x: 1, z: -2.5, ph: 2.5 },
          { x: -1, z: 1.8, ph: 3.8 },
        ].map((l, i) => <LightShaft key={i} {...l} />)}

        <PondFloor />
        <PondWalls />
        <PlantPatches />
        <ShrimpSchool count={12} />
        <BubbleField count={40} />
        <WaterLayer2 />
        <WaterSurface status={status} />

        <OrbitControls
          enablePan={false}
          minDistance={3.5}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  )
}