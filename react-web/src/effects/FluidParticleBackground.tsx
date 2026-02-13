/**
 * Fluid Particle Background Effect Component
 *
 * This component creates a WebGL-based fluid particle background with smooth
 * animations and interactive particle behavior.
 */

import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import type { FluidParticleConfig } from '../types';

/**
 * Detects if WebGL is available in the current browser environment
 * @returns true if WebGL is available, false otherwise
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Particle component for individual particles
 */
interface ParticleProps {
  readonly position: readonly [number, number, number];
  readonly color: string;
  readonly size: number;
}

function Particle({ position, color, size }: ParticleProps): JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.5;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.6}
        roughness={0.4}
        metalness={0.6}
      />
    </mesh>
  );
}

/**
 * Particle system component
 */
interface ParticleSystemProps extends Partial<FluidParticleConfig> {
  readonly count?: number;
  readonly colors?: readonly string[];
}

function ParticleSystem({
  count = 100,
  colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
  size = 0.3,
}: ParticleSystemProps): JSX.Element {
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: [
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
      ] as const,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: size * (0.5 + Math.random()),
    }));
  }, [count, colors, size]);

  return (
    <group>
      {particles.map((particle, index) => (
        <Particle
          key={index}
          position={particle.position}
          color={particle.color ?? '#3B82F6'}
          size={particle.size}
        />
      ))}
    </group>
  );
}

/**
 * FluidParticleBackground component properties
 */
interface FluidParticleBackgroundProps extends Partial<FluidParticleConfig> {
  readonly className?: string;
  readonly particleCount?: number;
  readonly colors?: readonly string[];
  readonly backgroundColor?: string;
}

/**
 * FluidParticleBackground component
 *
 * Creates a WebGL-based fluid particle background with smooth animations.
 * Falls back to a CSS gradient background when WebGL is not available.
 */
export default function FluidParticleBackground({
  className = '',
  particleCount = 150,
  colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'],
  backgroundColor = '#0F172A',
}: FluidParticleBackgroundProps): JSX.Element {
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
  }, []);

  // Fallback CSS gradient background when WebGL is not available
  if (!webglAvailable) {
    const gradientColors = colors.join(', ');
    return (
      <div
        className={`fluid-particle-background ${className}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          background: `linear-gradient(135deg, ${gradientColors})`,
          overflow: 'hidden',
        }}
      />
    );
  }

  // WebGL-based particle background
  return (
    <div
      className={`fluid-particle-background ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: backgroundColor,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
        <pointLight position={[10, -10, 10]} intensity={0.5} color="#3B82F6" />

        {/* Particle System */}
        <ParticleSystem count={particleCount} colors={colors} size={0.3} speed={1} />

        {/* Fog for depth effect */}
        <fog attach="fog" args={[backgroundColor, 20, 60]} />
      </Canvas>
    </div>
  );
}

/**
 * FloatingOrb component - A single floating orb with fluid animation
 */
interface FloatingOrbProps {
  readonly position: readonly [number, number, number];
  readonly color: string;
  readonly size?: number;
  readonly speed?: number;
}

export function FloatingOrb({
  position,
  color,
  size = 2,
  speed = 1,
}: FloatingOrbProps): JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed;
      meshRef.current.position.x = position[0] + Math.sin(time) * 2;
      meshRef.current.position.y = position[1] + Math.cos(time * 0.8) * 2;
      meshRef.current.position.z = position[2] + Math.sin(time * 0.5) * 1;
      meshRef.current.rotation.x = time * 0.2;
      meshRef.current.rotation.y = time * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

/**
 * GradientOrb component - An orb with gradient effect
 */
interface GradientOrbProps {
  readonly position: readonly [number, number, number];
  readonly colors: readonly [string, string];
  readonly size?: number;
}

export function GradientOrb({
  position,
  colors,
  size = 3,
}: GradientOrbProps): JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float time;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
      vec3 color = mix(color1, color2, intensity + sin(time) * 0.2);
      gl_FragColor = vec4(color, 0.3);
    }
  `;

  const uniforms = useMemo(
    () => ({
      color1: { value: new THREE.Color(colors[0]) },
      color2: { value: new THREE.Color(colors[1]) },
      time: { value: 0 },
    }),
    [colors]
  );

  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms && 'time' in materialRef.current.uniforms) {
      (materialRef.current.uniforms as { time: { value: number } }).time.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
