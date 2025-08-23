import { useGLTF } from '@react-three/drei';

export default function RoomScene() {
  const { scene } = useGLTF('/models/timeshot-room2.glb');
  console.log("GLB loaded:", scene); // ✅ now inside the component

  return <primitive object={scene} />;
}
