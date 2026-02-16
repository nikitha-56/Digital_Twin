import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function WaterPlane({ color = '#0b67a6' }){
	const mesh = useRef()
	useFrame(({ clock }) => {
		if(mesh.current){
			mesh.current.rotation.z = Math.sin(clock.getElapsedTime()/4) * 0.02
			mesh.current.position.y = Math.sin(clock.getElapsedTime()/2) * 0.02
		}
	})

	return (
		<mesh ref={mesh} rotationX={-Math.PI/2}>
			<planeGeometry args={[6, 6, 32, 32]} />
			<meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
		</mesh>
	)
}

export default function Pond3D({ status = 'GOOD' }){
	const colorMap = {
		GOOD: '#4CAF50',
		WARNING: '#FFC107',
		DANGER: '#F44336'
	}
	return (
		<Canvas camera={{ position: [0, 3.5, 4], fov: 50 }}>
			<ambientLight intensity={0.6} />
			<directionalLight position={[5, 10, 7]} intensity={0.8} />
			<WaterPlane color={colorMap[status] || '#0b67a6'} />
		</Canvas>
	)
}
