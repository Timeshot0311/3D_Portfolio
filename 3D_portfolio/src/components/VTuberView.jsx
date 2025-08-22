import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

export default function VtuberView() {
  const avatarRef = useRef(new THREE.Group());
  const mixerRef = useRef(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const bounds = {
    x: [-1.5, 1.5],
    y: [-1.5, 1.5],
    z: [-2.5, -1.0],
  };

  const { camera, scene } = useThree();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const path = '/models/VTuber2.vrm';

    loader.load(
      path,
      (gltf) => {
        const vrm = gltf.userData.vrm;

        VRMUtils.removeUnnecessaryJoints?.(vrm.scene);
        vrm.scene.rotation.y = Math.PI;

        avatarRef.current.add(vrm.scene);
        scene.add(avatarRef.current);

        if (vrm.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(vrm.scene);
          mixer.clipAction(vrm.animations[0]).play();
          mixerRef.current = mixer;
        }
      },
      undefined,
      (error) => {
        console.error('Failed to load VTuber model:', error);
      }
    );
  }, [scene]);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    const pos = avatarRef.current.position;

    if (Math.random() < 0.01) {
      direction.current.set(
        THREE.MathUtils.randFloatSpread(0.01),
        THREE.MathUtils.randFloatSpread(0.01),
        THREE.MathUtils.randFloatSpread(0.01)
      );
    }

    pos.add(direction.current);

    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const basePos = camera.position.clone().add(cameraDir.multiplyScalar(2));

    pos.x = THREE.MathUtils.clamp(pos.x, basePos.x + bounds.x[0], basePos.x + bounds.x[1]);
    pos.y = THREE.MathUtils.clamp(pos.y, basePos.y + bounds.y[0], basePos.y + bounds.y[1]);
    pos.z = THREE.MathUtils.clamp(pos.z, basePos.z + bounds.z[0], basePos.z + bounds.z[1]);

    avatarRef.current.lookAt(camera.position);

    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive object={avatarRef.current} />;
}
