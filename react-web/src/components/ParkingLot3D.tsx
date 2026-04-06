/**
 * ParkingLot3D Component
 *
 * This component provides a 3D visualization of the parking lot using Three.js.
 * Includes interactive slots, vehicles, and entry points with smooth animations.
 */

import { Suspense, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import type {
  ParkingSlot,
  EntryPoint,
  VehicleType,
  SlotTypeLiteral,
  SlotStatusLiteral,
  Position3D,
} from '../types';

// ============================================================================
// SLOT COMPONENT
// ============================================================================

/**
 * ParkingSlot3D component properties
 */
interface ParkingSlot3DProps {
  readonly position: Position3D;
  readonly type: SlotTypeLiteral;
  readonly status: SlotStatusLiteral;
  readonly onClick: () => void;
  readonly isSelected: boolean;
}

/**
 * ParkingSlot3D component
 */
function ParkingSlot3D({
  position,
  type,
  status,
  onClick,
  isSelected,
}: ParkingSlot3DProps): JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo((): string => {
    if (isSelected) return '#FFD700'; // Gold for selected
    if (status === 'occupied') return '#EF4444'; // Red for occupied
    if (status === 'maintenance') return '#6B7280'; // Gray for maintenance
    return '#10B981'; // Green for available
  }, [status, isSelected]);

  const slotSize = useMemo((): [number, number, number] => {
    switch (type) {
      case 'SP': return [2, 4, 0.2]; // Small
      case 'MP': return [2.5, 5, 0.2]; // Medium
      case 'LP': return [3, 6, 0.2]; // Large
      default: return [2, 4, 0.2];
    }
  }, [type]);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={slotSize} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered ? 0.8 : 0.9}
        roughness={0.5}
        metalness={0.1}
      />
      {hovered && (
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {type}
        </Text>
      )}
    </mesh>
  );
}

// ============================================================================
// ENTRY POINT COMPONENT
// ============================================================================

/**
 * EntryPoint3D component properties
 */
interface EntryPoint3DProps {
  readonly position: Position3D;
  readonly label: string;
}

/**
 * EntryPoint3D component
 */
function EntryPoint3D({ position, label }: EntryPoint3DProps): JSX.Element {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[1, 1, 0.3, 32]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// ============================================================================
// VEHICLE COMPONENT
// ============================================================================

/**
 * Vehicle3D component properties
 */
interface Vehicle3DProps {
  readonly position: Position3D;
  readonly type: VehicleType;
}

/**
 * Vehicle3D component
 */
function Vehicle3D({ position, type }: Vehicle3DProps): JSX.Element {
  const vehicleColor = useMemo((): string => {
    switch (type) {
      case 'S': return '#3B82F6'; // Blue for small
      case 'M': return '#8B5CF6'; // Purple for medium
      case 'L': return '#F59E0B'; // Orange for large
      default: return '#3B82F6';
    }
  }, [type]);

  const vehicleSize = useMemo((): [number, number, number] => {
    switch (type) {
      case 'S': return [1.5, 3, 1.5];
      case 'M': return [2, 4, 2];
      case 'L': return [2.5, 5, 2.5];
      default: return [1.5, 3, 1.5];
    }
  }, [type]);

  return (
    <mesh position={position}>
      <boxGeometry args={vehicleSize} />
      <meshStandardMaterial color={vehicleColor} roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

// ============================================================================
// MAIN PARKING LOT COMPONENT
// ============================================================================

/**
 * ParkingLot3D component properties
 */
interface ParkingLot3DProps {
  readonly slots: readonly ParkingSlot[];
  readonly entryPoints: readonly EntryPoint[];
  readonly onSlotSelect: (slot: ParkingSlot) => void;
  readonly selectedSlot: ParkingSlot | null;
}

/**
 * ParkingLot3D component
 */
export default function ParkingLot3D({
  slots,
  entryPoints,
  onSlotSelect,
  selectedSlot,
}: ParkingLot3DProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height: '600px' }}
    >
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />

          {/* Ground grid */}
          <Grid
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#4B5563"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#374151"
            fadeDistance={30}
            fadeStrength={1}
          />

          {/* Entry points */}
          {entryPoints.map((ep) => (
            <EntryPoint3D
              key={ep.id}
              position={[ep.x ?? 0, 0.15, ep.z ?? 0]}
              label={ep.identifier}
            />
          ))}

          {/* Parking slots */}
          {slots.map((slot) => (
            <ParkingSlot3D
              key={slot.id}
              position={[slot.x ?? 0, 0.1, slot.z ?? 0]}
              type={slot.type}
              status={slot.status}
              onClick={() => onSlotSelect(slot)}
              isSelected={selectedSlot?.id === slot.id}
            />
          ))}

          {/* Vehicles (for occupied slots) */}
           {slots
             .filter((slot) => slot.status === 'occupied')
             .map((slot) => {
               // Convert slot type to vehicle type
               const slotToVehicleType = (slotType: string): VehicleType => {
                 switch (slotType) {
                   case 'SP': return 'S';
                   case 'MP': return 'M';
                   case 'LP': return 'L';
                   default: return 'S';
                 }
               };
               return (
                 <Vehicle3D
                   key={`vehicle-${slot.id}`}
                   position={[slot.x ?? 0, 1, slot.z ?? 0]}
                   type={slotToVehicleType(slot.slot_type ?? 'SP')}
                 />
               );
             })}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
          />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
