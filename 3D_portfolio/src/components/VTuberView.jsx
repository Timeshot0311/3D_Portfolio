import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA-SPACE VTuber
// Attached directly to the camera so she's always pinned to the bottom-left
// corner of the viewport, regardless of where the player looks or moves.
//
// Position is in camera local space:
//   -X = left,  -Y = bottom,  -Z = in front of camera (toward viewer)
//
// She faces +Z in local space = faces toward the viewer (no rotateVRM0 flip).
// ─────────────────────────────────────────────────────────────────────────────
const CAM_POS   = new THREE.Vector3(-0.5, -0.42, -1.1);
const CAM_SCALE = 0.21;

// Gentle float offsets (camera-local)
const FLOAT_AMP = { x: 0.008, y: 0.012 };

export default function VTuberView() {
  const groupRef  = useRef(new THREE.Group());
  const vrmRef    = useRef(null);
  const mixerRef  = useRef(null);

  const mouseRef  = useRef(new THREE.Vector2(0, 0));

  const floatOffset = useRef(new THREE.Vector2(0, 0));
  const floatTarget = useRef(new THREE.Vector2(0, 0));
  const floatTimer  = useRef(2.0);

  const blinkTimer  = useRef(THREE.MathUtils.randFloat(2, 5));
  const blinkPhase  = useRef(0);
  const blinkVal    = useRef(0);

  const _mouseWS = useRef(new THREE.Vector3());

  const { camera } = useThree();

  // ── Mouse tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.set(
        (e.clientX / window.innerWidth)  *  2 - 1,
       -(e.clientY / window.innerHeight) *  2 + 1,
      );
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── VRM load — attach to camera ────────────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current;
    group.scale.setScalar(CAM_SCALE);
    group.position.copy(CAM_POS);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/VTuber2.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;

        // combineSkeletons replaces deprecated removeUnnecessaryJoints
        VRMUtils.combineSkeletons?.(vrm.scene);

        // VRM0 faces +Z by default — that's toward the viewer in camera space.
        // Do NOT call rotateVRM0 here; it would flip her away from the viewer.
        if (vrm.meta?.metaVersion !== '0') {
          // VRM1: no flip needed either — already faces -Z world, but in cam
          // space we want +Z. Set rotation explicitly.
          vrm.scene.rotation.y = 0;
        }

        vrmRef.current = vrm;

        group.add(vrm.scene);
        camera.add(group); // ← pinned to camera, not world scene

        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
        }

        // Rest pose
        const h = vrm.humanoid;
        h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2);
        h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2);
        h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
        h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
        h.getNormalizedBoneNode('leftHand')     ?.rotation.set(0, 0,  0.1);
        h.getNormalizedBoneNode('rightHand')    ?.rotation.set(0, 0, -0.1);
      },
      undefined,
      (err) => console.error('VTuber load failed:', err),
    );

    return () => {
      camera.remove(group);
    };
  }, [camera]);

  // ── Per-frame ──────────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const group = groupRef.current;
    const vrm   = vrmRef.current;

    // ── 1. GENTLE FLOAT in camera space ──────────────────────────────────
    floatTimer.current -= delta;
    if (floatTimer.current <= 0) {
      floatTarget.current.set(
        THREE.MathUtils.randFloatSpread(FLOAT_AMP.x * 2),
        THREE.MathUtils.randFloatSpread(FLOAT_AMP.y * 2),
      );
      floatTimer.current = THREE.MathUtils.randFloat(1.5, 3.0);
    }
    floatOffset.current.lerp(floatTarget.current, delta * 1.2);
    group.position.x = CAM_POS.x + floatOffset.current.x;
    group.position.y = CAM_POS.y + floatOffset.current.y;

    // ── 2. HEAD LOOK-AT MOUSE ─────────────────────────────────────────────
    if (vrm?.lookAt) {
      // Unproject mouse NDC into world space and hand to VRM lookAt
      _mouseWS.current.set(mouseRef.current.x, mouseRef.current.y, 0.5);
      _mouseWS.current.unproject(camera);
      vrm.lookAt.lookAt(_mouseWS.current);
    }

    // ── 3. BLINK ──────────────────────────────────────────────────────────
    if (vrm?.expressionManager) {
      blinkTimer.current -= delta;
      const DUR = 0.08;
      if (blinkPhase.current === 0 && blinkTimer.current <= 0) blinkPhase.current = 1;
      if (blinkPhase.current === 1) {
        blinkVal.current = Math.min(1, blinkVal.current + delta / DUR);
        if (blinkVal.current >= 1) blinkPhase.current = 2;
      } else if (blinkPhase.current === 2) {
        blinkVal.current = Math.max(0, blinkVal.current - delta / DUR);
        if (blinkVal.current <= 0) {
          blinkPhase.current = 0;
          blinkTimer.current = THREE.MathUtils.randFloat(2, 5);
        }
      }
      if (vrm.expressionManager.getValue?.('blink') !== undefined) {
        vrm.expressionManager.setValue('blink', blinkVal.current);
      } else {
        vrm.expressionManager.setValue?.('blinkLeft',  blinkVal.current);
        vrm.expressionManager.setValue?.('blinkRight', blinkVal.current);
      }
    }

    // ── 4. PROCEDURAL IDLE POSE ───────────────────────────────────────────
    if (vrm?.humanoid) {
      const t       = state.clock.elapsedTime;
      const breathe = Math.sin(t * 0.9) * 0.025;
      const h       = vrm.humanoid;
      h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2 + breathe * 0.3);
      h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2 - breathe * 0.3);
      h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
      h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
      h.getNormalizedBoneNode('chest')?.rotation.set(breathe, 0, 0);
      h.getNormalizedBoneNode('spine')?.rotation.set(breathe * 0.5, 0, 0);
    }

    // ── 5. VRM + MIXER UPDATE ─────────────────────────────────────────────
    if (vrm) vrm.update(delta);
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return <primitive object={groupRef.current} />;
}
