import * as THREE from 'three';

let clippingPlane, clippingBox;

export function initClipPlane(renderer, scene, enable = true) {
  if (!enable) {
    renderer.clippingPlanes = [];
    scene.remove(clippingBox);
    clippingBox = null;
    return;
  }

  // Tạo mặt phẳng cắt đứng (vuông góc trục X)
  clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  renderer.clippingPlanes = [clippingPlane];
  renderer.localClippingEnabled = true;

  // Vẽ hình vuông lớn dựng đứng để biểu thị mặt cắt
  const size = 10000;
  const geometry = new THREE.BoxGeometry(size, size, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa500,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });

  clippingBox = new THREE.Mesh(geometry, material);
  clippingBox.rotateY(Math.PI / 2); // dựng đứng theo trục X
  clippingBox.position.set(0, size / 2, 0); // căn giữa

  scene.add(clippingBox);
}
