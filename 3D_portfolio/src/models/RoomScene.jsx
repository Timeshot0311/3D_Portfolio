import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { addRGBStrips } from '../utils/lights';

export default function RoomScene() {
  const { scene } = useGLTF('/models/timeshot-room.glb');

  useEffect(() => {
    addRGBStrips(scene);
  }, [scene]);

  return <primitive object={scene} />;
}
