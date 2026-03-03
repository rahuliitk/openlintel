'use client';

/**
 * EditorViewport — all Three.js / @react-three/fiber rendering lives here.
 *
 * This file is intentionally imported only via next/dynamic({ ssr: false })
 * so that @react-three/fiber (which patches React internals incompatible with
 * React 19 at module-load time) is never evaluated on the server.
 */

import Link from 'next/link';
import { Button } from '@openlintel/ui';
import { Box } from 'lucide-react';

import { Scene } from '@/components/editor-3d/scene';
import { RoomGeometry } from '@/components/editor-3d/room-geometry';
import { FurnitureObject } from '@/components/editor-3d/furniture-object';
import { CameraControls } from '@/components/editor-3d/camera-controls';
import { SnapGrid } from '@/components/editor-3d/snap-grid';
import { CollabCursors } from '@/components/editor-3d/collab-cursors';
import type { EditorTool, ViewPreset } from '@/components/editor-3d/toolbar';
import type { LightingConfig } from '@/components/editor-3d/lighting-panel';
import type { PlacedFurniture } from '@/lib/gltf-loader';
import type { GridSizeValue } from '@/lib/snap-engine';
import type { Socket } from 'socket.io-client';

export interface EditorViewportProps {
  projectId: string;
  hasRooms: boolean;
  roomDimensions: { lengthMm: number; widthMm: number; heightMm: number };
  furniture: PlacedFurniture[];
  selectedObjectId: string | null;
  activeTool: EditorTool;
  viewPreset: ViewPreset;
  gridSize: GridSizeValue;
  snapEnabled: boolean;
  showGrid: boolean;
  showCeiling: boolean;
  lightingConfig: LightingConfig;
  collabSocket: Socket | null;
  currentUserId: string;
  onSelectObject: (id: string | null) => void;
  onMoveFurniture: (id: string, position: [number, number, number]) => void;
  onRotateFurniture: (id: string, rotation: [number, number, number]) => void;
  onScaleFurniture: (id: string, scale: [number, number, number]) => void;
}

export default function EditorViewport({
  projectId,
  hasRooms,
  roomDimensions,
  furniture,
  selectedObjectId,
  activeTool,
  viewPreset,
  gridSize,
  snapEnabled,
  showGrid,
  showCeiling,
  lightingConfig,
  collabSocket,
  currentUserId,
  onSelectObject,
  onMoveFurniture,
  onRotateFurniture,
  onScaleFurniture,
}: EditorViewportProps) {
  const roomLengthM = roomDimensions.lengthMm / 1000;
  const roomWidthM = roomDimensions.widthMm / 1000;
  const roomHeightM = roomDimensions.heightMm / 1000;

  if (!hasRooms) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Box className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium">No rooms in this project</p>
          <p className="text-xs text-muted-foreground">
            Add rooms to your project to start the 3D editor.
          </p>
          <Link href={`/project/${projectId}`}>
            <Button size="sm" className="mt-4">
              Go to Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Scene showStats={false} environmentPreset="apartment">
      <CameraControls
        viewPreset={viewPreset}
        roomLengthM={roomLengthM}
        roomWidthM={roomWidthM}
        roomHeightM={roomHeightM}
      />
      <RoomGeometry
        dimensions={roomDimensions}
        showCeiling={showCeiling}
        showGrid={showGrid}
      />
      <SnapGrid
        roomLengthM={roomLengthM}
        roomWidthM={roomWidthM}
        gridSize={gridSize}
        visible={showGrid && snapEnabled}
      />

      {/* Dynamic lighting from config */}
      <ambientLight
        color={lightingConfig.ambientColor}
        intensity={lightingConfig.ambientIntensity}
      />
      <directionalLight
        color={lightingConfig.directionalColor}
        intensity={lightingConfig.directionalIntensity}
        position={lightingConfig.directionalPosition}
        castShadow
      />

      {/* Furniture objects */}
      {furniture.map((item) => (
        <FurnitureObject
          key={item.id}
          item={item}
          isSelected={selectedObjectId === item.id}
          activeTool={activeTool === 'measure' ? 'select' : activeTool}
          gridSize={gridSize}
          snapEnabled={snapEnabled}
          roomLengthM={roomLengthM}
          roomWidthM={roomWidthM}
          onSelect={onSelectObject}
          onMove={onMoveFurniture}
          onRotate={onRotateFurniture}
          onScale={onScaleFurniture}
        />
      ))}

      {/* Collaborative cursors from other users */}
      <CollabCursors
        socket={collabSocket}
        currentUserId={currentUserId}
      />

      {/* Deselect when clicking on empty space */}
      <mesh
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => onSelectObject(null)}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </Scene>
  );
}
