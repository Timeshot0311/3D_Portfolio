import * as THREE from 'three';

export function addRGBStrips(scene) {
  const strips = [
    { color: 0x00ffcc, pos: [0, 2.5, -5], rot: [0, 0, 0], size: [2, 0.1] }, // Back wall glow
    { color: 0xff00ff, pos: [2, 2.2, -4.5], rot: [0, 0, 0], size: [1.5, 0.1] },
    { color: 0x00aaff, pos: [-2, 2.2, -4.5], rot: [0, 0, 0], size: [1.5, 0.1] }
  ];

  strips.forEach(({ color, pos, rot, size }) => {
    const geo = new THREE.PlaneGeometry(size[0], size[1]);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    scene.add(mesh);
  });
}
