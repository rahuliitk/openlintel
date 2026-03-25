'use client';

import { useRef, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { VRWaypoint } from './vr-walkthrough';

/* ------------------------------------------------------------------ */
/*  Types for floor plan data                                          */
/* ------------------------------------------------------------------ */

export interface WallSegmentData {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  wallType: string;
  roomId?: string | null;
  openings: OpeningData[];
}

export interface OpeningData {
  id: string;
  openingType: string; // 'door' | 'window'
  subType?: string | null;
  offsetFromStart: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface RoomData {
  id: string;
  name: string;
  type: string;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
}

export interface FurniturePlacement {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color?: string;
}

export interface SpacePlanData {
  roomId: string;
  furniturePlacements: FurniturePlacement[] | null;
}

/* ------------------------------------------------------------------ */
/*  Coordinate conversion helper                                       */
/* ------------------------------------------------------------------ */

// Convert canvas coordinates (pixels) to world meters
// We use the bounding box of all walls to center and scale the scene
function useSceneTransform(walls: WallSegmentData[]) {
  return useMemo(() => {
    if (walls.length === 0) {
      return { offsetX: 0, offsetZ: 0, scale: 0.01 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const w of walls) {
      minX = Math.min(minX, w.startX, w.endX);
      maxX = Math.max(maxX, w.startX, w.endX);
      minY = Math.min(minY, w.startY, w.endY);
      maxY = Math.max(maxY, w.startY, w.endY);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const maxSpan = Math.max(spanX, spanY, 1);

    // Scale so the whole floor plan fits in ~20m world space
    const scale = 20 / maxSpan;

    return { offsetX: centerX, offsetZ: centerY, scale };
  }, [walls]);
}

function toWorld(
  canvasX: number,
  canvasY: number,
  transform: { offsetX: number; offsetZ: number; scale: number },
): [number, number] {
  return [
    (canvasX - transform.offsetX) * transform.scale,
    (canvasY - transform.offsetZ) * transform.scale,
  ];
}

/* ------------------------------------------------------------------ */
/*  Wall3D - renders a wall segment as 3D geometry with openings       */
/* ------------------------------------------------------------------ */

interface Wall3DProps {
  wall: WallSegmentData;
  transform: { offsetX: number; offsetZ: number; scale: number };
  wallHeight: number;
  isCurrent: boolean;
}

function Wall3D({ wall, transform, wallHeight, isCurrent }: Wall3DProps) {
  const [sx, sz] = toWorld(wall.startX, wall.startY, transform);
  const [ex, ez] = toWorld(wall.endX, wall.endY, transform);

  const dx = ex - sx;
  const dz = ez - sz;
  const wallLength = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const thickness = (wall.thickness / 1000) * transform.scale * 50; // scale thickness
  const thicknessWorld = Math.max(thickness, 0.08);

  const centerX = (sx + ex) / 2;
  const centerZ = (sz + ez) / 2;

  // Sort openings by offset
  const openings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart);

  // Build wall sections (splitting at openings)
  const sections: { start: number; end: number; yBottom: number; yTop: number }[] = [];

  if (openings.length === 0) {
    // Solid wall
    sections.push({ start: 0, end: wallLength, yBottom: 0, yTop: wallHeight });
  } else {
    // Convert opening offsets and widths to wall-length units
    const scaledOpenings = openings.map(o => ({
      ...o,
      scaledOffset: (o.offsetFromStart / 1000) * transform.scale * 50,
      scaledWidth: (o.width / 1000) * transform.scale * 50,
      scaledHeight: (o.height / 1000) * transform.scale * 50,
      scaledSill: (o.sillHeight / 1000) * transform.scale * 50,
    }));

    let cursor = 0;
    for (const opening of scaledOpenings) {
      const openStart = Math.min(opening.scaledOffset, wallLength);
      const openEnd = Math.min(openStart + opening.scaledWidth, wallLength);

      // Wall section before opening
      if (openStart > cursor) {
        sections.push({ start: cursor, end: openStart, yBottom: 0, yTop: wallHeight });
      }

      // Wall above opening (header)
      const openingTop = opening.scaledSill + opening.scaledHeight;
      if (openingTop < wallHeight) {
        sections.push({ start: openStart, end: openEnd, yBottom: openingTop, yTop: wallHeight });
      }

      // Wall below opening (sill) - for windows
      if (opening.openingType === 'window' && opening.scaledSill > 0.01) {
        sections.push({ start: openStart, end: openEnd, yBottom: 0, yTop: opening.scaledSill });
      }

      cursor = openEnd;
    }

    // Remaining wall after last opening
    if (cursor < wallLength) {
      sections.push({ start: cursor, end: wallLength, yBottom: 0, yTop: wallHeight });
    }
  }

  const wallColor = wall.wallType === 'exterior' ? '#e8e0d8' : '#f0ece6';
  const edgeColor = isCurrent ? '#3b82f6' : '#b0a898';

  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, -angle, 0]}>
      {sections.map((section, i) => {
        const sectionLength = section.end - section.start;
        const sectionHeight = section.yTop - section.yBottom;
        if (sectionLength < 0.01 || sectionHeight < 0.01) return null;

        const sectionCenterX = (section.start + section.end) / 2 - wallLength / 2;
        const sectionCenterY = (section.yBottom + section.yTop) / 2;

        return (
          <group key={i} position={[sectionCenterX, sectionCenterY, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[sectionLength, sectionHeight, thicknessWorld]} />
              <meshStandardMaterial
                color={wallColor}
                roughness={0.85}
                metalness={0.0}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(sectionLength, sectionHeight, thicknessWorld)]} />
              <lineBasicMaterial color={edgeColor} linewidth={1} />
            </lineSegments>
          </group>
        );
      })}

      {/* Opening frames - render door/window frame indicators */}
      {openings.map((opening, i) => {
        const scaledOffset = (opening.offsetFromStart / 1000) * transform.scale * 50;
        const scaledWidth = (opening.width / 1000) * transform.scale * 50;
        const scaledHeight = (opening.height / 1000) * transform.scale * 50;
        const scaledSill = (opening.sillHeight / 1000) * transform.scale * 50;

        const frameX = scaledOffset + scaledWidth / 2 - wallLength / 2;
        const frameY = scaledSill + scaledHeight / 2;
        const isDoor = opening.openingType === 'door';

        return (
          <group key={`opening-${i}`} position={[frameX, frameY, 0]}>
            {/* Opening frame outline */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(scaledWidth, scaledHeight, thicknessWorld + 0.02)]} />
              <lineBasicMaterial color={isDoor ? '#8B4513' : '#6BA3D6'} linewidth={2} />
            </lineSegments>
            {/* Glass for windows */}
            {!isDoor && (
              <mesh>
                <boxGeometry args={[scaledWidth - 0.02, scaledHeight - 0.02, 0.01]} />
                <meshStandardMaterial
                  color="#87CEEB"
                  transparent
                  opacity={0.25}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Floor plane for a room                                             */
/* ------------------------------------------------------------------ */

interface RoomFloorProps {
  room: RoomData;
  wallsForRoom: WallSegmentData[];
  transform: { offsetX: number; offsetZ: number; scale: number };
  isCurrent: boolean;
  onClick: (id: string) => void;
}

function RoomFloor({ room, wallsForRoom, transform, isCurrent, onClick }: RoomFloorProps) {
  // Compute room bounding box from its walls
  const bounds = useMemo(() => {
    if (wallsForRoom.length === 0) {
      // Fallback to room dimensions
      const w = ((room.lengthMm ?? 4000) / 1000) * (transform.scale * 50);
      const d = ((room.widthMm ?? 3000) / 1000) * (transform.scale * 50);
      return { cx: 0, cz: 0, width: w, depth: d };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const w of wallsForRoom) {
      const [sx, sz] = toWorld(w.startX, w.startY, transform);
      const [ex, ez] = toWorld(w.endX, w.endY, transform);
      minX = Math.min(minX, sx, ex);
      maxX = Math.max(maxX, sx, ex);
      minY = Math.min(minY, sz, ez);
      maxY = Math.max(maxY, sz, ez);
    }

    return {
      cx: (minX + maxX) / 2,
      cz: (minY + maxY) / 2,
      width: maxX - minX,
      depth: maxY - minY,
    };
  }, [wallsForRoom, room, transform]);

  const floorColor = useMemo(() => {
    switch (room.type) {
      case 'kitchen': return '#f5e6d0';
      case 'bathroom': case 'wash_area': return '#e0e8f0';
      case 'bedroom': return '#f0e8e0';
      case 'living_room': case 'living': case 'drawing_room': return '#ebe6de';
      case 'balcony': case 'terrace': return '#d8e8d0';
      default: return '#ede9e3';
    }
  }, [room.type]);

  return (
    <group>
      {/* Floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bounds.cx, 0.005, bounds.cz]}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(room.id); }}
      >
        <planeGeometry args={[Math.max(bounds.width, 0.5), Math.max(bounds.depth, 0.5)]} />
        <meshStandardMaterial
          color={isCurrent ? '#dbeafe' : floorColor}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Room label */}
      <Text
        position={[bounds.cx, 0.02, bounds.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(bounds.width, bounds.depth) * 0.12}
        color={isCurrent ? '#1d4ed8' : '#8B8378'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {room.name}
      </Text>

      {/* Room type sub-label */}
      <Text
        position={[bounds.cx, 0.02, bounds.cz + Math.min(bounds.width, bounds.depth) * 0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(bounds.width, bounds.depth) * 0.07}
        color="#a09890"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {room.type.replace(/_/g, ' ')}
      </Text>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Fallback room (no wall segments - use dimensions)                  */
/* ------------------------------------------------------------------ */

interface FallbackRoomProps {
  room: RoomData;
  index: number;
  totalRooms: number;
  isCurrent: boolean;
  onClick: (id: string) => void;
}

function FallbackRoom({ room, index, totalRooms, isCurrent, onClick }: FallbackRoomProps) {
  const width = (room.lengthMm ?? 4000) / 1000;
  const depth = (room.widthMm ?? 3000) / 1000;
  const height = (room.heightMm ?? 2700) / 1000;

  // Layout rooms in a row with gaps
  const cols = Math.ceil(Math.sqrt(totalRooms));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gap = 1.0;
  const posX = col * (width + gap);
  const posZ = row * (depth + gap);

  const wallThickness = 0.15;

  const floorColor = useMemo(() => {
    switch (room.type) {
      case 'kitchen': return '#f5e6d0';
      case 'bathroom': case 'wash_area': return '#e0e8f0';
      case 'bedroom': return '#f0e8e0';
      case 'living_room': case 'living': case 'drawing_room': return '#ebe6de';
      case 'balcony': case 'terrace': return '#d8e8d0';
      default: return '#ede9e3';
    }
  }, [room.type]);

  return (
    <group position={[posX, 0, posZ]}>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(room.id); }}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={isCurrent ? '#dbeafe' : floorColor}
          roughness={0.7}
        />
      </mesh>

      {/* 4 Walls */}
      {/* Front wall (negative Z) */}
      <mesh position={[0, height / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color="#f0ece6" roughness={0.85} />
      </mesh>
      {/* Back wall (positive Z) */}
      <mesh position={[0, height / 2, depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color="#f0ece6" roughness={0.85} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial color="#e8e4de" roughness={0.85} />
      </mesh>
      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial color="#e8e4de" roughness={0.85} />
      </mesh>

      {/* Wall edges */}
      {[
        [0, height / 2, -depth / 2, width, height, wallThickness],
        [0, height / 2, depth / 2, width, height, wallThickness],
        [-width / 2, height / 2, 0, wallThickness, height, depth],
        [width / 2, height / 2, 0, wallThickness, height, depth],
      ].map(([px, py, pz, w, h, d], i) => (
        <lineSegments key={i} position={[px as number, py as number, pz as number]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w as number, h as number, d as number)]} />
          <lineBasicMaterial color={isCurrent ? '#3b82f6' : '#b0a898'} />
        </lineSegments>
      ))}

      {/* Room label */}
      <Text
        position={[0, height + 0.2, 0]}
        fontSize={0.25}
        color={isCurrent ? '#1d4ed8' : '#64748b'}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {room.name}
      </Text>

      <Text
        position={[0, height + 0.02, 0]}
        fontSize={0.14}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {(width).toFixed(1)}m x {(depth).toFixed(1)}m
      </Text>

      {/* Default furniture based on room type */}
      <FallbackFurniture roomType={room.type} width={width} depth={depth} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Furniture from space plans                                         */
/* ------------------------------------------------------------------ */

interface SpacePlanFurnitureProps {
  placements: FurniturePlacement[];
  roomBounds: { cx: number; cz: number; width: number; depth: number };
  transform: { offsetX: number; offsetZ: number; scale: number };
}

function SpacePlanFurniture({ placements, roomBounds, transform }: SpacePlanFurnitureProps) {
  return (
    <>
      {placements.map((item, i) => {
        // Furniture placement coordinates are relative to the room
        const fw = ((item.width ?? 600) / 1000) * transform.scale * 50;
        const fd = ((item.height ?? 400) / 1000) * transform.scale * 50;
        const fh = Math.min(fw, fd) * 0.8; // reasonable height

        const fx = roomBounds.cx + ((item.x ?? 0) / 1000) * transform.scale * 50 - roomBounds.width / 2;
        const fz = roomBounds.cz + ((item.y ?? 0) / 1000) * transform.scale * 50 - roomBounds.depth / 2;

        return (
          <group key={i} position={[fx, fh / 2, fz]} rotation={[0, ((item.rotation ?? 0) * Math.PI) / 180, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[Math.max(fw, 0.1), Math.max(fh, 0.1), Math.max(fd, 0.1)]} />
              <meshStandardMaterial
                color={item.color ?? '#A0896C'}
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>
            <Text
              position={[0, fh / 2 + 0.08, 0]}
              fontSize={0.08}
              color="#6b5b4b"
              anchorX="center"
              anchorY="bottom"
              font={undefined}
            >
              {item.name ?? `Item ${i + 1}`}
            </Text>
          </group>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Fallback furniture (when no space plan exists)                      */
/* ------------------------------------------------------------------ */

function FallbackFurniture({ roomType, width, depth }: { roomType: string; width: number; depth: number }) {
  const items = useMemo(() => {
    const w = width * 0.35;
    const d = depth * 0.35;
    switch (roomType) {
      case 'living_room': case 'living': case 'drawing_room':
        return [
          { pos: [0, 0.22, -depth * 0.25] as const, size: [w * 1.8, 0.45, d * 0.5] as const, color: '#8B7355', name: 'Sofa' },
          { pos: [0, 0.12, depth * 0.1] as const, size: [w * 0.8, 0.24, d * 0.4] as const, color: '#D2B48C', name: 'Coffee Table' },
        ];
      case 'bedroom':
        return [
          { pos: [0, 0.18, 0] as const, size: [w * 1.4, 0.36, d * 1.5] as const, color: '#DEB887', name: 'Bed' },
          { pos: [-width * 0.35, 0.15, 0] as const, size: [w * 0.4, 0.3, d * 0.3] as const, color: '#D2B48C', name: 'Nightstand' },
        ];
      case 'kitchen':
        return [
          { pos: [0, 0.3, -depth * 0.3] as const, size: [w * 1.5, 0.6, d * 0.35] as const, color: '#696969', name: 'Counter' },
          { pos: [0, 0.25, depth * 0.15] as const, size: [w * 0.8, 0.5, d * 0.4] as const, color: '#8B4513', name: 'Island' },
        ];
      case 'bathroom': case 'wash_area':
        return [
          { pos: [-width * 0.2, 0.2, -depth * 0.2] as const, size: [w * 1.2, 0.35, d * 0.4] as const, color: '#F5F5F5', name: 'Bathtub' },
          { pos: [width * 0.2, 0.25, depth * 0.2] as const, size: [w * 0.6, 0.5, d * 0.3] as const, color: '#DCDCDC', name: 'Vanity' },
        ];
      case 'dining_room':
        return [
          { pos: [0, 0.25, 0] as const, size: [w * 1.2, 0.5, d * 0.8] as const, color: '#8B4513', name: 'Dining Table' },
        ];
      case 'office':
        return [
          { pos: [0, 0.25, -depth * 0.2] as const, size: [w * 1.2, 0.5, d * 0.5] as const, color: '#4A4A4A', name: 'Desk' },
        ];
      default:
        return [];
    }
  }, [roomType, width, depth]);

  return (
    <>
      {items.map((item, i) => (
        <group key={i}>
          <mesh position={[item.pos[0], item.pos[1], item.pos[2]]} castShadow receiveShadow>
            <boxGeometry args={item.size} />
            <meshStandardMaterial color={item.color} roughness={0.6} metalness={0.1} />
          </mesh>
          <Text
            position={[item.pos[0], item.pos[1] + item.size[1] / 2 + 0.08, item.pos[2]]}
            fontSize={0.09}
            color="#6b5b4b"
            anchorX="center"
            anchorY="bottom"
            font={undefined}
          >
            {item.name}
          </Text>
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Waypoint marker with animation                                     */
/* ------------------------------------------------------------------ */

interface WaypointMarkerProps {
  waypoint: VRWaypoint;
  isActive: boolean;
  onClick: (id: string) => void;
}

function WaypointMarker({ waypoint, isActive, onClick }: WaypointMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.12 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[waypoint.position[0], 0, waypoint.position[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(waypoint.id); }}
      >
        <sphereGeometry args={[isActive ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? '#3b82f6' : '#f59e0b'}
          emissive={isActive ? '#3b82f6' : '#f59e0b'}
          emissiveIntensity={isActive ? 0.5 : 0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[isActive ? 0.18 : 0.12, isActive ? 0.25 : 0.16, 32]} />
        <meshBasicMaterial
          color={isActive ? '#3b82f6' : '#f59e0b'}
          transparent
          opacity={isActive ? 0.4 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Label */}
      {isActive && (
        <Text
          position={[0, 0.35, 0]}
          fontSize={0.1}
          color="#1d4ed8"
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {waypoint.name}
        </Text>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera controller - smoothly moves to active room/waypoint         */
/* ------------------------------------------------------------------ */

interface CameraControllerProps {
  target: [number, number, number];
}

function CameraController({ target }: CameraControllerProps) {
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(...target));

  useEffect(() => {
    targetVec.current.set(...target);
  }, [target]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Main VR Scene 3D component                                         */
/* ------------------------------------------------------------------ */

export interface VRScene3DProps {
  rooms: RoomData[];
  waypoints: VRWaypoint[];
  activeWaypointId: string | null;
  currentRoomId: string;
  onRoomChange: (id: string) => void;
  onTeleport: (id: string) => void;
  wallSegments?: WallSegmentData[];
  spacePlans?: SpacePlanData[];
}

export default function VRScene3D({
  rooms,
  waypoints,
  activeWaypointId,
  currentRoomId,
  onRoomChange,
  onTeleport,
  wallSegments = [],
  spacePlans = [],
}: VRScene3DProps) {
  const hasWalls = wallSegments.length > 0;
  const transform = useSceneTransform(wallSegments);

  // Group walls by room
  const wallsByRoom = useMemo(() => {
    const map = new Map<string, WallSegmentData[]>();
    for (const w of wallSegments) {
      const rid = w.roomId ?? '__unassigned__';
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(w);
    }
    return map;
  }, [wallSegments]);

  // Space plans by room
  const spacePlansByRoom = useMemo(() => {
    const map = new Map<string, FurniturePlacement[]>();
    for (const sp of spacePlans) {
      if (sp.furniturePlacements) {
        map.set(sp.roomId, sp.furniturePlacements);
      }
    }
    return map;
  }, [spacePlans]);

  // Room bounds (for waypoint positioning and camera)
  const roomBoundsMap = useMemo(() => {
    const map = new Map<string, { cx: number; cz: number; width: number; depth: number }>();

    if (hasWalls) {
      for (const room of rooms) {
        const walls = wallsByRoom.get(room.id) ?? [];
        if (walls.length > 0) {
          let minX = Infinity, maxX = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;
          for (const w of walls) {
            const [sx, sz] = toWorld(w.startX, w.startY, transform);
            const [ex, ez] = toWorld(w.endX, w.endY, transform);
            minX = Math.min(minX, sx, ex);
            maxX = Math.max(maxX, sx, ex);
            minZ = Math.min(minZ, sz, ez);
            maxZ = Math.max(maxZ, sz, ez);
          }
          map.set(room.id, {
            cx: (minX + maxX) / 2,
            cz: (minZ + maxZ) / 2,
            width: maxX - minX,
            depth: maxZ - minZ,
          });
        }
      }
    } else {
      // Fallback grid layout
      const cols = Math.ceil(Math.sqrt(rooms.length));
      rooms.forEach((room, index) => {
        const w = (room.lengthMm ?? 4000) / 1000;
        const d = (room.widthMm ?? 3000) / 1000;
        const gap = 1.0;
        const col = index % cols;
        const row = Math.floor(index / cols);
        map.set(room.id, {
          cx: col * (w + gap),
          cz: row * (d + gap),
          width: w,
          depth: d,
        });
      });
    }
    return map;
  }, [rooms, hasWalls, wallsByRoom, transform]);

  // Wall height per room
  const getWallHeight = (room: RoomData) => {
    const hMm = room.heightMm ?? 2700;
    if (hasWalls) return (hMm / 1000) * transform.scale * 50;
    return hMm / 1000;
  };

  // Camera target based on current room
  const cameraTarget = useMemo((): [number, number, number] => {
    const activeWp = waypoints.find(w => w.id === activeWaypointId);
    if (activeWp) return [activeWp.position[0], 1.4, activeWp.position[2]];

    const bounds = roomBoundsMap.get(currentRoomId);
    if (bounds) return [bounds.cx, 1.4, bounds.cz];
    return [0, 1.4, 0];
  }, [currentRoomId, activeWaypointId, waypoints, roomBoundsMap]);

  // Compute scene extents for camera
  const sceneExtent = useMemo(() => {
    let maxDist = 5;
    for (const b of roomBoundsMap.values()) {
      const dist = Math.sqrt(b.cx * b.cx + b.cz * b.cz) + Math.max(b.width, b.depth);
      maxDist = Math.max(maxDist, dist);
    }
    return maxDist;
  }, [roomBoundsMap]);

  return (
    <Canvas
      shadows
      camera={{
        position: [cameraTarget[0] + sceneExtent * 0.6, sceneExtent * 0.5, cameraTarget[2] + sceneExtent * 0.6],
        fov: 50,
        near: 0.1,
        far: sceneExtent * 5,
      }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[sceneExtent * 0.5, sceneExtent * 0.8, sceneExtent * 0.5]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={sceneExtent * 3}
        shadow-camera-left={-sceneExtent}
        shadow-camera-right={sceneExtent}
        shadow-camera-top={sceneExtent}
        shadow-camera-bottom={-sceneExtent}
      />
      <directionalLight
        position={[-sceneExtent * 0.4, sceneExtent * 0.4, -sceneExtent * 0.6]}
        intensity={0.3}
      />

      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[sceneExtent * 3, sceneExtent * 3]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.95} />
      </mesh>

      {hasWalls ? (
        <>
          {/* Render actual wall segments */}
          {wallSegments.map((wall) => (
            <Wall3D
              key={wall.id}
              wall={wall}
              transform={transform}
              wallHeight={getWallHeight(
                rooms.find(r => r.id === wall.roomId) ?? rooms[0] ?? { id: '', name: '', type: 'other' }
              )}
              isCurrent={wall.roomId === currentRoomId}
            />
          ))}

          {/* Render room floors with labels */}
          {rooms.map((room) => (
            <RoomFloor
              key={room.id}
              room={room}
              wallsForRoom={wallsByRoom.get(room.id) ?? []}
              transform={transform}
              isCurrent={room.id === currentRoomId}
              onClick={onRoomChange}
            />
          ))}

          {/* Render furniture from space plans */}
          {rooms.map((room) => {
            const placements = spacePlansByRoom.get(room.id);
            const bounds = roomBoundsMap.get(room.id);
            if (!placements || !bounds) return null;
            return (
              <SpacePlanFurniture
                key={`furniture-${room.id}`}
                placements={placements}
                roomBounds={bounds}
                transform={transform}
              />
            );
          })}

          {/* Fallback furniture for rooms without space plans */}
          {rooms.map((room) => {
            if (spacePlansByRoom.has(room.id)) return null;
            const bounds = roomBoundsMap.get(room.id);
            if (!bounds) return null;
            return (
              <group key={`fallback-furn-${room.id}`} position={[bounds.cx, 0, bounds.cz]}>
                <FallbackFurniture
                  roomType={room.type}
                  width={bounds.width}
                  depth={bounds.depth}
                />
              </group>
            );
          })}
        </>
      ) : (
        /* Fallback: render rooms from dimensions when no wall segments exist */
        rooms.map((room, index) => (
          <FallbackRoom
            key={room.id}
            room={room}
            index={index}
            totalRooms={rooms.length}
            isCurrent={room.id === currentRoomId}
            onClick={onRoomChange}
          />
        ))
      )}

      {/* Waypoints */}
      {waypoints.map((wp) => (
        <WaypointMarker
          key={wp.id}
          waypoint={wp}
          isActive={wp.id === activeWaypointId}
          onClick={onTeleport}
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
        maxDistance={sceneExtent * 3}
        target={cameraTarget}
      />
    </Canvas>
  );
}
