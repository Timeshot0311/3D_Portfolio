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
// GLB nodes may be Object3D groups, not Mesh — so we search by name only,
// never filtering by isMesh. Box3.setFromObject works on any Object3D.
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN_MAP = {
  "large monitor screen": "fakeOS",
  "small monitor screen": "github",
};

// Find any Object3D by name — exact first, then case-insensitive.
// Does NOT check isMesh so it works on group nodes too.
function findScreenNode(root, name) {
  const exact = root.getObjectByName(name);
  if (exact) return exact;
  const lower = name.toLowerCase();
  let found = null;
  root.traverse((obj) => {
    if (!found && obj.name.toLowerCase() === lower) found = obj;
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
      const node = findScreenNode(cloned, name);
      if (!node) {
        // Log all node names to help debug typos / renamed nodes
        const allNames = [];
        cloned.traverse((o) => { if (o.name) allNames.push(o.name); });
        console.warn(`RoomScene: node "${name}" not found. Available names:`, allNames);
        return;
      }

      // Hide the geometry — Html overlay replaces it visually
      node.visible = false;
      node.updateWorldMatrix(true, true);

      // Works on any Object3D (group or mesh)
      const bbox = new THREE.Box3().setFromObject(node);
      if (bbox.isEmpty()) {
        console.warn(`RoomScene: node "${name}" has an empty bounding box`);
        return;
      }

      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = bbox.getSize(new THREE.Vector3());

      const quat = new THREE.Quaternion();
      node.matrixWorld.decompose(new THREE.Vector3(), quat, new THREE.Vector3());
      const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");

      const cssW       = 512;
      const cssH       = Math.round((size.y / Math.max(size.x, 0.001)) * cssW);
      const pixelScale = size.x / cssW;

      result.push({ id: node.uuid, type, center, euler, cssW, cssH, pixelScale });
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
