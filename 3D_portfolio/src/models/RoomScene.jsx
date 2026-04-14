import { useState, useMemo, useRef } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import GitHubStats from "../components/GitHubStats";

// ─────────────────────────────────────────────────────────────────────────────
// Screen assignments
//   large monitor → full FakeOS project showcase
//   small monitor → GitHub stats
//
// Names must match node names in timeshot-room2.glb (case-insensitive fallback).
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN_MAP = {
  "large monitor screen": "fakeOS",
  "small monitor screen": "github",
};

// Case-insensitive mesh search with exact-name priority
function findMesh(root, name) {
  const exact = root.getObjectByName(name);
  if (exact?.isMesh) return exact;
  const lower = name.toLowerCase();
  let found = null;
  root.traverse((obj) => {
    if (!found && obj.isMesh && obj.name.toLowerCase() === lower) found = obj;
  });
  return found;
}

export default function RoomScene() {
  const { scene } = useGLTF("/models/timeshot-room2.glb");
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Screens are computed on the first useFrame tick so the primitive is
  // already in the scene graph and world matrices are fully up to date.
  const [screenData, setScreenData] = useState([]);
  const computed = useRef(false);

  useFrame(() => {
    if (computed.current) return;

    const result = [];
    Object.entries(SCREEN_MAP).forEach(([name, type]) => {
      const mesh = findMesh(cloned, name);
      if (!mesh) {
        console.warn(`RoomScene: mesh "${name}" not found in GLB`);
        return;
      }

      mesh.visible = false;
      mesh.updateWorldMatrix(true, false);

      const bbox = new THREE.Box3().setFromObject(mesh);
      if (bbox.isEmpty()) return;

      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = bbox.getSize(new THREE.Vector3());

      const quat = new THREE.Quaternion();
      mesh.matrixWorld.decompose(new THREE.Vector3(), quat, new THREE.Vector3());
      const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");

      const cssW       = 512;
      const cssH       = Math.round((size.y / Math.max(size.x, 0.001)) * cssW);
      const pixelScale = size.x / cssW;

      result.push({ id: mesh.uuid, type, center, euler, cssW, cssH, pixelScale });
    });

    if (result.length > 0) {
      computed.current = true;
      setScreenData(result);
    }
  });

  return (
    <>
      <primitive object={cloned} />
      {screenData.map(({ id, type, center, euler, cssW, cssH, pixelScale }) => (
        <Html
          key={id}
          transform
          position={center}
          rotation={euler}
          scale={pixelScale}
          style={{
            width:         cssW,
            height:        cssH,
            overflow:      "hidden",
            background:    "#000",
            pointerEvents: "auto",
            userSelect:    "none",
          }}
        >
          {type === "fakeOS" && <FakeOSDesktop />}
          {type === "github" && <GitHubStats />}
        </Html>
      ))}
    </>
  );
}

useGLTF.preload("/models/timeshot-room2.glb");
