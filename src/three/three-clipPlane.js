import * as THREE from 'three';

let clippingPlane, clippingBox, isWaitingForPick = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initClipPlane(renderer, scene, camera, domElement, enable = true) {
  if (!enable) {
    disableClipPlane(renderer, scene, domElement);
    return;
  }

  isWaitingForPick = true;
  domElement.addEventListener('click', onMouseClick);

  function onMouseClick(event) {
    if (!isWaitingForPick) return;

    const point = getClickPoint(event, camera, domElement, scene);
    if (!point) return;

    const normal = computeVerticalNormal(camera);
    clippingPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);

    applyClipPlane(renderer, clippingPlane);

    if (clippingBox) scene.remove(clippingBox);
    clippingBox = createVisualBox(point, normal);
    scene.add(clippingBox);

    isWaitingForPick = false;
    domElement.removeEventListener('click', onMouseClick);
  }
};

function disableClipPlane(renderer, scene, domElement) {
  renderer.clippingPlanes = [];
  scene.remove(clippingBox);
  clippingBox = null;
  isWaitingForPick = false;
  domElement.removeEventListener('click', onMouseClick);
}

function getClickPoint(event, camera, domElement, scene) {
  const rect = domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  scene.traverse(obj => { if (obj.isMesh) meshes.push(obj); });

  const intersects = raycaster.intersectObjects(meshes, true);
  return intersects.length > 0 ? intersects[0].point : null;
}

function computeVerticalNormal(camera) {
  const up = camera.up.clone().normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const normal = new THREE.Vector3().crossVectors(forward, up).normalize();
  return normal;
}

function applyClipPlane(renderer, plane) {
  renderer.clippingPlanes = [plane];
  renderer.localClippingEnabled = true;
}

function createVisualBox(point, normal) {
  const geometry = new THREE.BoxGeometry(200, 500, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa500,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(point);

  // Dựng hướng mặt đứng
  const target = point.clone().add(normal);
  mesh.lookAt(target);

  return mesh;
}
