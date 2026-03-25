'use client';

import { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ARPlacedItem } from './ar-placement';
import { FURNITURE_CATALOGUE } from '@/lib/gltf-loader';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RoomContextData {
  id: string;
  name: string;
  type: string;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
}

export interface WallOutlineData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  roomId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Room outline on the ground plane                                    */
/* ------------------------------------------------------------------ */

interface RoomOutlineProps {
  room: RoomContextData;
  wallOutlines: WallOutlineData[];
}

function RoomOutline({ room, wallOutlines }: RoomOutlineProps) {
  const roomWalls = wallOutlines.filter(w => w.roomId === room.id);

  if (roomWalls.length > 0) {
    // Compute bounds and transform
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const w of roomWalls) {
      minX = Math.min(minX, w.startX, w.endX);
      maxX = Math.max(maxX, w.startX, w.endX);
      minY = Math.min(minY, w.startY, w.endY);
      maxY = Math.max(maxY, w.startY, w.endY);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const maxSpan = Math.max(spanX, spanY, 1);
    const scale = 8 / maxSpan; // fit room in ~8m of scene space

    return (
      <group>
        {/* Wall outlines as lines on the ground */}
        {roomWalls.map((wall, i) => {
          const sx = (wall.startX - cx) * scale;
          const sz = (wall.startY - cy) * scale;
          const ex = (wall.endX - cx) * scale;
          const ez = (wall.endY - cy) * scale;

          const dx = ex - sx;
          const dz = ez - sz;
          const len = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dz, dx);
          const thick = Math.max((wall.thickness / 1000) * scale * 50, 0.05);

          return (
            <group key={i}>
              {/* Wall as thin box on ground */}
              <mesh
                position={[(sx + ex) / 2, 0.02, (sz + ez) / 2]}
                rotation={[0, -angle, 0]}
                receiveShadow
              >
                <boxGeometry args={[len, 0.04, thick]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.8} />
              </mesh>
            </group>
          );
        })}

        {/* Room label */}
        <Text
          position={[0, 0.08, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {room.name} ({room.type.replace(/_/g, ' ')})
        </Text>
      </group>
    );
  }

  // Fallback: draw room outline from dimensions
  const width = (room.lengthMm ?? 4000) / 1000;
  const depth = (room.widthMm ?? 3000) / 1000;

  return (
    <group>
      {/* Room floor outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#e8f0fe"
          transparent
          opacity={0.5}
          roughness={0.9}
        />
      </mesh>

      {/* Boundary lines */}
      <Line
        points={[
          [-width / 2, 0.01, -depth / 2],
          [width / 2, 0.01, -depth / 2],
          [width / 2, 0.01, depth / 2],
          [-width / 2, 0.01, depth / 2],
          [-width / 2, 0.01, -depth / 2],
        ]}
        color="#3b82f6"
        lineWidth={2}
        dashed
        dashSize={0.15}
        gapSize={0.08}
      />

      {/* Room label */}
      <Text
        position={[0, 0.05, -depth / 2 - 0.2]}
        fontSize={0.15}
        color="#3b82f6"
        anchorX="center"
        anchorY="top"
        font={undefined}
      >
        {room.name} ({width.toFixed(1)}m x {depth.toFixed(1)}m)
      </Text>

      {/* Dimension markers */}
      {/* Width */}
      <Line
        points={[
          [-width / 2, 0.01, depth / 2 + 0.15],
          [width / 2, 0.01, depth / 2 + 0.15],
        ]}
        color="#94a3b8"
        lineWidth={1}
      />
      <Text
        position={[0, 0.02, depth / 2 + 0.25]}
        fontSize={0.1}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {width.toFixed(1)}m
      </Text>

      {/* Depth */}
      <Line
        points={[
          [-width / 2 - 0.15, 0.01, -depth / 2],
          [-width / 2 - 0.15, 0.01, depth / 2],
        ]}
        color="#94a3b8"
        lineWidth={1}
      />
      <Text
        position={[-width / 2 - 0.25, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        fontSize={0.1}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {depth.toFixed(1)}m
      </Text>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual furniture piece in the AR scene                          */
/* ------------------------------------------------------------------ */

interface FurnitureBoxProps {
  item: ARPlacedItem;
  position: [number, number, number];
  isActive: boolean;
  onSelect: (id: string) => void;
}

function FurnitureBox({ item, position, isActive, onSelect }: FurnitureBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Find catalogue item for dimensions
  const catalogueItem = FURNITURE_CATALOGUE.find(f => f.name === item.name);
  const size = catalogueItem?.size ?? [0.5, 0.5, 0.5];

  const baseColor = new THREE.Color(item.color);
  const displayColor = isActive
    ? new THREE.Color('#3b82f6')
    : hovered
      ? baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.25)
      : baseColor;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(item.id);
  };

  // Animate active item
  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.02;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        scale={[item.scale, item.scale, item.scale]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size as [number, number, number]} />
        <meshStandardMaterial
          color={displayColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isActive}
          opacity={isActive ? 0.85 : 1.0}
        />
        {isActive && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...(size as [number, number, number]))]} />
            <lineBasicMaterial color="#3b82f6" linewidth={2} />
          </lineSegments>
        )}
      </mesh>

      {/* Label */}
      {(hovered || isActive) && (
        <Text
          position={[0, (size[1] * item.scale) / 2 + 0.2, 0]}
          fontSize={0.1}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {item.name} ({(item.scale * 100).toFixed(0)}%)
        </Text>
      )}

      {/* Ground shadow indicator for active */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -position[1] + 0.005, 0]}>
          <circleGeometry args={[Math.max(size[0], size[2]) * item.scale * 0.6, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Ground plane with surface-detection visual                         */
/* ------------------------------------------------------------------ */

function GroundPlane({ surfaceDetected }: { surfaceDetected: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={surfaceDetected ? '#f0f7f0' : '#f5f5f5'}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
      <Grid
        args={[20, 20]}
        position={[0, 0, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#e0e0e0"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#c0c0c0"
        fadeDistance={12}
        fadeStrength={1}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Placement ghost — shows where the next item will be placed         */
/* ------------------------------------------------------------------ */

interface PlacementGhostProps {
  selectedIndex: number | null;
}

function PlacementGhost({ selectedIndex }: PlacementGhostProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.001;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  if (selectedIndex === null) return null;
  const item = FURNITURE_CATALOGUE[selectedIndex];
  if (!item) return null;

  return (
    <mesh ref={meshRef} position={[0, item.size[1] / 2 + 0.05, 0]}>
      <boxGeometry args={item.size} />
      <meshStandardMaterial
        color={item.color}
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AR Scene 3D component                                         */
/* ------------------------------------------------------------------ */

export interface ARScene3DProps {
  placedItems: ARPlacedItem[];
  activeItemId: string | null;
  selectedItemIndex: number | null;
  surfaceDetected: boolean;
  onSelectItem: (id: string) => void;
  currentRoom?: RoomContextData | null;
  wallOutlines?: WallOutlineData[];
}

export default function ARScene3D({
  placedItems,
  activeItemId,
  selectedItemIndex,
  surfaceDetected,
  onSelectItem,
  currentRoom,
  wallOutlines = [],
}: ARScene3DProps) {
  // Compute positions for placed items - arrange them within room bounds
  const itemPositions = useMemo(() => {
    const roomW = currentRoom ? (currentRoom.lengthMm ?? 4000) / 1000 : 6;
    const roomD = currentRoom ? (currentRoom.widthMm ?? 3000) / 1000 : 6;

    return placedItems.map((item, index) => {
      const catalogueItem = FURNITURE_CATALOGUE.find(f => f.name === item.name);
      const size = catalogueItem?.size ?? [0.5, 0.5, 0.5];

      // Arrange items in a smart grid within room bounds
      const maxCols = Math.max(1, Math.floor(roomW / 1.5));
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);

      const spacingX = roomW / (maxCols + 1);
      const spacingZ = roomD / (Math.ceil(placedItems.length / maxCols) + 1);

      const x = -roomW / 2 + spacingX * (col + 1);
      const z = -roomD / 2 + spacingZ * (row + 1);
      const y = (size[1] * item.scale) / 2;

      return [x, y, z] as [number, number, number];
    });
  }, [placedItems, currentRoom]);

  // Camera position based on room size
  const cameraPos = useMemo((): [number, number, number] => {
    const roomW = currentRoom ? (currentRoom.lengthMm ?? 4000) / 1000 : 6;
    const roomD = currentRoom ? (currentRoom.widthMm ?? 3000) / 1000 : 6;
    const dist = Math.max(roomW, roomD) * 0.8;
    return [dist, dist, dist];
  }, [currentRoom]);

  return (
    <Canvas
      shadows
      camera={{ position: cameraPos, fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)' }}
      onClick={() => onSelectItem('')}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-3, 4, -5]} intensity={0.3} />

      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      <GroundPlane surfaceDetected={surfaceDetected} />

      {/* Room context outline */}
      {currentRoom && (
        <RoomOutline room={currentRoom} wallOutlines={wallOutlines} />
      )}

      <PlacementGhost selectedIndex={selectedItemIndex} />

      {/* Placed furniture */}
      {placedItems.map((item, index) => (
        <FurnitureBox
          key={item.id}
          item={item}
          position={itemPositions[index] ?? [0, 0.25, 0]}
          isActive={item.id === activeItemId}
          onSelect={onSelectItem}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={20}
      />
    </Canvas>
  );
}
