import * as THREE from 'three';

let points = [];
let rulerGroup = new THREE.Group();
let label;
let cameraRef, rendererRef;

export function initRuler(scene, camera, renderer) {
  cameraRef = camera;
  rendererRef = renderer;
  scene.add(rulerGroup);
  window.addEventListener('click', onMouseClick);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, cameraRef);
  const intersects = raycaster.intersectObjects(rulerGroup.parent.children, true);

  if (intersects.length > 0) {
    const point = intersects[0].point.clone();
    points.push(point);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    sphere.position.copy(point);
    rulerGroup.add(sphere);

    if (points.length === 2) {
      drawRuler(points[0], points[1]);
      points = [];
    }
  }
}

function drawRuler(p1, p2) {
  const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const line = new THREE.Line(geometry, material);
  rulerGroup.add(line);

  const distance = p1.distanceTo(p2).toFixed(2);
  console.log(`Distance: ${distance} m`);

  if (!label) {
    label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.background = 'rgba(0,0,0,0.6)';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '4px';
    label.style.pointerEvents = 'none';
    document.body.appendChild(label);
  }

  updateLabel(p1, p2, distance);
  rendererRef.domElement.addEventListener('mousemove', () => updateLabel(p1, p2, distance));
}

function updateLabel(p1, p2, distance) {
  const mid = p1.clone().lerp(p2, 0.5);
  const screenPos = mid.clone().project(cameraRef);
  label.innerText = `${distance} m`;
  label.style.left = `${(screenPos.x + 1) / 2 * window.innerWidth}px`;
  label.style.top = `${(-screenPos.y + 1) / 2 * window.innerHeight}px`;
}
