import { useGLTF } from '@react-three/drei';

export default function RoomScene() {
  const { scene } = useGLTF('/models/timeshot-room.glb');

  

  return <primitive object={scene} />;
}
