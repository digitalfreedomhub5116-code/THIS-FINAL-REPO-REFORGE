import React, { Component, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

// Add this to satisfy TS for R3F elements in global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

const HologramMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#001e36') },
    uGlowColor: { value: new THREE.Color('#00d2ff') },
    uActive: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uActive;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vPosition);
      float fresnel = pow(clamp(1.0 - dot(viewDir, normal), 0.0, 1.0), 2.0);
      float scan = smoothstep(0.9, 1.0, sin(vPosition.y * 20.0 - uTime * 3.0)) * 0.5;
      float pulse = (sin(uTime * 4.0) * 0.5 + 0.5) * uActive;
      vec3 base = mix(uColor, uGlowColor, fresnel * 0.5 + pulse * 0.5);
      gl_FragColor = vec4(base + scan * uGlowColor, fresnel * 0.8 + scan + pulse * 0.5 + 0.1);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
};

interface BodyPartProps {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  activeTarget: string;
  partName: string;
}

const BodyPart: React.FC<BodyPartProps> = ({ geometry, position, activeTarget, partName }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const isActive = useMemo(() => {
        const target = activeTarget.toLowerCase();
        const name = partName.toLowerCase();
        if (target === 'cardio') return 1.0;
        if (target === 'chest' && (name === 'chest')) return 1.0;
        if (target === 'legs' && name.includes('leg')) return 1.0;
        if (target === 'arms' && name.includes('arm')) return 1.0;
        return 0.0;
    }, [activeTarget, partName]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        ...HologramMaterial,
        uniforms: {
            ...HologramMaterial.uniforms,
            uTime: { value: 0 },
            uActive: { value: isActive },
            uColor: { value: new THREE.Color('#001e36') },
            uGlowColor: { value: new THREE.Color('#00d2ff') }
        }
    }), [isActive]);

    useFrame((state) => {
        if (material.uniforms) material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} position={position} />;
};

const ProceduralModel = ({ activeTarget }: { activeTarget: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const headGeo = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
    const torsoGeo = useMemo(() => new THREE.CylinderGeometry(0.6, 0.4, 1.5, 8), []);
    const limbGeo = useMemo(() => new THREE.CapsuleGeometry(0.15, 1.2, 4, 8), []);

    useFrame(() => {
        if (groupRef.current) groupRef.current.rotation.y += 0.005;
    });

    return (
        <group ref={groupRef} position={[0, -1, 0]}>
            <BodyPart partName="head" geometry={headGeo} position={[0, 2.8, 0]} activeTarget={activeTarget} />
            <BodyPart partName="chest" geometry={torsoGeo} position={[0, 1.6, 0]} activeTarget={activeTarget} />
            <BodyPart partName="arm_left" geometry={limbGeo} position={[-0.8, 1.3, 0]} activeTarget={activeTarget} />
            <BodyPart partName="arm_right" geometry={limbGeo} position={[0.8, 1.3, 0]} activeTarget={activeTarget} />
            <BodyPart partName="leg_left" geometry={limbGeo} position={[-0.3, -0.6, 0]} activeTarget={activeTarget} />
            <BodyPart partName="leg_right" geometry={limbGeo} position={[0.3, -0.6, 0]} activeTarget={activeTarget} />
        </group>
    );
};

const ThreeHologram: React.FC<{ activeMuscle: string }> = ({ activeMuscle }) => (
    <div className="w-full h-full relative">
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00d2ff" />
            <ProceduralModel activeTarget={activeMuscle} />
            <Environment preset="city" />
        </Canvas>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,210,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
    </div>
);

class WebGLErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-xl border border-gray-800">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">3D Engine Unavailable</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SafeThreeHologram(props: { activeMuscle: string }) {
  return (
    <WebGLErrorBoundary>
      <ThreeHologram {...props} />
    </WebGLErrorBoundary>
  );
}