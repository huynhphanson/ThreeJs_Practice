import * as THREE from 'three';
import { convertToECEF, convertTo9217 } from './three-convertCoor';

let points = [];
let originPoint = null;
let rulerGroup = new THREE.Group();
let cameraRef, rendererRef;
let clickHandlersRegistered = false;

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
    const worldPoint = intersects[0].point.clone();

    // Nếu là click đầu tiên
    if (!originPoint) {
      originPoint = worldPoint.clone();
      rulerGroup.position.copy(originPoint); // dời gốc group
    }

    const localPoint = worldPoint.clone().sub(originPoint); // to local
    points.push(localPoint);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    sphere.position.copy(localPoint);
    rulerGroup.add(sphere);

    if (points.length === 2) {
      drawRightTriangle(points[0], points[1]);
      points = [];
    }
  }
}



function drawLine(p1, p2, color = 0x00ff00) {
  const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const material = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  rulerGroup.add(line);
  return line;
}

function createLabel(text, localPosition) {
  const label = document.createElement('div');
  label.className = 'ruler-label';
  label.innerText = text;
  label.style.position = 'absolute';
  label.style.color = 'white';
  label.style.background = 'rgba(0,0,0,0.6)';
  label.style.padding = '2px 6px';
  label.style.borderRadius = '4px';
  label.style.pointerEvents = 'none';
  document.body.appendChild(label);

  const update = () => {
    const worldPosition = localPosition.clone().add(originPoint);
    const screenPos = worldPosition.clone().project(cameraRef);
    label.style.left = `${(screenPos.x + 1) / 2 * window.innerWidth}px`;
    label.style.top = `${(-screenPos.y + 1) / 2 * window.innerHeight}px`;
  };

  update();
  rendererRef.domElement.addEventListener('mousemove', update);
}


function drawRightTriangle(p1, p2) {
  // Chuyển sang tọa độ thật để xử lý toạ độ VN-2000 và ECEF
  const p1World = p1.clone().add(originPoint);
  const p2World = p2.clone().add(originPoint);

  const p1VN = convertTo9217(p1World.x, p1World.y, p1World.z);
  const p2VN = convertTo9217(p2World.x, p2World.y, p2World.z);
  const p3VN = new THREE.Vector3(p2VN.x, p2VN.y, p1VN.z);
  const p3World = convertToECEF(p3VN.x, p3VN.y, p3VN.z);

  const p3 = p3World.clone().sub(originPoint); // chuyển về local

  // Vẽ 3 cạnh
  drawLine(p1, p3, 0x00ffff);
  createLabel(`${p1.distanceTo(p3).toFixed(2)} m`, p1.clone().lerp(p3, 0.5));

  drawLine(p3, p2, 0xff00ff);
  createLabel(`${p3.distanceTo(p2).toFixed(2)} m`, p3.clone().lerp(p2, 0.5));

  drawLine(p1, p2, 0xffff00);
  createLabel(`${p1.distanceTo(p2).toFixed(2)} m`, p1.clone().lerp(p2, 0.5));
}

