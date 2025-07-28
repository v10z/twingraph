import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Torus, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Animated Box component
function AnimatedBox(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <Box
      {...props}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <meshStandardMaterial color={hovered ? '#82aaff' : '#6699cc'} />
    </Box>
  );
}

// Animated Sphere with distortion
function AnimatedSphere(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime) * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} {...props} args={[1, 32, 32]}>
      <MeshDistortMaterial
        color="#99c794"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.2}
      />
    </Sphere>
  );
}

// Animated Torus
function AnimatedTorus(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <Torus ref={meshRef} {...props} args={[1, 0.4, 16, 100]}>
      <meshStandardMaterial color="#ffcc66" metalness={0.8} roughness={0.2} />
    </Torus>
  );
}

export const ThreeJSViewer: React.FC = () => {
  const [fileContent, setFileContent] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        setFileContent(data);
      } catch (error) {
        console.error('Failed to parse file:', error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#001733]">
      {/* Header */}
      <div className="p-4 border-b border-[#7aa6da20]">
        <h3 className="text-sm font-medium text-[#bbdaff] mb-2">3D Visualization</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
        >
          Load 3D Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 3D Canvas */}
      <div className="flex-1" style={{ background: '#002451' }}>
        <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[-10, -10, -10]} />
          
          {/* Sample animated objects */}
          <AnimatedBox position={[-2, 0, 0]} />
          <AnimatedSphere position={[2, 0, 0]} />
          <AnimatedTorus position={[0, 2, 0]} />
          
          {/* If file data is loaded, render additional objects based on it */}
          {fileContent && fileContent.objects && fileContent.objects.map((obj: any, index: number) => (
            <Box key={index} position={[obj.x || 0, obj.y || 0, obj.z || 0]}>
              <meshStandardMaterial color={obj.color || '#ffffff'} />
            </Box>
          ))}
          
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          
          {/* Grid helper */}
          <gridHelper args={[10, 10, '#003666', '#002451']} />
        </Canvas>
      </div>

      {/* Info panel */}
      <div className="p-3 border-t border-[#7aa6da20] text-xs text-[#7aa6da]">
        <div>Click boxes to scale • Hover to change color • Drag to rotate view</div>
        <div>60 FPS 3D rendering with React Three Fiber</div>
      </div>
    </div>
  );
};