import { useState, useMemo, useRef } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import GitHubStats from "../components/GitHubStats";

// ─────────────────────────────────────────────────────────────────────────────
// Screen assignments — node names as they appear in timeshot-room2.glb
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN_MAP = {
  "large_monitor_screen": "fakeOS",
  "small_monitor_screen": "github",
};

// ─────────────────────────────────────────────────────────────────────────────
// Scale overrides (world-units wide) for each screen type.
// The anchor node bounding box is tiny (the mesh is paper-thin).
// These values set the actual rendered width; adjust until content fills frame.
// Run in dev, open console → "[RoomScene] screen info" shows raw bbox for ref.
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN_SCALE = {
  fakeOS: 0.38,   // large monitor — tweak until it fills the frame
  github: 0.22,   // small monitor
};

// Aspect ratios for each screen (width / height).
// Standard 16:9 is a good starting point; adjust if monitors are different.
const SCREEN_ASPECT = {
  fakeOS: 16 / 9,
  github: 4 / 3,
};

// CSS resolution (px) — higher = crisper text, but heavier
const CSS_W = 768;

// Find any Object3D by name — exact first, then case-insensitive.
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

  const [screenData, setScreenData] = useState([]);
  const computed = useRef(false);

  useFrame(() => {
    if (computed.current) return;

    const result = [];
    Object.entries(SCREEN_MAP).forEach(([name, type]) => {
      const node = findScreenNode(cloned, name);
      if (!node) {
        const allNames = [];
        cloned.traverse((o) => { if (o.name) allNames.push(o.name); });
        console.warn(`RoomScene: node "${name}" not found. Available:`, allNames);
        return;
      }

      node.visible = false;
      node.updateWorldMatrix(true, true);

      // Use bbox for CENTER and ROTATION only — not for size
      // (the anchor plane is paper-thin; true screen size comes from SCREEN_SCALE)
      const bbox = new THREE.Box3().setFromObject(node);
      if (bbox.isEmpty()) {
        console.warn(`RoomScene: node "${name}" has an empty bounding box`);
        return;
      }

      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const rawSize = bbox.getSize(new THREE.Vector3());

      // Orientation from the node's world matrix
      const quat = new THREE.Quaternion();
      node.matrixWorld.decompose(new THREE.Vector3(), quat, new THREE.Vector3());
      const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");

      // Use manual scale override — don't trust rawSize for layout
      const worldW  = SCREEN_SCALE[type] ?? 0.3;
      const worldH  = worldW / (SCREEN_ASPECT[type] ?? (16 / 9));
      const cssW    = CSS_W;
      const cssH    = Math.round(cssW / (SCREEN_ASPECT[type] ?? (16 / 9)));
      const pixelScale = worldW / cssW;

      console.info(`[RoomScene] "${name}" (${type}):`, {
        rawBboxW: rawSize.x.toFixed(4),
        rawBboxH: rawSize.y.toFixed(4),
        center:   center.toArray().map(v => v.toFixed(3)),
        worldW:   worldW.toFixed(3),
        pixelScale: pixelScale.toFixed(6),
      });

      result.push({ id: node.uuid, type, center, euler, cssW, cssH, pixelScale });
    });

    if (result.length > 0) {
      computed.current = true;
      setScreenData(result);
      window.__screenCenters = Object.fromEntries(
        result.map(({ type, center }) => [type, center.toArray()]),
      );
      console.info("[RoomScene] screen centers (world XYZ):", window.__screenCenters);
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
