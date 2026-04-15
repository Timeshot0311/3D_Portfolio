// src/components/VTuberView.jsx
// Scene-based VTuber companion pinned to the bottom-left viewport corner.
//
// Strategy: the group lives in R3F's scene graph (<primitive> return).
// Every frame we compute the world-space position of the camera-local offset
// and copy the camera's quaternion so the group stays locked to the viewport.
//
// VRM0 faces +Z in its local space (no rotateVRM0). When the group quaternion
// matches the camera's quaternion, local +Z = camera local +Z = the direction
// BEHIND the camera in world space — which is exactly toward the viewer. ✓
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

// Camera-local offset: left (-X), down (-Y), forward (-Z)
const CAM_OFFSET = new THREE.Vector3(-0.52, -0.44, -1.1);
const CAM_SCALE  = 0.21;
const FLOAT_AMP  = { x: 0.008, y: 0.012 };

// Reusable objects — never reallocated inside useFrame
const _worldPos  = new THREE.Vector3();
const _mouseWS   = new THREE.Vector3();
const PHONEMES   = ['aa', 'ih', 'ou', 'ee', 'oh'];

export default function VTuberView({ isSpeaking = false }) {
  const groupRef = useRef(new THREE.Group());
  const vrmRef   = useRef(null);
  const mixerRef = useRef(null);

  const mouseRef     = useRef(new THREE.Vector2(0, 0));
  const floatOffset  = useRef(new THREE.Vector2(0, 0));
  const floatTarget  = useRef(new THREE.Vector2(0, 0));
  const floatTimer   = useRef(2.0);
  const blinkTimer   = useRef(THREE.MathUtils.randFloat(2, 5));
  const blinkPhase   = useRef(0);
  const blinkVal     = useRef(0);
  const phonemeIdx   = useRef(0);
  const phonemeTimer = useRef(0);

  // Keep isSpeaking in a ref so useFrame sees latest value without re-mount
  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const { camera } = useThree();

  // Mouse tracking
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

  // Load VRM
  useEffect(() => {
    const group = groupRef.current;
    group.scale.setScalar(CAM_SCALE);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/VTuber2.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        VRMUtils.combineSkeletons?.(vrm.scene);

        // rotateVRM0 rotates the model 180° on Y so it faces +Z (toward viewer).
        // VRM0 models naturally face -Z; without this the character faces away.
        // In camera-relative mode (+Z = toward viewer) this is exactly what we need.
        VRMUtils.rotateVRM0?.(vrm);

        vrmRef.current = vrm;
        group.add(vrm.scene);

        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
        }

        // Idle arm pose
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    const group = groupRef.current;
    const vrm   = vrmRef.current;

    // ── 1. Gentle float ────────────────────────────────────────────────────
    floatTimer.current -= delta;
    if (floatTimer.current <= 0) {
      floatTarget.current.set(
        THREE.MathUtils.randFloatSpread(FLOAT_AMP.x * 2),
        THREE.MathUtils.randFloatSpread(FLOAT_AMP.y * 2),
      );
      floatTimer.current = THREE.MathUtils.randFloat(1.5, 3.0);
    }
    floatOffset.current.lerp(floatTarget.current, delta * 1.2);

    // ── 2. Pin to camera-local offset ──────────────────────────────────────
    _worldPos
      .set(
        CAM_OFFSET.x + floatOffset.current.x,
        CAM_OFFSET.y + floatOffset.current.y,
        CAM_OFFSET.z,
      )
      .applyMatrix4(camera.matrixWorld);

    group.position.copy(_worldPos);
    group.quaternion.copy(camera.quaternion);

    // ── 3. Head look-at mouse ──────────────────────────────────────────────
    if (vrm?.lookAt) {
      _mouseWS.set(mouseRef.current.x, mouseRef.current.y, 0.5).unproject(camera);
      vrm.lookAt.lookAt(_mouseWS);
    }

    // ── 4. Blink ───────────────────────────────────────────────────────────
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
      const bv = blinkVal.current;
      if (vrm.expressionManager.getValue?.('blink') !== undefined) {
        vrm.expressionManager.setValue('blink', bv);
      } else {
        vrm.expressionManager.setValue?.('blinkLeft',  bv);
        vrm.expressionManager.setValue?.('blinkRight', bv);
      }

      // ── 5. Lip sync while speaking ────────────────────────────────────────
      if (isSpeakingRef.current) {
        phonemeTimer.current -= delta;
        if (phonemeTimer.current <= 0) {
          PHONEMES.forEach((p) => vrm.expressionManager.setValue?.(p, 0));
          phonemeIdx.current = (phonemeIdx.current + 1) % PHONEMES.length;
          vrm.expressionManager.setValue?.(PHONEMES[phonemeIdx.current], 0.75);
          phonemeTimer.current = THREE.MathUtils.randFloat(0.06, 0.14);
        }
      } else {
        PHONEMES.forEach((p) => vrm.expressionManager.setValue?.(p, 0));
        phonemeTimer.current = 0;
      }
    }

    // ── 6. Idle breathing ──────────────────────────────────────────────────
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

    if (vrm) vrm.update(delta);
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  // Scene-based — R3F manages this group in the scene graph.
  return <primitive object={groupRef.current} />;
}
