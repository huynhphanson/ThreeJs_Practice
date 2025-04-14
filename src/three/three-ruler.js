import * as THREE from 'three';
import { convertToECEF, convertTo9217 } from './three-convertCoor';
import { CSS2DObject } from 'three/examples/jsm/Addons.js';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

let cameraRef, rendererRef, controlsRef;
let rulerGroup = new THREE.Group();
let originPoint = null;
let rulerEnabled = false;
let clickHandlersRegistered = false;
let allSpheres = [];
let measurements = [];
let allLabels = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isMouseDown = false;
let mouseDownTime = 0;
let mouseDownPosition = { x: 0, y: 0 };
let lastClickTime = 0;
let clickTimeout = null;

let draggingSphere = null;

export function initRuler(scene, camera, renderer, controls) {
  cameraRef = camera;
  rendererRef = renderer;
  controlsRef = controls;
  scene.add(rulerGroup);

  if (!clickHandlersRegistered) {
    rendererRef.domElement.addEventListener("mousedown", (event) => {
      isMouseDown = true;
      mouseDownTime = performance.now();
      mouseDownPosition = { x: event.clientX, y: event.clientY };

      if (!rulerEnabled) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef);
      const intersects = raycaster.intersectObjects(allSpheres, false);

      if (intersects.length > 0) {
        draggingSphere = intersects[0].object;
        if (controlsRef) controlsRef.enabled = false;
      }
    });

    rendererRef.domElement.addEventListener("mousemove", (event) => {
      if (!draggingSphere) return;
    
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
      raycaster.setFromCamera(mouse, cameraRef);
      const visibleMeshes = collectVisibleMeshes(cameraRef.scene || rulerGroup.parent, rulerGroup);
      const intersects = raycaster.intersectObjects(visibleMeshes, true);
    
      if (intersects.length > 0) {
        const hit = intersects[0].point.clone();
        const localPos = hit.sub(originPoint);
        draggingSphere.position.copy(localPos);
    
        // Cập nhật các phép đo và nhãn khi di chuyển điểm
        updateAllMeasurements();  // Cập nhật lại nhãn mỗi lần điểm di chuyển
      }
    });
    

    rendererRef.domElement.addEventListener("mouseup", (event) => {
      isMouseDown = false;
      if (controlsRef) controlsRef.enabled = true;
      draggingSphere = null;

      const timeDiff = performance.now() - mouseDownTime;
      const moveDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) +
        Math.pow(event.clientY - mouseDownPosition.y, 2)
      );

      if (timeDiff > 200 || moveDistance > 5) return;

      const now = performance.now();
      if (now - lastClickTime < 180) {
        clearTimeout(clickTimeout);
        return;
      }

      lastClickTime = now;

      clickTimeout = setTimeout(() => {
        onMouseClick(event, rulerGroup.parent);
      }, 180);
    });

    clickHandlersRegistered = true;
  }
}

function onMouseClick(event, scene) {
  if (!rulerEnabled) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, cameraRef);
  const visibleMeshes = collectVisibleMeshes(scene, rulerGroup);
  const intersects = raycaster.intersectObjects(visibleMeshes, true);

  if (intersects.length > 0) {
    const worldPoint = intersects[0].point.clone();

    if (!originPoint) {
      originPoint = worldPoint.clone();
      rulerGroup.position.copy(originPoint);
    }

    const localPoint = worldPoint.clone().sub(originPoint);
    const sphere = createSphere(localPoint);
    allSpheres.push(sphere);
    rulerGroup.add(sphere);

    if (allSpheres.length % 2 === 0) {
      const p1 = allSpheres[allSpheres.length - 2];
      const p2 = allSpheres[allSpheres.length - 1];
      const measurement = drawRightTriangle(p1, p2);
      measurements.push(measurement);
    }
  }
}

function collectVisibleMeshes(scene, excludeGroup) {
  const result = [];
  scene.traverseVisible(obj => {
    if (obj.isMesh && !isChildOfGroup(obj, excludeGroup)) {
      result.push(obj);
    }
  });
  return result;
}

function isChildOfGroup(obj, group) {
  while (obj) {
    if (obj === group) return true;
    obj = obj.parent;
  }
  return false;
}

function createSphere(localPosition) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.2),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  sphere.position.copy(localPosition);
  return sphere;
}

function createLabel(text, position) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text;
  div.style.marginTop = '-1em';
  div.style.color = 'white';
  div.style.fontSize = '14px';
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  div.style.padding = '2px 6px';
  div.style.borderRadius = '4px';

  const label = new CSS2DObject(div);
  label.position.copy(position);
  rulerGroup.add(label);
  return label;
}

function updateLabel(label, text, position) {
  if (!label) return;
  if (!position) return;

  label.element.innerText = text;
  label.position.copy(position); // Đặt lại vị trí của nhãn
}



function updateLine(lineObj, p1, p2) {
  if (!lineObj.line || !lineObj.line.geometry) return;

  const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  lineObj.line.geometry.dispose();
  lineObj.line.setGeometry(geometry);
}



function drawLine(p1, p2, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const line = new MeshLine();
  line.setGeometry(geometry);
  const material = new MeshLineMaterial({
    color,
    lineWidth: 0.1,
    depthTest: false,
    transparent: true,
    opacity: 1.0
  });
  const mesh = new THREE.Mesh(line.geometry, material);
  rulerGroup.add(mesh);
  return { line, mesh };  // Trả về cả line và mesh
}


function drawRightTriangle(p1Sphere, p2Sphere) {
  const p1 = p1Sphere.position;
  const p2 = p2Sphere.position;

  const p1World = p1.clone().add(originPoint);
  const p2World = p2.clone().add(originPoint);
  const p1VN = convertTo9217(p1World.x, p1World.y, p1World.z);
  const p2VN = convertTo9217(p2World.x, p2World.y, p2World.z);
  const p3VN = new THREE.Vector3(p2VN.x, p2VN.y, p1VN.z);
  const p3World = convertToECEF(p3VN.x, p3VN.y, p3VN.z);
  const p3 = p3World.clone().sub(originPoint);

  const line1 = drawLine(p1, p3, 0x00ffff);
  const line2 = drawLine(p3, p2, 0xff00ff);
  const line3 = drawLine(p1, p2, 0xffff00);

  const label1 = createLabel(`${p1.distanceTo(p3).toFixed(2)} m`, p1.clone().lerp(p3, 0.5));
  const label2 = createLabel(`${p3.distanceTo(p2).toFixed(2)} m`, p3.clone().lerp(p2, 0.5));
  const label3 = createLabel(`${p1.distanceTo(p2).toFixed(2)} m`, p1.clone().lerp(p2, 0.5));

  return { 
    p1: p1Sphere, 
    p2: p2Sphere, 
    lines: [line1, line2, line3], 
    labels: [label1, label2, label3] };
}

function updateAllMeasurements() {
  for (const m of measurements) {
    const p1 = m.p1.position;
    const p2 = m.p2.position;

    // Tính toán lại các điểm tam giác sau khi di chuyển
    const p1World = p1.clone().add(originPoint);
    const p2World = p2.clone().add(originPoint);
    const p1VN = convertTo9217(p1World.x, p1World.y, p1World.z);
    const p2VN = convertTo9217(p2World.x, p2World.y, p2World.z);
    const p3VN = new THREE.Vector3(p2VN.x, p2VN.y, p1VN.z);
    const p3World = convertToECEF(p3VN.x, p3VN.y, p3VN.z);
    const p3 = p3World.clone().sub(originPoint);

    // Cập nhật các đường đo
    updateLine(m.lines[0], p1, p3);
    updateLine(m.lines[1], p3, p2);
    updateLine(m.lines[2], p1, p2);

    // Cập nhật nhãn với các vị trí của các điểm
    updateLabel(m.labels[0], `${p1.distanceTo(p3).toFixed(2)} m`, p1.clone().lerp(p3, 0.5));
    updateLabel(m.labels[1], `${p3.distanceTo(p2).toFixed(2)} m`, p3.clone().lerp(p2, 0.5));
    updateLabel(m.labels[2], `${p1.distanceTo(p2).toFixed(2)} m`, p1.clone().lerp(p2, 0.5));    
  }
}

export function activateRuler() {
  rulerEnabled = true;
}

export function deactivateRuler() {
  rulerEnabled = false;

  while (rulerGroup.children.length > 0) {
    rulerGroup.remove(rulerGroup.children[0]);
  }

  document.querySelectorAll('.ruler-label').forEach(el => el.remove());
  allLabels = [];
  originPoint = null;
  allSpheres = [];
  measurements = [];
  draggingSphere = null;
}

function animateLabels() {
  requestAnimationFrame(animateLabels);
}
animateLabels();