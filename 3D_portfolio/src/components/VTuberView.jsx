// src/components/VTuberView.jsx
// Scene-based VTuber companion pinned to the bottom-left viewport corner.
// Supports VRM0 and VRM1. Every frame the group is positioned at a camera-local
// offset and inherits the camera quaternion so it stays locked to the viewport.
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

// Full list of VRM humanoid bone names — used to build a raw→normalized
// remap table so embedded GLTF animations survive vrm.update()
const VRM_HUMAN_BONES = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftEye', 'rightEye', 'jaw',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
  'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
];

/**
 * Retarget an embedded GLTF AnimationClip from the VRM's raw skeleton onto
 * its NORMALIZED humanoid skeleton. Without this, vrm.update() overwrites
 * the mixer's output every frame (normalized→raw sync is the source of
 * truth), so animations silently do nothing.
 *
 * The remap rewrites every track whose target is a humanoid bone so that
 * three's PropertyBinding resolves to the normalized node instead.
 */
function retargetClipForVRM(clip, vrm) {
  const rawToNormalized = {};
  VRM_HUMAN_BONES.forEach((name) => {
    const raw  = vrm.humanoid.getRawBoneNode?.(name);
    const norm = vrm.humanoid.getNormalizedBoneNode?.(name);
    if (raw && norm && raw.name && norm.name) {
      rawToNormalized[raw.name] = norm.name;
    }
  });

  const newTracks = clip.tracks.map((track) => {
    const dot = track.name.indexOf('.');
    if (dot < 0) return track;
    const nodeName = track.name.slice(0, dot);
    const property = track.name.slice(dot + 1);
    const mapped   = rawToNormalized[nodeName];
    if (!mapped) return track;
    const clone = track.clone();
    clone.name  = `${mapped}.${property}`;
    return clone;
  });

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

// Camera-local offset: top-left of viewport
const CAM_OFFSET = new THREE.Vector3(-0.52, 0.05, -1.1);
const CAM_SCALE  = 0.22;
const FLOAT_AMP  = { x: 0.008, y: 0.012 };

// Reusable objects — never reallocated inside useFrame
const _worldPos  = new THREE.Vector3();
const _headPos   = new THREE.Vector3(); // for projecting head position to screen
const _mouseWS   = new THREE.Vector3();
const _euler     = new THREE.Euler();
const _qYaw      = new THREE.Quaternion();
const _UP        = new THREE.Vector3(0, 1, 0);
const PHONEMES   = ['aa', 'ih', 'ou', 'ee', 'oh'];
// VRM models are ~1.6 normalised units tall; head is ~90% up the body
const HEAD_NORM_Y = 1.45;

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
  const phonemeIdx      = useRef(0);
  const phonemeTimer    = useRef(0);
  const springResetRef  = useRef(-1); // -1 = no VRM yet; 0 = pending reset; 1 = done

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
        // VRM0 models face -Z by default; rotate them 180° so they face the
        // camera inside our group. No-op for VRM1.
        VRMUtils.rotateVRM0(vrm);
        // combineSkeletons is the recommended optimisation (removeUnnecessaryJoints deprecated)
        VRMUtils.combineSkeletons?.(vrm.scene);

        vrmRef.current = vrm;
        group.add(vrm.scene);
        onReady?.();   // signal to VTuberChat that the model is in the scene

        // ── Diagnostic dump: tells us exactly what the VRM contains ───────────
        console.group('[VTuber] VRM loaded');
        console.log('meta:', vrm.meta);
        console.log('gltf.animations:', gltf.animations);
        console.log('gltf.animations count:', gltf.animations?.length ?? 0);
        console.log('humanoid bone count:', Object.keys(vrm.humanoid?.humanBones ?? {}).length);
        console.log('expressions:', Object.keys(vrm.expressionManager?.expressionMap ?? {}));
        console.log('has springBoneManager:', !!vrm.springBoneManager);
        console.log('gltf.userData keys:', Object.keys(gltf.userData ?? {}));
        console.log('gltf.parser.json.animations (raw):', gltf.parser?.json?.animations);
        console.log('gltf.parser.json.extensions:', Object.keys(gltf.parser?.json?.extensions ?? {}));
        console.log('vrm (full object):', vrm);
        console.groupEnd();

        // Play any animations embedded in the VRM/GLTF file.
        // CRITICAL: tracks target the RAW skeleton by default, but vrm.update()
        // overwrites raw bones from the normalized humanoid every frame. We
        // must retarget each clip onto the normalized skeleton so the mixer's
        // output becomes the source of truth that vrm.update() then propagates.
        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => {
            const retargeted = retargetClipForVRM(clip, vrm);
            mixer.clipAction(retargeted).play();
          });
          mixerRef.current = mixer;
          console.info(`[VTuber] playing ${gltf.animations.length} embedded animation(s)`);
        } else {
          // Fallback idle arm pose — only used when the VRM has no animations.
          // With an animation playing, this would fight the mixer every frame.
          const h = vrm.humanoid;
          h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0, -1.2);
          h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0,  1.2);
          h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0, -0.2);
          h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0,  0.2);
          h.getNormalizedBoneNode('leftHand')     ?.rotation.set(0, 0, -0.1);
          h.getNormalizedBoneNode('rightHand')    ?.rotation.set(0, 0,  0.1);
        }

        // Mark reset as pending — useFrame fires it on the very first frame
        // where group.updateMatrixWorld() has already run (correct world pos).
        // Keeping default spring stiffness: the per-frame updateMatrixWorld()
        // call + this one-shot reset is enough to stop hair from exploding.
        springResetRef.current = 0;
      },
      undefined, // suppress per-chunk progress logs
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

    // CRITICAL: propagate position/rotation to matrixWorld NOW, before vrm.update.
    // Inside useFrame, Three.js hasn't yet run its render-loop matrix update, so
    // spring bones would read last frame's stale world matrices without this call.
    group.updateMatrixWorld();

    // ── 2b. Spring-bone reset — fires once on frame 1 after VRM loads ─────────
    if (vrm?.springBoneManager && springResetRef.current === 0) {
      vrm.springBoneManager.reset();
      springResetRef.current = 1;
    }

    // ── 2c. Project head position (not feet) so bubble tracks the head ───────
    if (screenPosRef) {
      // _worldPos holds the feet/root world pos; offset up by scaled head height
      _headPos.copy(group.position).addScaledVector(_UP, CAM_SCALE * HEAD_NORM_Y);
      _headPos.project(camera);
      screenPosRef.current = {
        x: (_headPos.x + 1) / 2 * window.innerWidth,
        y: (1 - _headPos.y) / 2 * window.innerHeight,
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
