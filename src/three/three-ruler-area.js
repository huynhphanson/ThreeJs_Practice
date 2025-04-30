// === THREE RULER AREA ===

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/Addons.js';
import {
  computeCentroid,
  createLabel,
  updateLabel,
  collectVisibleMeshes,
  updateLineTransform,
  createMeasureLineMaterial,
} from './three-ruler-utils.js';

let cameraRef, rendererRef, controlsRef;
let areaGroup = new THREE.Group();
let originPoint = null;
let areaEnabled = false;
let clickHandlersRegistered = false;

let isMouseDown = false;
let mouseDownTime = 0;
let mouseDownPosition = { x: 0, y: 0 };
let lastClickTime = 0;
let clickTimeout = null;
let isRightMouseDown = false;
let rightMouseDownTime = 0;
let rightMouseDownPosition = { x: 0, y: 0 };

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let highlightedSphere = null;
let draggingSphere = null;
let previewLine = null;
let previewLabel = null;
let isAnimating = false;
let hasDragged = false;
let originalDragPosition = null;
let pendingCancelDrag = false;
let suppressNextRightClick = false;
let canceledDragByRightClick = false;

let pointGroups = [];
let sphereGroups = [];
let lineGroups = [];
let labelGroups = [];
let areaLabels = [];
let allSpheres = [];
let finalized = false;

export function initRulerArea(scene, camera, renderer, controls) {
  cameraRef = camera;
  rendererRef = renderer;
  controlsRef = controls;
  scene.add(areaGroup);

  if (!isAnimating) {
    requestAnimationFrame(animateLabels);
    isAnimating = true;
  }

  if (!clickHandlersRegistered) {
    const dom = rendererRef.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('contextmenu', handleRightClick);
    clickHandlersRegistered = true;
  }
}

function handleMouseDown(event) {
  isMouseDown = true;
  mouseDownTime = performance.now();
  mouseDownPosition = { x: event.clientX, y: event.clientY };

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, cameraRef);
  const intersects = raycaster.intersectObjects(allSpheres, false);
  if (intersects.length > 0) {
    draggingSphere = intersects[0].object;
    originalDragPosition = draggingSphere.position.clone();
    if (controlsRef) controlsRef.enabled = false;
  }
  
  if (event.button === 2) {
    isRightMouseDown = true;
    rightMouseDownTime = performance.now();
    rightMouseDownPosition = { x: event.clientX, y: event.clientY };
  }
}

function handleMouseMove(event) {
  if (!areaEnabled) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, cameraRef);

  // === (1) Drag sphere
  if (draggingSphere) {
    if (pendingCancelDrag) {
      draggingSphere.position.copy(originalDragPosition);
      const groupIndex = sphereGroups.findIndex(g => g.includes(draggingSphere));
      if (groupIndex !== -1) {
        const index = sphereGroups[groupIndex].indexOf(draggingSphere);
        pointGroups[groupIndex][index].copy(originalDragPosition);
        regeneratePolygon(groupIndex);
      }
      pendingCancelDrag = false;
      suppressNextRightClick = true;
      draggingSphere = null;
      originalDragPosition = null;
      if (controlsRef) controlsRef.enabled = true;
      return;
    }
    
    // ✅ Thực hiện drag bình thường
    const intersects = raycaster.intersectObjects(collectVisibleMeshes(areaGroup.parent, areaGroup), true);
    if (intersects.length > 0) {
      const hit = intersects[0].point.clone();
      const localPos = hit.sub(originPoint);
      draggingSphere.position.copy(localPos);
      hasDragged = true;
  
      const groupIndex = sphereGroups.findIndex(g => g.includes(draggingSphere));
      if (groupIndex !== -1) {
        const index = sphereGroups[groupIndex].indexOf(draggingSphere);
        pointGroups[groupIndex][index].copy(localPos);
        regeneratePolygon(groupIndex);
      }
    }
    return;
  }
  

  // === (2) Hover highlight
  const intersectsSphere = raycaster.intersectObjects(allSpheres, false);
  if (intersectsSphere.length > 0) {
    const sphere = intersectsSphere[0].object;
    if (highlightedSphere !== sphere) {
      if (highlightedSphere) {
        highlightedSphere.material.color.set(0xff0000);
        highlightedSphere.scale.multiplyScalar(1 / 1.5);
      }
      highlightedSphere = sphere;
      highlightedSphere.material.color.set(0x00ff00);
      highlightedSphere.scale.multiplyScalar(1.5);
    }
  } else if (highlightedSphere) {
    highlightedSphere.material.color.set(0xff0000);
    highlightedSphere.scale.multiplyScalar(1 / 1.5);
    highlightedSphere = null;
  }

  // === (3) Preview line & label
  if (!finalized) {
    const currentPoints = pointGroups.at(-1);
    if (!currentPoints || currentPoints.length === 0) return;

    const intersects = raycaster.intersectObjects(collectVisibleMeshes(areaGroup.parent, areaGroup), true);
    if (intersects.length === 0) return;

    const hit = intersects[0].point.clone();
    const localStart = currentPoints.at(-1).clone();
    const localEnd = hit.clone().sub(originPoint);

    if (!previewLine) {
      previewLine = drawMeasureLine(localStart, localEnd);
    } else {
      updateLineTransform(previewLine.mesh, localStart, localEnd);
    }

    const mid = localStart.clone().lerp(localEnd, 0.5);
    const distance = localStart.clone().add(originPoint).distanceTo(hit);
    if (!previewLabel) {
      previewLabel = createLabel(`${distance.toFixed(2)} m`, mid, pointGroups.length - 1, areaGroup);
    } else {
      updateLabel(previewLabel, `${distance.toFixed(2)} m`, mid);
    }
  }
}



function handleMouseUp(event) {
  isMouseDown = false;
  const timeDiff = performance.now() - mouseDownTime;
  const moveDistance = Math.hypot(event.clientX - mouseDownPosition.x, event.clientY - mouseDownPosition.y);
  if (timeDiff > 200 || moveDistance > 5) return;

  const now = performance.now();
  if (now - lastClickTime < 180) {
    clearTimeout(clickTimeout);
    return;
  };
  draggingSphere = null;
  if (controlsRef) controlsRef.enabled = true;

  if (hasDragged) {
    hasDragged = false;
    draggingSphere = null;
    if (controlsRef) controlsRef.enabled = true;
    return;
  }
  
  lastClickTime = now;
  clickTimeout = setTimeout(() => {
    onMouseClick(event, areaGroup.parent);
  }, 180);
}

function handleRightClick(event) {
  if (!areaEnabled) return;
  if (draggingSphere) {
    // 🛑 Hủy drag và khôi phục vị trí
    draggingSphere.position.copy(originalDragPosition);

    const groupIndex = sphereGroups.findIndex(g => g.includes(draggingSphere));
    if (groupIndex !== -1) {
      const idx = sphereGroups[groupIndex].indexOf(draggingSphere);
      pointGroups[groupIndex][idx].copy(originalDragPosition);
      regeneratePolygon(groupIndex);
    }

    draggingSphere = null;
    originalDragPosition = null;
    canceledDragByRightClick = true; // 👈 Ghi nhận rằng click phải dùng để huỷ drag
    if (controlsRef) controlsRef.enabled = true;
    event.preventDefault();
    return; // ❌ Không thực hiện đo diện tích
  }

  if (canceledDragByRightClick) {
    canceledDragByRightClick = false; // 👈 Bỏ qua 1 lần click phải sau khi hủy drag
    event.preventDefault();
    return;
  }
  
  
  const timeDiff = performance.now() - rightMouseDownTime;
  const moveDistance = Math.hypot(event.clientX - rightMouseDownPosition.x, event.clientY - rightMouseDownPosition.y);
  isRightMouseDown = false;
  if (timeDiff > 200 || moveDistance > 5) return;
  event.preventDefault();

  const currentPoints = pointGroups.at(-1);
  if (!currentPoints || currentPoints.length < 3) return;

  finalizePolygon(pointGroups.length - 1);
  // Xoá hết các line và label của preview (chắc chắn)
  if (previewLine?.mesh) {
    areaGroup.remove(previewLine.mesh);
    previewLine.mesh.geometry.dispose();
    previewLine.mesh.material.dispose();
    previewLine = null;
  }
  if (previewLabel) {
    areaGroup.remove(previewLabel);
    previewLabel = null;
  }

  const groupIndex = pointGroups.length - 1;
  if (previewLine) {
    areaGroup.remove(previewLine.mesh);
    previewLine.mesh.geometry.dispose();
    previewLine.mesh.material.dispose();
    previewLine = null;
  }
  if (previewLabel) {
    areaGroup.remove(previewLabel);
    previewLabel = null;
  }

  // Clear preview and finalize polygon by closing loop
  const first = pointGroups[groupIndex][0];
  const last = pointGroups[groupIndex].at(-1);
  if (first && last && !first.equals(last)) {
    pointGroups[groupIndex].push(first.clone());
    const { mesh } = drawMeasureLine(last, first);
    lineGroups[groupIndex].push(mesh);

    const mid = last.clone().lerp(first, 0.5);
    const dist = last.clone().add(originPoint).distanceTo(first.clone().add(originPoint));
    const label = createLabel(`${dist.toFixed(2)} m`, mid, groupIndex, areaGroup);
    labelGroups[groupIndex].push(label);
    areaGroup.add(label);
  }

  finalized = true;

  if (previewLine?.mesh) {
    areaGroup.remove(previewLine.mesh);
    previewLine.mesh.geometry.dispose();
    previewLine.mesh.material.dispose();
    previewLine = null;
  }
  if (previewLabel) {
    areaGroup.remove(previewLabel);
    previewLabel = null;
  };

  // ✅ Reset preview sau khi xác nhận
  previewLine = null;
  previewLabel = null;
  finalized = true;

}

function onMouseClick(event, scene) {
  if (!areaEnabled || event.button !== 0) return;

  if (finalized || pointGroups.length === 0) {
    pointGroups.push([]);
    sphereGroups.push([]);
    lineGroups.push([]);
    labelGroups.push([]);
    areaLabels.push(null);
    finalized = false;
  }

  const groupIndex = pointGroups.length - 1;
  const currentPoints = pointGroups.at(-1);
  const currentSpheres = sphereGroups.at(-1);
  const currentLines = lineGroups.at(-1);

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, cameraRef);

  const intersects = raycaster.intersectObjects(collectVisibleMeshes(scene, areaGroup), true);
  if (intersects.length === 0) return;

  const worldPoint = intersects[0].point.clone();
  if (!originPoint) {
    originPoint = worldPoint.clone();
    areaGroup.position.copy(originPoint);
  }

  const local = worldPoint.clone().sub(originPoint);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false })
  );
  sphere.position.copy(local);
  areaGroup.add(sphere);
  allSpheres.push(sphere);

  currentPoints.push(local);
  currentSpheres.push(sphere);

  // Tạo line cố định từ điểm trước đến điểm này
  if (currentPoints.length >= 2) {
    const groupIndex = pointGroups.length - 1;
    const start = currentPoints[currentPoints.length - 2];
    const end = currentPoints[currentPoints.length - 1];
  
    const { mesh } = drawMeasureLine(start, end);
    lineGroups[groupIndex].push(mesh);
  
    const mid = start.clone().lerp(end, 0.5);
    const dist = start.clone().add(originPoint).distanceTo(end.clone().add(originPoint));
    const label = createLabel(`${dist.toFixed(2)} m`, mid, groupIndex, areaGroup);
    labelGroups[groupIndex].push(label);
    areaGroup.add(label);
  }
  
  
  if (previewLine?.mesh) {
    areaGroup.remove(previewLine.mesh);
    previewLine.mesh.geometry.dispose();
    previewLine.mesh.material.dispose();
    previewLine = null;
  }

  if (previewLabel) {
    areaGroup.remove(previewLabel);
    previewLabel = null;
  }
}

function regeneratePolygon(groupIndex) {
  const points = pointGroups[groupIndex];
  const spheres = sphereGroups[groupIndex];

  // Xoá line cũ
  lineGroups[groupIndex]?.forEach(l => {
    areaGroup.remove(l);
    l.geometry?.dispose?.();
    l.material?.dispose?.();
  });
  labelGroups[groupIndex]?.forEach(lbl => areaGroup.remove(lbl));
  if (areaLabels[groupIndex]) areaGroup.remove(areaLabels[groupIndex]);

  lineGroups[groupIndex] = [];
  labelGroups[groupIndex] = [];

  const worldPoints = points.map(p => p.clone().add(originPoint));
  let totalLength = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const group = drawMeasureLine(a, b);
    updateLineThickness(group.mesh, cameraRef); // scale theo camera
    lineGroups[groupIndex].push(group.mesh);

    const mid = a.clone().lerp(b, 0.5);
    const dist = a.clone().add(originPoint).distanceTo(b.clone().add(originPoint));
    const label = createLabel(`${dist.toFixed(2)} m`, mid, groupIndex, areaGroup);
    labelGroups[groupIndex].push(label);
    totalLength += dist;
  }

  // Tính lại diện tích
  const area = compute3DArea(worldPoints);
  const center = computeCentroid(worldPoints).sub(originPoint);
  const label = createLabel(`Diện tích: ${area.toFixed(2)} m²`, center, groupIndex, areaGroup);
  areaLabels[groupIndex] = label;
  areaGroup.add(label);
}

function finalizePolygon(groupIndex) {
  const points = pointGroups[groupIndex];
  const worldPoints = points.map(p => p.clone().add(originPoint));

  const geometry = new THREE.BufferGeometry();
  const center = computeCentroid(worldPoints);

  const vertices = [];
  for (let i = 0; i < worldPoints.length; i++) {
    vertices.push(...worldPoints[i].toArray());
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const area = compute3DArea(worldPoints);
  

  const label = createLabel(`Diện tích: ${Math.abs(area).toFixed(2)} m²`, center.clone().sub(originPoint), groupIndex, areaGroup);
  areaLabels[groupIndex] = label;
  areaGroup.add(label);
}

function drawMeasureLine(p1, p2) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 16, 1, true);
  const material = createMeasureLineMaterial(length);

  material.depthTest = false;
  material.depthWrite = false;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 999;

  mesh.position.copy(p1.clone().lerp(p2, 0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  areaGroup.add(mesh);
  return { mesh };
}
function updateLineThickness(mesh, camera, min = 0.02, max = 1.0, factor = 0.002) {
  const distance = mesh.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position);
  const newRadius = THREE.MathUtils.clamp(distance * factor, min, max);
  const height = mesh.geometry.parameters.height;

  if (Math.abs(mesh.geometry.parameters.radiusTop - newRadius) < 0.001) return;

  mesh.geometry.dispose();
  mesh.geometry = new THREE.CylinderGeometry(newRadius, newRadius, height, 16, 1, true);
}

function compute3DArea(points3D) {
  if (points3D.length < 3) return 0;

  // 1. Lấy normal từ tam giác đầu tiên
  const v0 = points3D[0], v1 = points3D[1], v2 = points3D[2];
  const edge1 = v1.clone().sub(v0);
  const edge2 = v2.clone().sub(v0);
  const normal = edge1.clone().cross(edge2).normalize();

  // 2. Tạo hệ trục vuông góc với normal
  const xAxis = edge1.clone().normalize();
  const yAxis = normal.clone().cross(xAxis).normalize();
  const origin = v0.clone();

  // 3. Project các điểm sang mặt phẳng 2D
  const projected = points3D.map(p => {
    const local = p.clone().sub(origin);
    return new THREE.Vector2(local.dot(xAxis), local.dot(yAxis));
  });

  // 4. Tính diện tích 2D
  return Math.abs(THREE.ShapeUtils.area(projected));
}

function animateLabels() {
  requestAnimationFrame(animateLabels);
  allSpheres.forEach(sphere => {
    const distance = cameraRef.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
    const scale = THREE.MathUtils.clamp(distance * 0.02, 1.0, 6.0);
    sphere.scale.set(scale, scale, scale);
  });
}

export function activateRulerArea() {
  areaEnabled = true;
}

export function deactivateRulerArea() {
  areaEnabled = false;
  originPoint = null;
  allSpheres = [];
  pointGroups = [];
  sphereGroups = [];
  lineGroups = [];
  labelGroups = [];
  areaLabels = [];
  finalized = false;
  previewLine = null;
  previewLabel = null;

  while (areaGroup.children.length > 0) {
    const c = areaGroup.children[0];
    if (c.geometry) c.geometry.dispose?.();
    if (c.material) c.material.dispose?.();
    areaGroup.remove(c);
  }
}
