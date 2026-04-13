import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP MATE CONFIG
// The VTuber floats freely in world space near the desk/monitor area.
// Adjust HOME to reposition her — use console.log(camera.position) in-game
// to find a good anchor point.
//
// Room world bounds (from GLB): X 1.67–3.76, Y 3.19–4.19, Z 2.68–4.89
// Monitors are at world Z ≈ 2.82, so she floats just to the side of them.
// ─────────────────────────────────────────────────────────────────────────────
const VTUBER_HOME   = new THREE.Vector3(1.9, 3.85, 3.2); // left side of desk area
const WANDER_RADIUS = { x: 0.18, y: 0.10, z: 0.08 };    // gentle drift extent

export default function VtuberView() {
  const groupRef    = useRef(new THREE.Group());
  const vrmRef      = useRef(null);
  const mixerRef    = useRef(null);

  // Mouse tracking (NDC -1..1)
  const mouseRef    = useRef(new THREE.Vector2(0, 0));

  // World-space idle wander
  const wanderOffset = useRef(new THREE.Vector3());
  const wanderTarget = useRef(new THREE.Vector3());
  const wanderTimer  = useRef(2.0);

  // Blinking state machine
  const blinkTimer   = useRef(THREE.MathUtils.randFloat(2, 5));
  const blinkPhase   = useRef(0);   // 0=open, 1=closing, 2=opening
  const blinkVal     = useRef(0);

  // Reusable vectors — no per-frame allocation
  const _dir      = useRef(new THREE.Vector3());
  const _mouseWS  = useRef(new THREE.Vector3());
  const _worldPos = useRef(new THREE.Vector3());

  const { camera, scene } = useThree();

  // ── Mouse listener ─────────────────────────────────────────────────────────
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

  // ── VRM load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/VTuber2.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;

        VRMUtils.removeUnnecessaryJoints?.(vrm.scene);
        if (VRMUtils.rotateVRM0) {
          VRMUtils.rotateVRM0(vrm);
        } else {
          vrm.scene.rotation.y = Math.PI;
        }

        vrmRef.current = vrm;

        // Start at home position
        group.position.copy(VTUBER_HOME);
        group.add(vrm.scene);
        scene.add(group);

        // Animations from file (if any)
        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
        }

        // Initial rest pose (arms down from T-pose)
        const h = vrm.humanoid;
        h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2);
        h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2);
        h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
        h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
        h.getNormalizedBoneNode('leftHand')     ?.rotation.set(0, 0,  0.1);
        h.getNormalizedBoneNode('rightHand')    ?.rotation.set(0, 0, -0.1);
      },
      undefined,
      (err) => console.error('VTuber load failed:', err)
    );

    return () => {
      if (group.parent) scene.remove(group);
    };
  }, [scene]);

  // ── Per-frame update ───────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const group = groupRef.current;
    const vrm   = vrmRef.current;
    if (!group) return;

    // ── 1. WORLD-SPACE WANDER (desktop mate drift) ────────────────────────
    // Picks a new small random offset from HOME every 1.5–3 seconds,
    // then smoothly lerps toward it. She stays near her desk-side spot.
    wanderTimer.current -= delta;
    if (wanderTimer.current <= 0) {
      wanderTarget.current.set(
        THREE.MathUtils.randFloatSpread(WANDER_RADIUS.x * 2),
        THREE.MathUtils.randFloatSpread(WANDER_RADIUS.y * 2),
        THREE.MathUtils.randFloatSpread(WANDER_RADIUS.z * 2)
      );
      wanderTimer.current = THREE.MathUtils.randFloat(1.5, 3.0);
    }
    wanderOffset.current.lerp(wanderTarget.current, delta * 1.0);

    _worldPos.current.copy(VTUBER_HOME).add(wanderOffset.current);
    group.position.lerp(_worldPos.current, delta * 3);

    // ── 2. FACE CAMERA (Y rotation, no lookAt flip) ───────────────────────
    _dir.current.subVectors(camera.position, group.position);
    _dir.current.y = 0;
    if (_dir.current.lengthSq() > 0.0001) {
      const targetAngle = Math.atan2(_dir.current.x, _dir.current.z);
      const curr = group.rotation.y;
      const diff = ((targetAngle - curr + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      group.rotation.y += diff * Math.min(delta * 4, 1);
    }

    // ── 3. HEAD LOOK-AT MOUSE (via VRM lookAt) ────────────────────────────
    if (vrm?.lookAt) {
      _mouseWS.current.set(mouseRef.current.x, mouseRef.current.y, 0.5);
      _mouseWS.current.unproject(camera);
      _mouseWS.current.sub(camera.position).normalize().multiplyScalar(3).add(camera.position);
      vrm.lookAt.lookAt(_mouseWS.current);
    }

    // ── 4. BLINK ──────────────────────────────────────────────────────────
    if (vrm?.expressionManager) {
      blinkTimer.current -= delta;
      const BLINK_DUR = 0.08;

      if (blinkPhase.current === 0 && blinkTimer.current <= 0) {
        blinkPhase.current = 1;
      }
      if (blinkPhase.current === 1) {
        blinkVal.current = Math.min(1, blinkVal.current + delta / BLINK_DUR);
        if (blinkVal.current >= 1) blinkPhase.current = 2;
      } else if (blinkPhase.current === 2) {
        blinkVal.current = Math.max(0, blinkVal.current - delta / BLINK_DUR);
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

    // ── 5. PROCEDURAL IDLE POSE (breathing + arms) ───────────────────────
    if (vrm?.humanoid) {
      const t = state.clock.elapsedTime;
      const breathe = Math.sin(t * 0.9) * 0.025;
      const h = vrm.humanoid;
      h.getNormalizedBoneNode('leftUpperArm') ?.rotation.set(0, 0,  1.2 + breathe * 0.3);
      h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.2 - breathe * 0.3);
      h.getNormalizedBoneNode('leftLowerArm') ?.rotation.set(0, 0,  0.2);
      h.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, -0.2);
      h.getNormalizedBoneNode('chest')?.rotation.set(breathe, 0, 0);
      h.getNormalizedBoneNode('spine')?.rotation.set(breathe * 0.5, 0, 0);
    }

    // ── 6. UPDATE VRM (spring bones, expressions, lookAt) ─────────────────
    if (vrm) vrm.update(delta);

    // ── 7. UPDATE ANIMATION MIXER ─────────────────────────────────────────
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return <primitive object={groupRef.current} />;
}
