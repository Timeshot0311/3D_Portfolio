import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

export default function VtuberView() {
  const groupRef   = useRef(new THREE.Group());
  const vrmRef     = useRef(null);
  const mixerRef   = useRef(null);

  // Mouse tracking (NDC -1..1)
  const mouseRef   = useRef(new THREE.Vector2(0, 0));

  // Smooth idle float
  const floatOffset = useRef(new THREE.Vector3());
  const floatTarget = useRef(new THREE.Vector3());
  const floatTimer  = useRef(2.0); // seconds until next drift target

  // Blinking state machine
  const blinkTimer  = useRef(THREE.MathUtils.randFloat(2, 5));
  const blinkPhase  = useRef(0); // 0=open, 1=closing, 2=opening
  const blinkVal    = useRef(0);

  // Reusable vectors (avoid per-frame GC)
  const _right   = useRef(new THREE.Vector3());
  const _up      = useRef(new THREE.Vector3());
  const _fwd     = useRef(new THREE.Vector3());
  const _target  = useRef(new THREE.Vector3());
  const _mouseWS = useRef(new THREE.Vector3());
  const _dir     = useRef(new THREE.Vector3());

  const { camera, scene } = useThree();

  // ── Mouse listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.set(
        (e.clientX / window.innerWidth)  *  2 - 1,
       -(e.clientY / window.innerHeight) *  2 + 1
      );
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── VRM load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/VTuber2.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;

        VRMUtils.removeUnnecessaryJoints?.(vrm.scene);

        // rotateVRM0 handles VRM0 → correct +Z facing; falls back gracefully on VRM1
        if (VRMUtils.rotateVRM0) {
          VRMUtils.rotateVRM0(vrm);
        } else {
          vrm.scene.rotation.y = Math.PI;
        }

        vrmRef.current = vrm;
        group.add(vrm.scene);
        scene.add(group);

        // FIX: animations live on gltf.animations, NOT vrm.animations
        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
        }

        // ── Procedural rest pose (fix T-pose when no animation file present) ──
        // VRM normalized bones default to T-pose (arms horizontal at 90°).
        // We rotate the upper arms down ~70° so they hang naturally.
        // These are set here as the initial state; useFrame fine-tunes them
        // each frame for breathing, so spring bones drape correctly.
        const h = vrm.humanoid;
        const applyRestPose = () => {
          h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2);
          h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2);
          h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
          h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
          h.getNormalizedBoneNode('leftHand')     ?.rotation.set(0, 0,  0.1);
          h.getNormalizedBoneNode('rightHand')    ?.rotation.set(0, 0, -0.1);
        };
        applyRestPose();
      },
      undefined,
      (err) => console.error('VTuber load failed:', err)
    );

    return () => {
      // Cleanup on unmount
      if (group.parent) scene.remove(group);
    };
  }, [scene]);

  // ── Per-frame update ──────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const group = groupRef.current;
    const vrm   = vrmRef.current;
    if (!group) return;

    // ── 1. POSITION: pin to left side of camera frustum ──────────────────
    //
    // Extract camera axes from its world matrix
    camera.matrix.extractBasis(
      _right.current,   // camera's +X
      _up.current,      // camera's +Y
      _fwd.current      // camera's +Z  (world-space, points BEHIND camera)
    );
    // Camera's forward is -Z in view space, so negate the extracted column
    _fwd.current.negate();

    const dist   = 2.8;     // units in front of camera
    const leftNDC  = -0.55; // NDC X: left side (-1 = far left, 0 = centre)
    const downNDC  = -0.35; // NDC Y: slightly below centre

    const fovRad = camera.fov * (Math.PI / 180);
    const halfH  = Math.tan(fovRad / 2) * dist;
    const halfW  = halfH * (camera.aspect ?? (window.innerWidth / window.innerHeight));

    _target.current
      .copy(camera.position)
      .addScaledVector(_fwd.current,   dist)
      .addScaledVector(_right.current, leftNDC * halfW)
      .addScaledVector(_up.current,    downNDC * halfH);

    // ── 2. IDLE FLOAT: smooth random drift ───────────────────────────────
    floatTimer.current -= delta;
    if (floatTimer.current <= 0) {
      floatTarget.current.set(
        THREE.MathUtils.randFloatSpread(0.12),
        THREE.MathUtils.randFloatSpread(0.08),
        THREE.MathUtils.randFloatSpread(0.04)
      );
      floatTimer.current = THREE.MathUtils.randFloat(1.5, 3.0);
    }
    floatOffset.current.lerp(floatTarget.current, delta * 1.2);
    _target.current.add(floatOffset.current);

    // Lerp group toward target — smooth, no jitter
    group.position.lerp(_target.current, delta * 6);

    // ── 3. FACE CAMERA: Y-only rotation, no lookAt flipping ──────────────
    _dir.current.subVectors(camera.position, group.position);
    _dir.current.y = 0;
    if (_dir.current.lengthSq() > 0.0001) {
      const targetAngle = Math.atan2(_dir.current.x, _dir.current.z);
      // Lerp angle via shortest path
      const curr  = group.rotation.y;
      const diff  = ((targetAngle - curr + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      group.rotation.y += diff * Math.min(delta * 5, 1);
    }

    // ── 4. HEAD LOOK-AT MOUSE (via VRM lookAt API) ───────────────────────
    if (vrm?.lookAt) {
      // Unproject mouse NDC → world ray, place target 3 units along it
      _mouseWS.current.set(mouseRef.current.x, mouseRef.current.y, 0.5);
      _mouseWS.current.unproject(camera);
      _mouseWS.current.sub(camera.position).normalize();
      _mouseWS.current.multiplyScalar(3).add(camera.position);

      vrm.lookAt.lookAt(_mouseWS.current);
    }

    // ── 5. BLINK (expressionManager) ─────────────────────────────────────
    if (vrm?.expressionManager) {
      blinkTimer.current -= delta;

      const BLINK_DUR = 0.08; // seconds for close / open

      if (blinkPhase.current === 0 && blinkTimer.current <= 0) {
        blinkPhase.current = 1; // start closing
      }

      if (blinkPhase.current === 1) {
        blinkVal.current = Math.min(1, blinkVal.current + delta / BLINK_DUR);
        if (blinkVal.current >= 1) blinkPhase.current = 2;
      } else if (blinkPhase.current === 2) {
        blinkVal.current = Math.max(0, blinkVal.current - delta / BLINK_DUR);
        if (blinkVal.current <= 0) {
          blinkPhase.current = 0;
          blinkTimer.current = THREE.MathUtils.randFloat(2, 5); // next blink
        }
      }

      // Try 'blink' preset; fall back to separate left/right
      if (vrm.expressionManager.getExpressionTrackName?.('blink') !== undefined
          || vrm.expressionManager.getValue?.('blink') !== undefined) {
        vrm.expressionManager.setValue('blink', blinkVal.current);
      } else {
        vrm.expressionManager.setValue?.('blinkLeft',  blinkVal.current);
        vrm.expressionManager.setValue?.('blinkRight', blinkVal.current);
      }
    }

    // ── 6. PROCEDURAL IDLE POSE (arms + breathing) ───────────────────────
    // Applied every frame before vrm.update() so spring bones react to it.
    if (vrm?.humanoid) {
      const t  = state.clock.elapsedTime;
      const breathe = Math.sin(t * 0.9) * 0.025; // slow breath cycle

      const h = vrm.humanoid;
      h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2 + breathe * 0.3);
      h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2 - breathe * 0.3);
      h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
      h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
      // Chest rises/falls with breath
      h.getNormalizedBoneNode('chest')?.rotation.set(breathe, 0, 0);
      h.getNormalizedBoneNode('spine')?.rotation.set(breathe * 0.5, 0, 0);
    }

    // ── 7. UPDATE VRM (CRITICAL — spring bones, expressions, lookAt) ──────
    if (vrm) vrm.update(delta);

    // ── 8. UPDATE ANIMATION MIXER ─────────────────────────────────────────
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return <primitive object={groupRef.current} />;
}
