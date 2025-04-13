import * as THREE from 'three';
import { convertToECEF, convertTo9217 } from './three-convertCoor';
import { DragControls } from 'three/examples/jsm/Addons.js';

let cameraRef, rendererRef, controlsRef;
let rulerGroup = new THREE.Group();
let originPoint = null;
let rulerEnabled = false;
let clickHandlersRegistered = false;
let dragControls = null;
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
    });

    rendererRef.domElement.addEventListener("mouseup", (event) => {
      if (!isMouseDown) return;
      isMouseDown = false;

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
        onMouseClick(event, scene);
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

    enableDragging();
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
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  sphere.position.copy(localPosition);
  return sphere;
}

function createLabel(text, localPosition) {
  const label = document.createElement('div');
  label.className = 'ruler-label';
  label.style.position = 'absolute';
  label.style.color = 'white';
  label.style.background = 'rgba(0,0,0,0.6)';
  label.style.padding = '2px 6px';
  label.style.borderRadius = '4px';
  label.style.pointerEvents = 'none';
  label.innerText = text;
  document.body.appendChild(label);

  allLabels.push({ label, getWorldPos: () => localPosition.clone().add(originPoint) });

  return label;
}


function updateLabel(label, text, localPos) {
  label.innerText = text;

  const found = allLabels.find(item => item.label === label);
  if (found) {
    found.getWorldPos = () => localPos.clone().add(originPoint);
  }
}


function updateLine(line, p1, p2) {
  line.geometry.setFromPoints([p1, p2]);
  line.geometry.attributes.position.needsUpdate = true;
}

function updateAllLabelPositions() {
  for (const { label, getWorldPos } of allLabels) {
    const worldPos = getWorldPos();
    const screenPos = worldPos.clone().project(cameraRef);
    label.style.left = `${(screenPos.x + 1) / 2 * window.innerWidth}px`;
    label.style.top = `${(-screenPos.y + 1) / 2 * window.innerHeight}px`;
  }
}


function drawLine(p1, p2, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const material = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  rulerGroup.add(line);
  return line;
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

  return { p1: p1Sphere, p2: p2Sphere, lines: [line1, line2, line3], labels: [label1, label2, label3] };
}

function enableDragging() {
  if (dragControls) dragControls.dispose();
  dragControls = new DragControls(allSpheres, cameraRef, rendererRef.domElement);

  dragControls.addEventListener('dragstart', () => {
    if (controlsRef) controlsRef.enabled = false;
  });

  dragControls.addEventListener('dragend', () => {
    if (controlsRef) controlsRef.enabled = true;
  });

  dragControls.addEventListener('drag', () => {
    updateAllMeasurements();
  });
}

function updateAllMeasurements() {
  for (const m of measurements) {
    const p1 = m.p1.position;
    const p2 = m.p2.position;

    const p1World = p1.clone().add(originPoint);
    const p2World = p2.clone().add(originPoint);
    const p1VN = convertTo9217(p1World.x, p1World.y, p1World.z);
    const p2VN = convertTo9217(p2World.x, p2World.y, p2World.z);
    const p3VN = new THREE.Vector3(p2VN.x, p2VN.y, p1VN.z);
    const p3World = convertToECEF(p3VN.x, p3VN.y, p3VN.z);
    const p3 = p3World.clone().sub(originPoint);

    updateLine(m.lines[0], p1, p3);
    updateLine(m.lines[1], p3, p2);
    updateLine(m.lines[2], p1, p2);

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

  if (dragControls) {
    dragControls.dispose();
    dragControls = null;
  }
  
}

function animateLabels() {
  requestAnimationFrame(animateLabels);
  updateAllLabelPositions();
}
animateLabels();
