import * as THREE from 'three';
import { centerECEFTiles } from './three-3dtilesModel';

let clippingPlane = null;
let clippingBox = null;
let isClippingEnabled = false;
let isWaitingForClick = false;
let clickHandlerRegistered = false;

let cameraRef, rendererRef, sceneRef, controlsRef;
let mouseDownTime = 0;
let mouseDownPosition = { x: 0, y: 0 };
let isMouseDown = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initClipPlane(scene, camera, renderer, controls, enable = true) {
  cameraRef = camera;
  rendererRef = renderer;
  sceneRef = scene;
  controlsRef = controls;

  isClippingEnabled = enable;

  const dom = renderer.domElement;

  if (!enable) {
    disableClipPlane();
    return;
  }

  if (!clickHandlerRegistered) {
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('mouseup', handleMouseUp);
    clickHandlerRegistered = true;
  }

  isWaitingForClick = true;
}

function disableClipPlane() {
  rendererRef.clippingPlanes = [];
  rendererRef.localClippingEnabled = false;

  if (clippingBox) {
    sceneRef.remove(clippingBox);
    clippingBox.geometry.dispose();
    clippingBox.material.dispose();
    clippingBox = null;
  }

  isWaitingForClick = false;
}

function handleMouseDown(event) {
  isMouseDown = true;
  mouseDownTime = performance.now();
  mouseDownPosition = { x: event.clientX, y: event.clientY };
}

function handleMouseUp(event) {
  if (!isMouseDown || !isWaitingForClick || !isClippingEnabled) return;
  isMouseDown = false;

  const timeDiff = performance.now() - mouseDownTime;
  const moveDist = Math.hypot(event.clientX - mouseDownPosition.x, event.clientY - mouseDownPosition.y);
  if (timeDiff > 250 || moveDist > 5) return;

  const point = getClickPoint(event);
  if (!point) return;

  const normal = new THREE.Vector3();
  cameraRef.getWorldDirection(normal);
  normal.normalize();

  clippingPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);

  applyClipPlane(clippingPlane);

  if (clippingBox) sceneRef.remove(clippingBox);
  clippingBox = createVisualBox(point);
  sceneRef.add(clippingBox);

  isWaitingForClick = false;
}

function getClickPoint(event) {
  const rect = rendererRef.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, cameraRef);

  const meshes = [];
  sceneRef.traverse(obj => { if (obj.isMesh) meshes.push(obj); });

  const intersects = raycaster.intersectObjects(meshes, true);
  return intersects.length > 0 ? intersects[0].point : null;
}

function applyClipPlane(plane) {
  rendererRef.clippingPlanes = [plane];
  rendererRef.localClippingEnabled = true;
}

function createVisualBox(point) {
  const size = 300;
  const geometry = new THREE.BoxGeometry(size, size, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa500,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(point);

  // === Xoay mặt phẳng vuông góc hướng nhìn camera
  const cameraDir = new THREE.Vector3();
  cameraRef.getWorldDirection(cameraDir); // hướng nhìn
  const up = cameraRef.up.clone().normalize(); // trục lên của camera
  const right = new THREE.Vector3().crossVectors(up, cameraDir).normalize();
  const adjustedUp = new THREE.Vector3().crossVectors(cameraDir, right).normalize();

  const matrix = new THREE.Matrix4().makeBasis(right, adjustedUp, cameraDir);
  mesh.setRotationFromMatrix(matrix);

  return mesh;
}
