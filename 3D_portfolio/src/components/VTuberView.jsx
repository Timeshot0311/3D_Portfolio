// src/components/VTuberView.jsx
// Scene-based VTuber companion pinned to the bottom-left viewport corner.
// Supports VRM1 only. Every frame the group is positioned at a camera-local
// offset and inherits the camera quaternion so it stays locked to the viewport.
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

// Camera-local offset: top-left of viewport
const CAM_OFFSET = new THREE.Vector3(-0.52, 0.34, -1.1);
const CAM_SCALE  = 0.22;
const FLOAT_AMP  = { x: 0.008, y: 0.012 };

// Reusable objects — never reallocated inside useFrame
const _worldPos  = new THREE.Vector3();
const _mouseWS   = new THREE.Vector3();
const _euler     = new THREE.Euler();
const _qYaw      = new THREE.Quaternion();
const _UP        = new THREE.Vector3(0, 1, 0);
const PHONEMES   = ['aa', 'ih', 'ou', 'ee', 'oh'];

export default function VTuberView({ isSpeaking = false, onReady, screenPosRef }) {
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

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/VTuber3.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          console.error('[VTuber] File loaded but VRM data missing — not a valid VRM file?');
          return;
        }
        VRMUtils.combineSkeletons?.(vrm.scene);
        // Remove double-sided rendering — improves performance & fixes some skeleton artifacts
        VRMUtils.removeUnnecessaryVertices?.(vrm.scene);
        VRMUtils.removeUnnecessaryJoints?.(vrm.scene);

        vrmRef.current = vrm;
        group.add(vrm.scene);
        onReady?.();   // signal to VTuberChat that the model is in the scene

        // Play any animations embedded in the VRM/GLTF file
        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => {
            // Retarget clip bone tracks from GLTF names → VRM raw bone names
            const retargeted = THREE.AnimationClip.findByName(gltf.animations, clip.name) ?? clip;
            mixer.clipAction(retargeted).play();
          });
          mixerRef.current = mixer;
          console.info(`[VTuber] playing ${gltf.animations.length} embedded animation(s)`);
        }

        // Fallback idle arm pose used when no embedded animations exist
        if (!mixerRef.current) {
          const h = vrm.humanoid;
          h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0, -1.2);
          h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0,  1.2);
          h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0, -0.2);
          h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0,  0.2);
          h.getNormalizedBoneNode('leftHand')     ?.rotation.set(0, 0, -0.1);
          h.getNormalizedBoneNode('rightHand')    ?.rotation.set(0, 0,  0.1);
        }
      },
      (xhr) => console.info(`[VTuber] loading ${xhr.total > 0 ? Math.round(xhr.loaded / xhr.total * 100) + '%' : Math.round(xhr.loaded / 1024) + ' KB'}`),
      (err) => console.error('[VTuber] load failed:', err?.message ?? err),
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
    // Yaw-only rotation: strip pitch & roll so she stays world-upright
    _euler.setFromQuaternion(camera.quaternion, 'YXZ');
    _euler.x = 0;
    _euler.z = 0;
    _qYaw.setFromEuler(_euler);
    group.quaternion.copy(_qYaw);

    // ── 2b. Write screen position so bubble can follow (project after use) ──
    if (screenPosRef) {
      _worldPos.project(camera); // mutates _worldPos to NDC — safe, we're done with it
      screenPosRef.current = {
        x: (_worldPos.x + 1) / 2 * window.innerWidth,
        y: (1 - _worldPos.y) / 2 * window.innerHeight,
      };
    }

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

    // ── 6. Idle breathing — skip if AnimationMixer is driving bones ───────
    if (vrm?.humanoid && !mixerRef.current) {
      const t       = state.clock.elapsedTime;
      const breathe = Math.sin(t * 0.9) * 0.025;
      const h       = vrm.humanoid;
      h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0, -1.2 - breathe * 0.3);
      h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0,  1.2 + breathe * 0.3);
      h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0, -0.2);
      h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0,  0.2);
      h.getNormalizedBoneNode('chest')?.rotation.set(breathe, 0, 0);
      h.getNormalizedBoneNode('spine')?.rotation.set(breathe * 0.5, 0, 0);
    }

    // Advance AnimationMixer (if embedded animations exist) BEFORE vrm.update
    if (mixerRef.current) mixerRef.current.update(delta);
    if (vrm) vrm.update(delta);
  });

  // Scene-based — R3F manages this group in the scene graph.
  return <primitive object={groupRef.current} />;
}
