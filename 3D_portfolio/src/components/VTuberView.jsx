// src/components/VTuberView.jsx
// Scene-based VTuber companion pinned to the bottom-left viewport corner.
// Supports VRM0 and VRM1. Every frame the group is positioned at a camera-local
// offset and inherits the camera quaternion so it stays locked to the viewport.
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';

/**
 * Animation manifest — map emote name → public URL of a .vrma file.
 * Any file that 404s or fails to parse is skipped silently so the
 * VTuber still works if you haven't added all clips yet. Drop the
 * files in `public/animations/`. `idle` is the default loop.
 */
const VRMA_MANIFEST = {
  idle:  '/animations/idle.vrma',
  wave:  '/animations/wave.vrma',
  peace: '/animations/peace.vrma',
  bow:   '/animations/bow.vrma',
  dance: '/animations/dance.vrma',
  nod:   '/animations/nod.vrma',
  shake: '/animations/shake.vrma',
};
const DEFAULT_EMOTE = 'idle';
// How long to spend crossfading between emotes (seconds)
const EMOTE_FADE = 0.3;

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

export default function VTuberView({ isSpeaking = false, onReady, screenPosRef, emoteRef }) {
  const groupRef   = useRef(new THREE.Group());
  const vrmRef     = useRef(null);
  const mixerRef   = useRef(null);
  const actionsRef = useRef({});          // { name: AnimationAction } keyed by manifest key
  const currentEmoteRef = useRef(null);   // currently-playing action name

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
    // Allows the same loader instance to also parse .vrma files below
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    loader.load(
      '/models/VTuber3.vrm',
      async (gltf) => {
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
        springResetRef.current = 0; // schedule spring reset on next frame

        // ── Load every VRMA in the manifest in parallel ──────────────────────
        // Files that 404 or fail to parse are skipped silently — she still
        // works with whatever clips successfully load.
        const mixer = new THREE.AnimationMixer(vrm.scene);
        mixerRef.current = mixer;

        const entries = await Promise.all(
          Object.entries(VRMA_MANIFEST).map(async ([name, url]) => {
            try {
              const g = await loader.loadAsync(url);
              const vrmAnim = g.userData.vrmAnimations?.[0];
              if (!vrmAnim) return null;
              // createVRMAnimationClip binds tracks to the normalized humanoid
              // so vrm.update() propagates them out to raw bones correctly.
              const clip = createVRMAnimationClip(vrmAnim, vrm);
              const action = mixer.clipAction(clip);
              action.setEffectiveWeight(0);      // start silent; playEmote fades in
              action.play();
              return [name, action];
            } catch {
              return null;
            }
          }),
        );

        entries.filter(Boolean).forEach(([name, action]) => {
          actionsRef.current[name] = action;
        });

        const loaded = Object.keys(actionsRef.current);
        console.info(`[VTuber] loaded ${loaded.length}/${Object.keys(VRMA_MANIFEST).length} animations:`, loaded);

        // Start the idle loop (or any first available clip)
        const startName = actionsRef.current[DEFAULT_EMOTE] ? DEFAULT_EMOTE : loaded[0];
        if (startName) {
          actionsRef.current[startName].setEffectiveWeight(1);
          currentEmoteRef.current = startName;
        }
      },
      undefined, // suppress per-chunk progress logs
      (err) => console.error('[VTuber] load failed:', err?.message ?? err),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose emote API to parent — playEmote crossfades between clips and
  // auto-returns to the idle loop when a one-shot finishes.
  useEffect(() => {
    if (!emoteRef) return;
    emoteRef.current = {
      list: () => Object.keys(actionsRef.current),
      play: (name) => {
        const actions = actionsRef.current;
        const next = actions[name];
        if (!next) return false;
        const currentName = currentEmoteRef.current;
        const current = currentName ? actions[currentName] : null;
        if (current === next) return true;

        next.reset().setEffectiveWeight(1).fadeIn(EMOTE_FADE).play();
        if (current) current.fadeOut(EMOTE_FADE);
        currentEmoteRef.current = name;

        // If this emote isn't the idle loop, return to idle when it ends
        if (name !== DEFAULT_EMOTE && actions[DEFAULT_EMOTE]) {
          const mixer = mixerRef.current;
          const onFinished = (e) => {
            if (e.action !== next) return;
            mixer.removeEventListener('finished', onFinished);
            actions[DEFAULT_EMOTE].reset().setEffectiveWeight(1).fadeIn(EMOTE_FADE).play();
            next.fadeOut(EMOTE_FADE);
            currentEmoteRef.current = DEFAULT_EMOTE;
          };
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = true;
          mixer?.addEventListener('finished', onFinished);
        }
        return true;
      },
    };
  }, [emoteRef]);

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

    // ── 6. Idle breathing — fallback pose, only if no VRMA clips loaded ───
    // If any emote action exists, the mixer is driving bones and this would
    // fight it. Without actions, give her a gentle idle pose.
    if (vrm?.humanoid && Object.keys(actionsRef.current).length === 0) {
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
