import React, { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

function detectBehaviour(doLevel, ammonia, symptom, feedActive) {
  if (doLevel < 3.0)   return 'surface_crowding'
  if (ammonia > 0.4)   return 'erratic'
  if (feedActive)      return 'feeding'
  if (symptom === 'lethargy' || symptom === 'reduced activity') return 'lethargic'
  return 'normal'
}

const BEHAVIOUR_INFO = {
  surface_crowding: { label:'Surface Crowding', icon:'😮‍💨', color:'#ff4444', desc:'DO critically low — shrimp gasping at surface' },
  erratic:          { label:'Erratic Swimming',  icon:'🌀',   color:'#ffaa00', desc:'Ammonia toxicity — disoriented & panicking' },
  feeding:          { label:'Feeding Response',  icon:'🍤',   color:'#66bb6a', desc:'Active feeding — healthy foraging behaviour' },
  lethargic:        { label:'Lethargic',          icon:'💤',  color:'#bb6655', desc:'Low energy — stress or disease indicators' },
  normal:           { label:'Normal Swimming',    icon:'🦐',  color:'#4fc3f7', desc:'Healthy activity — all parameters in range' },
}

// ── Water surface ─────────────────────────────────────────────────────────────
function WaterSurface({ status, lowDO, highAmmonia }) {
  const ref = useRef()
  const color = highAmmonia ? '#886600' : lowDO ? '#771100' :
    status==='Critical'?'#aa1111':status==='Warning'?'#aa6600':status==='Moderate'?'#007766':'#006699'
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 0.46 + Math.sin(clock.getElapsedTime() * 0.7) * 0.018
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI/2} position={[0,0.46,0]}>
      <planeGeometry args={[7.5,7.5]}/>
      <meshStandardMaterial color={color} transparent opacity={0.38} roughness={0.05} metalness={0.35} side={THREE.DoubleSide}/>
    </mesh>
  )
}

function WaterBody({ status }) {
  const color = status==='Critical'?'#880800':status==='Warning'?'#774400':status==='Moderate'?'#004433':'#003355'
  return (
    <mesh position={[0,-0.28,0]}>
      <boxGeometry args={[7.4,1.5,7.4]}/>
      <meshStandardMaterial color={color} transparent opacity={0.22} roughness={0.1}/>
    </mesh>
  )
}

// ── Pond structure ────────────────────────────────────────────────────────────
function PondBase() {
  const pebbles = useMemo(()=>Array.from({length:50}).map(()=>({
    x:(Math.random()-0.5)*6.6, z:(Math.random()-0.5)*6.6,
    s:0.04+Math.random()*0.1,
    c:`hsl(${28+Math.random()*18},${22+Math.random()*18}%,${38+Math.random()*18}%)`
  })),[])
  return (
    <group>
      <mesh rotation-x={-Math.PI/2} position={[0,-1.0,0]}>
        <planeGeometry args={[8.0,8.0]}/>
        <meshStandardMaterial color="#b8934a" roughness={0.95}/>
      </mesh>
      {pebbles.map((p,i)=>(
        <mesh key={i} position={[p.x,-0.97,p.z]} scale={[p.s,0.035,p.s]}>
          <sphereGeometry args={[1,6,6]}/>
          <meshStandardMaterial color={p.c} roughness={1}/>
        </mesh>
      ))}
    </group>
  )
}

function PondWalls() {
  return (
    <group>
      <mesh position={[0,-0.28,-3.9]}><boxGeometry args={[8.2,1.58,0.28]}/><meshStandardMaterial color="#4a7a4a" roughness={0.88}/></mesh>
      <mesh position={[0,-0.28, 3.9]}><boxGeometry args={[8.2,1.58,0.28]}/><meshStandardMaterial color="#4a7a4a" roughness={0.88}/></mesh>
      <mesh position={[-3.9,-0.28,0]}><boxGeometry args={[0.28,1.58,8.2]}/><meshStandardMaterial color="#4a7a4a" roughness={0.88}/></mesh>
      <mesh position={[ 3.9,-0.28,0]}><boxGeometry args={[0.28,1.58,8.2]}/><meshStandardMaterial color="#4a7a4a" roughness={0.88}/></mesh>
      {/* Ledge */}
      <mesh position={[0, 0.5,-3.9]}><boxGeometry args={[8.4,0.1,0.48]}/><meshStandardMaterial color="#3a6a3a" roughness={0.85}/></mesh>
      <mesh position={[0, 0.5, 3.9]}><boxGeometry args={[8.4,0.1,0.48]}/><meshStandardMaterial color="#3a6a3a" roughness={0.85}/></mesh>
      <mesh position={[-3.9,0.5,0]}><boxGeometry args={[0.48,0.1,8.4]}/><meshStandardMaterial color="#3a6a3a" roughness={0.85}/></mesh>
      <mesh position={[ 3.9,0.5,0]}><boxGeometry args={[0.48,0.1,8.4]}/><meshStandardMaterial color="#3a6a3a" roughness={0.85}/></mesh>
    </group>
  )
}

// ── Seagrass ──────────────────────────────────────────────────────────────────
function GrassBlade({ x, z, h, hue, phase }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.z = Math.sin(t*0.8+phase)*0.18
    ref.current.rotation.x = Math.sin(t*0.6+phase)*0.07
  })
  return (
    <mesh ref={ref} position={[x,-1.0+h/2,z]}>
      <cylinderGeometry args={[0.012,0.02,h,5]}/>
      <meshStandardMaterial color={`hsl(${hue},52%,26%)`} roughness={0.8}/>
    </mesh>
  )
}

function PlantPatches() {
  const blades = useMemo(()=>{
    const centers=[[-3.1,-3.0],[-2.8,3.0],[3.0,-2.9],[2.9,2.7],[-1.1,3.4],[1.4,-3.5],[-3.5,0.4],[3.1,-0.4],[0.4,3.5],[-2.1,-3.4],[2.7,1.3],[-0.7,-3.5]]
    return centers.flatMap(([cx,cz])=>Array.from({length:6}).map(()=>({
      x:cx+(Math.random()-0.5)*0.45, z:cz+(Math.random()-0.5)*0.45,
      h:0.4+Math.random()*0.75, hue:112+Math.random()*28, phase:Math.random()*Math.PI*2,
    })))
  },[])
  return <>{blades.map((b,i)=><GrassBlade key={i} {...b}/>)}</>
}

// ── Aerator ───────────────────────────────────────────────────────────────────
function Aerator({ x, z }) {
  const blades = useRef()
  useFrame(({ clock })=>{ if(blades.current) blades.current.rotation.y = clock.getElapsedTime()*2.2 })
  return (
    <group position={[x,0.32,z]}>
      <mesh><cylinderGeometry args={[0.07,0.07,0.1,8]}/><meshStandardMaterial color="#777"/></mesh>
      <group ref={blades}>
        {[0,1,2,3].map(i=>(
          <mesh key={i} position={[Math.cos(i*Math.PI/2)*0.16, 0, Math.sin(i*Math.PI/2)*0.16]}>
            <boxGeometry args={[0.18,0.035,0.08]}/><meshStandardMaterial color="#999"/>
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── Bubbles ───────────────────────────────────────────────────────────────────
function Bubble({ x, z, delay, size, lowDO }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.getElapsedTime()*(lowDO?0.65:0.32) + delay) % 1
    ref.current.position.y = -0.88 + t*1.42
    ref.current.material.opacity = t>0.82 ? (1-(t-0.82)/0.18)*0.45 : 0.45
  })
  return (
    <mesh ref={ref} position={[x,-0.88,z]}>
      <sphereGeometry args={[size,7,7]}/>
      <meshStandardMaterial color={lowDO?'#ff5533':'#aaddff'} transparent opacity={0.45} roughness={0}/>
    </mesh>
  )
}

function BubbleField({ lowDO }) {
  const data = useMemo(()=>Array.from({length:lowDO?65:28}).map((_,i)=>({
    id:i, x:(Math.random()-0.5)*6.2, z:(Math.random()-0.5)*6.2,
    delay:Math.random()*2.8, size:lowDO?0.026+Math.random()*0.018:0.015+Math.random()*0.012,
  })),[lowDO])
  return <>{data.map(b=><Bubble key={b.id} {...b} lowDO={lowDO}/>)}</>
}

// ── Feed pellets ──────────────────────────────────────────────────────────────
function FeedPellet({ x, z, delay }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.getElapsedTime()*0.22+delay)%1
    ref.current.position.y = 0.52-t*1.55
    ref.current.material.opacity = t>0.88?(1-(t-0.88)/0.12):0.92
  })
  return (
    <mesh ref={ref} position={[x,0.52,z]}>
      <sphereGeometry args={[0.038,6,6]}/>
      <meshStandardMaterial color="#c8952a" transparent opacity={0.92} roughness={0.85}/>
    </mesh>
  )
}

function FeedStation({ x, z }) {
  const pellets = useMemo(()=>Array.from({length:9}).map((_,i)=>({
    id:i, ox:(Math.random()-0.5)*0.65, oz:(Math.random()-0.5)*0.65, delay:Math.random()*4,
  })),[])
  return (
    <>
      {pellets.map(p=><FeedPellet key={p.id} x={x+p.ox} z={z+p.oz} delay={p.delay}/>)}
      <mesh rotation-x={-Math.PI/2} position={[x,0.48,z]}>
        <ringGeometry args={[0.18,0.23,20]}/>
        <meshStandardMaterial color="#88ddff" transparent opacity={0.28} side={THREE.DoubleSide}/>
      </mesh>
    </>
  )
}

// ── Ammonia haze ──────────────────────────────────────────────────────────────
function ToxicHaze({ ammonia }) {
  const ref = useRef()
  const base = Math.min((ammonia-0.3)/0.8,1)*0.16
  useFrame(({ clock })=>{
    if(ref.current) ref.current.material.opacity = base+Math.sin(clock.getElapsedTime()*0.45)*0.025
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI/2} position={[0,0.08,0]}>
      <planeGeometry args={[7.2,7.2]}/>
      <meshStandardMaterial color="#ff6600" transparent opacity={base} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
  )
}

// ── Caustic lights ────────────────────────────────────────────────────────────
function CausticLight({ x, z, ph }) {
  const ref = useRef()
  useFrame(({ clock })=>{
    if(ref.current) ref.current.intensity = 0.14+Math.sin(clock.getElapsedTime()*0.85+ph)*0.07
  })
  return <pointLight ref={ref} position={[x,0.35,z]} color="#88ccff" intensity={0.18} distance={3.2}/>
}

// ── Individual shrimp ─────────────────────────────────────────────────────────
function Shrimp({ id, cx, cz, speed, phase, behaviour, feedX, feedZ, index, isSelected, onClick }) {
  const group = useRef()
  const body  = useRef()

  useFrame(({ clock }) => {
    if (!group.current) return
    const t   = clock.getElapsedTime() * speed + phase
    const px  = group.current._px ?? cx
    const pz  = group.current._pz ?? cz

    if (behaviour === 'surface_crowding') {
      // Packed near surface, noses tilted up, slow tight circles
      group.current.position.x = cx*0.5 + Math.sin(t*1.6+index*0.55)*0.7
      group.current.position.z = cz*0.5 + Math.cos(t*1.3+index*0.5)*0.7
      group.current.position.y = 0.20 + Math.sin(t*3.8+index)*0.06
      group.current.rotation.x = -0.65 + Math.sin(t*2)*0.18

    } else if (behaviour === 'erratic') {
      // Sharp snaps to random spots — clearly panicked
      const snap = Math.floor(t*2.2)
      const tx = Math.sin(snap*2.5+index*2.1)*2.4
      const tz = Math.cos(snap*1.9+index*1.7)*2.4
      group.current.position.x = tx + Math.sin(t*5)*0.22
      group.current.position.z = tz + Math.cos(t*4.2)*0.22
      group.current.position.y = -0.12 + Math.sin(t*7+index)*0.38
      group.current.rotation.z = Math.sin(t*9)*0.65
      group.current.rotation.x = Math.sin(t*5.5+index)*0.38

    } else if (behaviour === 'feeding') {
      // ONLY cluster at feed when feedActive — tight circles around feed point, head dipping
      group.current.position.x = feedX + Math.sin(t*2.2+phase)*0.48
      group.current.position.z = feedZ + Math.cos(t*1.8+phase)*0.48
      group.current.position.y = -0.58 + Math.abs(Math.sin(t*3.2))*0.13
      group.current.rotation.x = 0.55 + Math.abs(Math.sin(t*3.2))*0.3

    } else if (behaviour === 'lethargic') {
      // Very slow near floor
      group.current.position.x = cx + Math.sin(t*0.25)*0.55
      group.current.position.z = cz + Math.cos(t*0.2)*0.55
      group.current.position.y = -0.80 + Math.sin(t*0.4)*0.022
      group.current.rotation.z = Math.sin(t*0.3)*0.055

    } else {
      // Normal — roam freely across whole pond, mid-water
      group.current.position.x = cx + Math.sin(t)*1.55 + Math.sin(t*0.3+phase)*0.6
      group.current.position.z = cz + Math.cos(t*0.7)*1.35 + Math.cos(t*0.4+phase)*0.5
      group.current.position.y = -0.2 + Math.sin(t*2.1)*0.1
    }

    // Face direction
    const dx = group.current.position.x - px
    const dz = group.current.position.z - pz
    if (Math.abs(dx)+Math.abs(dz) > 0.0008) group.current.rotation.y = Math.atan2(dx,dz)
    group.current._px = group.current.position.x
    group.current._pz = group.current.position.z

    if (body.current) body.current.rotation.z = Math.sin(t*4)*(behaviour==='erratic'?0.4:0.07)
  })

  const info  = BEHAVIOUR_INFO[behaviour] ?? BEHAVIOUR_INFO.normal
  const col   = isSelected ? '#ffffff' : info.color
  const emi   = isSelected ? '#ffffff' : info.color
  const emiI  = isSelected ? 0.55 : 0.12
  const S     = 1.0   // normal size — not too big

  return (
    <group ref={group} scale={[S,S,S]}
      onClick={e=>{ e.stopPropagation(); onClick(id) }}>
      <group ref={body}>
        {/* Body segments */}
        {[col,col,'#cc4411','#bb3300','#aa2200'].map((c,i)=>(
          <mesh key={i} position={[-0.24+i*0.12,0,0]} scale={[0.115,0.065-i*0.005,0.078]}>
            <sphereGeometry args={[1,8,6]}/>
            <meshStandardMaterial color={c} roughness={0.5} emissive={emi} emissiveIntensity={emiI}/>
          </mesh>
        ))}
        {/* Head */}
        <mesh position={[-0.30,0.01,0]} scale={[0.12,0.088,0.092]}>
          <sphereGeometry args={[1,10,8]}/>
          <meshStandardMaterial color={col} roughness={0.4} emissive={emi} emissiveIntensity={emiI}/>
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.37,0.052, 0.045]}><sphereGeometry args={[0.016,6,6]}/><meshStandardMaterial color="#111"/></mesh>
        <mesh position={[-0.37,0.052,-0.045]}><sphereGeometry args={[0.016,6,6]}/><meshStandardMaterial color="#111"/></mesh>
        {/* Antennae */}
        <mesh position={[-0.41,0.06, 0.034]} rotation={[0.1,0,0.48]}><cylinderGeometry args={[0.004,0.002,0.20,4]}/><meshStandardMaterial color="#ffccaa"/></mesh>
        <mesh position={[-0.41,0.06,-0.034]} rotation={[-0.1,0,0.48]}><cylinderGeometry args={[0.004,0.002,0.20,4]}/><meshStandardMaterial color="#ffccaa"/></mesh>
        {/* Legs */}
        {[-0.14,-0.04,0.05,0.13,0.20].map((lx,i)=>(
          <React.Fragment key={i}>
            <mesh position={[lx,-0.045,0.075]} rotation={[0.4,0,0.18]}><cylinderGeometry args={[0.005,0.003,0.08,4]}/><meshStandardMaterial color="#ffccaa"/></mesh>
            <mesh position={[lx,-0.045,-0.075]} rotation={[-0.4,0,-0.18]}><cylinderGeometry args={[0.005,0.003,0.08,4]}/><meshStandardMaterial color="#ffccaa"/></mesh>
          </React.Fragment>
        ))}
        {/* Tail */}
        {[-0.055,0,0.055].map((zo,i)=>(
          <mesh key={i} position={[0.36,-0.01,zo]} rotation={[0,0,-0.18]}>
            <boxGeometry args={[0.11,0.028,0.04]}/>
            <meshStandardMaterial color="#bb2200" roughness={0.7} transparent opacity={0.85}/>
          </mesh>
        ))}
        {/* Selection ring */}
        {isSelected && (
          <mesh rotation-x={-Math.PI/2} position={[0,-0.07,0]}>
            <ringGeometry args={[0.32,0.38,20]}/>
            <meshStandardMaterial color="#ffffff" transparent opacity={0.65} side={THREE.DoubleSide}/>
          </mesh>
        )}
      </group>

      {/* Tooltip on click */}
      {isSelected && (
        <Html position={[0,0.55,0]} center distanceFactor={5} style={{pointerEvents:'none'}}>
          <div style={{
            background:'rgba(4,12,22,0.93)', border:`1.5px solid ${info.color}`,
            borderRadius:9, padding:'7px 11px', minWidth:165,
            boxShadow:`0 0 14px ${info.color}44`, backdropFilter:'blur(10px)',
          }}>
            <div style={{fontSize:12, fontWeight:700, color:info.color, marginBottom:4}}>
              {info.icon} {info.label}
            </div>
            <div style={{fontSize:10, color:'rgba(255,255,255,0.58)', lineHeight:1.5}}>
              {info.desc}
            </div>
            <div style={{fontSize:9, color:'rgba(255,255,255,0.28)', marginTop:4}}>
              Tap pond floor to dismiss
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Shrimp school ─────────────────────────────────────────────────────────────
function ShrimpSchool({ behaviour, feedPoints, selectedId, onSelect }) {
  const COUNT = 30
  const data = useMemo(()=>{
    const pts = feedPoints.length>0 ? feedPoints : [{x:0,z:0}]
    return Array.from({length:COUNT}).map((_,i)=>({
      id:i, index:i,
      // Spread well across pond
      cx:(Math.random()-0.5)*3.8,
      cz:(Math.random()-0.5)*3.8,
      speed: behaviour==='erratic'          ? 1.1+Math.random()*0.5
           : behaviour==='surface_crowding' ? 0.55+Math.random()*0.25
           : behaviour==='feeding'          ? 0.75+Math.random()*0.35
           : behaviour==='lethargic'        ? 0.12+Math.random()*0.08
           :                                  0.28+Math.random()*0.18,
      phase: Math.random()*Math.PI*2,
      behaviour,
      feedX: pts[i%pts.length].x,
      feedZ: pts[i%pts.length].z,
    }))
  },[behaviour])

  return <>{data.map(d=>(
    <Shrimp key={d.id} {...d} isSelected={selectedId===d.id} onClick={onSelect}/>
  ))}</>
}

// ── Click-to-deselect floor ───────────────────────────────────────────────────
function FloorClick({ onDeselect }) {
  return (
    <mesh rotation-x={-Math.PI/2} position={[0,-0.99,0]} onClick={onDeselect}>
      <planeGeometry args={[20,20]}/>
      <meshStandardMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function Pond3D({
  status='Good', bsi=0, symptom='reduced activity',
  shrimpCount=30, doLevel=6, ammonia=0.1, feedActive=false,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const behaviour   = detectBehaviour(doLevel, ammonia, symptom, feedActive)
  const lowDO       = doLevel < 3.0
  const highAmmonia = ammonia > 0.4

  // Feed points ONLY when feedActive is true
  const feedPoints = feedActive
    ? [{x:-1.6,z:-1.6},{x:1.6,z:0.5},{x:-0.3,z:1.9}]
    : []

  const onSelect    = useCallback(id=>setSelectedId(p=>p===id?null:id),[])
  const onDeselect  = useCallback(()=>setSelectedId(null),[])

  return (
    <Canvas
      camera={{ position:[4,5.5,7.5], fov:47 }}
      style={{ width:'100%', height:'100%', background:'linear-gradient(180deg,#040d18 0%,#061525 60%,#040d1a 100%)' }}
      gl={{ antialias:true }}
    >
      <ambientLight intensity={lowDO?0.16:0.35} color={lowDO?'#ff4433':highAmmonia?'#ffbb33':'#99bbdd'}/>
      <directionalLight position={[8,14,6]} intensity={lowDO?0.5:0.9} color={highAmmonia?'#ffcc55':'#fff5dd'} castShadow/>
      <directionalLight position={[-5,7,-4]} intensity={0.2} color="#7799cc"/>
      {[{x:-2,z:-1.5,ph:0},{x:2.1,z:2,ph:1.4},{x:0.9,z:-2.4,ph:2.7},{x:-1.1,z:1.9,ph:4.0}]
        .map((l,i)=><CausticLight key={i} {...l}/>)}

      <PondBase/>
      <PondWalls/>
      <PlantPatches/>
      <Aerator x={-2.7} z={-2.7}/>
      <Aerator x={ 2.7} z={ 2.7}/>

      <WaterBody status={status}/>
      <BubbleField lowDO={lowDO}/>
      {highAmmonia && <ToxicHaze ammonia={ammonia}/>}
      {feedPoints.map((fp,i)=><FeedStation key={i} x={fp.x} z={fp.z}/>)}

      <ShrimpSchool
        behaviour={behaviour}
        feedPoints={feedPoints}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <WaterSurface status={status} lowDO={lowDO} highAmmonia={highAmmonia}/>
      <FloorClick onDeselect={onDeselect}/>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={18}
        maxPolarAngle={Math.PI/2.1} target={[0,0,0]} enableDamping dampingFactor={0.07}/>
    </Canvas>
  )
}