import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Grid } from '@react-three/drei';
import * as THREE from 'three';

interface HolodeckProps {
  stability: number;
}

const Octahedron = ({ stability }: { stability: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Terminal Green (#00FF41) vs Critical Red (#FF3333)
  const isStable = stability > 30;
  const color = isStable ? '#00FF41' : '#FF3333';
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotation speed doubles if unstable
      const speedMultiplier = isStable ? 1 : 2;
      meshRef.current.rotation.x += 0.2 * delta * speedMultiplier;
      meshRef.current.rotation.y += 0.3 * delta * speedMultiplier;
    }
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[2, 0]} />
      <meshBasicMaterial 
        color={color} 
        wireframe 
        transparent 
        opacity={0.6}
      />
    </mesh>
  );
};

const Holodeck: React.FC<HolodeckProps> = ({ stability }) => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <color attach="background" args={['#050505']} />
        
        <Octahedron stability={stability} />
        
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5} 
        />
        
        <Grid 
          position={[0, -2, 0]} 
          args={[20, 20]} 
          cellColor="#111" 
          sectionColor="#222" 
          fadeDistance={15}
        />
        
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
};

export default Holodeck;
