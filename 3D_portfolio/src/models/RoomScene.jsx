import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Import our programmed screen apps
import FakeOSDesktop from "../components/FakeOSDesktop";
import EmulatorV86 from "../components/EmulatorV86";


// Map Blender object names → what content they should show
const SCREEN_MAP = {
  "large monitor screen": { type: "route" },   // show Emulator + FakeOS page
  "small monitor screen": { type: "fakeOS" },  // inline FakeOS windowed UI
};

function MaterialForPlan({ plan }) {
  return (
    <meshBasicMaterial toneMapped={false}>
      {/* renderTexture turns React into a texture */}
      {/* @ts-ignore */}
      <renderTexture attach="map">
        {plan.type === "fakeOS" && <FakeOSDesktop />}
        {plan.type === "route" && (
          <div style={{ width: "100%", height: "100%", background: "black" }}>
            <EmulatorV86 />
          </div>
        )}
      </renderTexture>
    </meshBasicMaterial>
  );
}

export default function RoomScene() {
  const { scene, nodes } = useGLTF("/models/timeshot-room2.glb");

  // Clone scene so we can override materials
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useMemo(() => {
    Object.entries(SCREEN_MAP).forEach(([name, plan]) => {
      const mesh = cloned.getObjectByName(name);
      if (mesh && mesh.isMesh) {
        mesh.material = new THREE.MeshBasicMaterial({ color: "black" });
        mesh.material = <MaterialForPlan plan={plan} />;
      }
    });
  }, [cloned]);

  return <primitive object={cloned} />;
}

useGLTF.preload("/models/timeshot-room2.glb");
