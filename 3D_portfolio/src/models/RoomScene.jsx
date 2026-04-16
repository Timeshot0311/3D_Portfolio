import { useState, useMemo, useRef } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import GitHubStats from "../components/GitHubStats";

// ─────────────────────────────────────────────────────────────────────────────
// Screen node names as they appear in timeshot-original-version.glb
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN_MAP = {
  "wall tv":   "fakeOS",
  "monitor":   "github",
};

// ─────────────────────────────────────────────────────────────────────────────
// Manual screen dimensions (world units).
// The anchor nodes are paper-thin, so we override their bbox size.
// Tune these until the Html overlay fills the physical monitor frame.
// Use Free Camera + tracker to get close, then adjust until it looks right.
// ─────────────────────────────────────────────────────────────────────────────
// Effective width the Html overlay will appear in the scene.
// drei's Html transform normalises internally by ~canvas_height/2, so this
// value ends up being ~7–8× smaller on screen than raw Three.js world units.
// Tune until content fills the physical monitor frame when at the preset view.
const SCREEN_W = {
  fakeOS: 1190,   // large monitor — 70× previous value; dial back if too large
  github:  840,   // small monitor
};
const SCREEN_ASPECT = {
  fakeOS: 16 / 9,
  github: 4 / 3,
};

// CSS pixel resolution — higher = crisper text (heavier GPU cost)
const CSS_W = 768;

// Find any Object3D by name — exact first, then case-insensitive
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

// Reusable objects — never reallocated inside useFrame
const _pos  = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _bbox = new THREE.Box3();

export default function RoomScene() {
  const { scene } = useGLTF("/models/timeshot-original-version.glb");
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
        console.warn(`[RoomScene] "${name}" not found. Available:`, allNames);
        return;
      }

      // ── Get position + rotation BEFORE hiding (visibility may affect bbox) ──
      node.updateWorldMatrix(true, true);

      // World position: use bbox center so it lands on the screen face, not origin
      _bbox.setFromObject(node);      // node is still visible here
      if (_bbox.isEmpty()) {
        // Fallback: use node world position directly
        node.getWorldPosition(_pos);
      } else {
        _bbox.getCenter(_pos);
      }
      const center = _pos.clone();

      // World rotation
      node.getWorldQuaternion(_quat);
      const euler = new THREE.Euler().setFromQuaternion(_quat.clone(), "YXZ");

      // Log raw bbox for calibration reference
      const rawSize = _bbox.getSize(new THREE.Vector3());
      console.info(`[RoomScene] "${name}" (${type}) — raw bbox:`, {
        w: rawSize.x.toFixed(4), h: rawSize.y.toFixed(4), d: rawSize.z.toFixed(4),
        center: center.toArray().map(v => v.toFixed(3)),
      });

      // ── NOW hide the geometry — Html overlay replaces it visually ──
      node.visible = false;

      // ── Compute Html layout from manual size overrides ──
      const worldW = SCREEN_W[type] ?? 1.0;
      const aspect = SCREEN_ASPECT[type] ?? (16 / 9);
      const cssW   = CSS_W;
      const cssH   = Math.round(cssW / aspect);
      const pixelScale = worldW / cssW;

      result.push({ id: node.uuid, type, center, euler, cssW, cssH, pixelScale });
    });

    if (result.length > 0) {
      computed.current = true;
      setScreenData(result);
      window.__screenCenters = Object.fromEntries(
        result.map(({ type, center }) => [type, center.toArray()]),
      );
      console.info("[RoomScene] screen centers:", window.__screenCenters);
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

useGLTF.preload("/models/timeshot-original-version.glb");
