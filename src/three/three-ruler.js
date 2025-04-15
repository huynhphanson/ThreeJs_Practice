// === THREE RULER HOÀN CHỈNH ===

import * as THREE from 'three';
import { convertToECEF, convertTo9217 } from './three-convertCoor';
import { CSS2DObject } from 'three/examples/jsm/Addons.js';

let cameraRef, rendererRef, controlsRef;
let rulerGroup = new THREE.Group();
let originPoint = null;
let rulerEnabled = false;
let clickHandlersRegistered = false;
let allSpheres = [];
let measurements = [];
let allLabels = [];
let previewLine = null;
let previewLabel = null;
let isAnimating = false;
let highlightedSphere = null;
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

  if (!isAnimating) {
    animateLabels();
    isAnimating = true;
  }

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
      updatePreviewLine(event);
    
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef);
    
      // === Đang kéo point ===
      if (draggingSphere) {
        const visibleMeshes = collectVisibleMeshes(cameraRef.scene || rulerGroup.parent, rulerGroup);
        const intersects = raycaster.intersectObjects(visibleMeshes, true);
    
        if (intersects.length > 0) {
          const hit = intersects[0].point.clone();
          const localPos = hit.sub(originPoint);
          draggingSphere.position.copy(localPos);
          updateAllMeasurements();
        }
        return;
      }
    
      // === Hover point ===
      const intersects = raycaster.intersectObjects(allSpheres);
    
      if (intersects.length > 0) {
        const sphere = intersects[0].object;
    
        if (highlightedSphere !== sphere) {
          // Revert sphere trước đó nếu có
          if (highlightedSphere) {
            highlightedSphere.material.color.set(0xff0000);
            highlightedSphere.scale.multiplyScalar(1 / 1.5);
          }
    
          // Gán sphere mới
          highlightedSphere = sphere;
          highlightedSphere.material.color.set(0x00ff00);
          highlightedSphere.scale.multiplyScalar(1.5);
        }
      } else if (highlightedSphere) {
        // Khi rời khỏi mọi sphere
        highlightedSphere.material.color.set(0xff0000);
        highlightedSphere.scale.multiplyScalar(1 / 1.5);
        highlightedSphere = null;
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

function animateLabels() {
  requestAnimationFrame(animateLabels);
  updateSphereScales(allSpheres, cameraRef);
  updateAllLineScales(cameraRef);
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
    if (previewLine) {
      rulerGroup.remove(previewLine.mesh);
      previewLine = null;
    }
    if (previewLabel) {
      rulerGroup.remove(previewLabel);
      previewLabel = null;
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

function createLeaderLine(start, end, group) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color: 0xffa500,
    depthTest: false,
    transparent: true,
    opacity: 0.6,
  });
  const line = new THREE.Line(geometry, material);
  if (group) group.add(line);
  return line;
}

function createMeasureLineMaterial(length) {
  const repeatFactor = Math.max(1, length / 10);
  return new THREE.ShaderMaterial({
    uniforms: {
      color1: { value: new THREE.Color('#ffa500') },
      color2: { value: new THREE.Color('#ffffff') },
      repeat: { value: repeatFactor }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 color1; uniform vec3 color2; uniform float repeat; varying vec2 vUv; void main() { float stripe = step(0.5, fract(vUv.y * repeat)); vec3 color = mix(color2, color1, stripe); gl_FragColor = vec4(color, 1.0); }`,
    side: THREE.DoubleSide,
  });
}

function drawMeasureLine(p1, p2, radius = 0.1, group = null) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true);
  const material = createMeasureLineMaterial(length);

  // ✅ Luôn hiển thị rõ ràng, không bị che
  material.depthTest = false;
  material.depthWrite = false;

  const cylinder = new THREE.Mesh(geometry, material);

  // ✅ Ưu tiên render sau cùng
  cylinder.renderOrder = 999;

  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  cylinder.position.copy(midpoint);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  if (group) group.add(cylinder);
  return { mesh: cylinder };
}


function updateLineTransform(cylinder, p1, p2) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();

  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  cylinder.position.copy(midpoint);

  const scaleY = length / (cylinder.geometry.parameters.height || 1);
  cylinder.scale.set(1, scaleY, 1);

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cylinder.quaternion.copy(quat);

  // Nếu shader dùng repeat, bạn có thể cập nhật tại đây:
  if (cylinder.material?.uniforms?.repeat) {
    cylinder.material.uniforms.repeat.value = Math.max(1, length / 10);
  }
}



function updateSphereScales(spheres, camera) {
  const cameraPos = camera.position;
  spheres.forEach(sphere => {
    // ⚠️ Bỏ qua point đang được hover
    if (sphere === highlightedSphere) return;

    const distance = sphere.getWorldPosition(new THREE.Vector3()).distanceTo(cameraPos);
    const scale = THREE.MathUtils.clamp(distance * 0.02, 1.0, 6.0);
    sphere.scale.set(scale, scale, scale);
  });
}


function createSphere(localPosition) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.3),
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false,
    })
  );
  sphere.position.copy(localPosition);

  // 👇 Scale ban đầu theo khoảng cách camera
  if (cameraRef) {
    const worldPos = localPosition.clone().add(originPoint || new THREE.Vector3());
    const distance = cameraRef.position.distanceTo(worldPos);
    const scale = THREE.MathUtils.clamp(distance * 0.02, 1.0, 6.0);

    sphere.scale.set(scale, scale, scale);
  }

  return sphere;
}

function detectEdgeTypes(p1, p2, p3) {
  const d1 = p1.distanceTo(p2); // cạnh huyền
  const d2 = p1.distanceTo(p3);
  const d3 = p2.distanceTo(p3);

  const max = Math.max(d1, d2, d3);
  if (max === d1) return ['z', 'x', 'y'];      // d1 là huyền → label3: 'z'
  if (max === d2) return ['x', 'z', 'y'];      // d2 là huyền → label1: 'z'
  return ['y', 'x', 'z'];                      // d3 là huyền → label2: 'z'
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

function offsetLabelAwayFromThirdPoint(p1, p2, p3, offset = 1.0) {
  const mid = p1.clone().lerp(p2, 0.5);
  const edge = p2.clone().sub(p1).normalize();
  const toThird = p3.clone().sub(mid).normalize();

  // Vector vuông góc với cạnh huyền, nằm trong mặt phẳng
  const perp = new THREE.Vector3().crossVectors(edge, toThird).normalize();
  const outward = new THREE.Vector3().crossVectors(perp, edge).normalize();

  // Kiểm tra hướng offset: nếu hướng về p3 → đảo lại
  const testDir = p3.clone().sub(mid).normalize();
  if (outward.dot(testDir) > 0) {
    outward.negate(); // Đẩy ra khỏi tam giác
  }

  return mid.add(outward.multiplyScalar(offset));
}

function updateLabel(label, text, position) {
  if (!label || !position) return;
  label.element.innerText = text;
  label.position.copy(position);
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

  const line1 = drawMeasureLine(p1, p3, 0.05, rulerGroup);
  const line2 = drawMeasureLine(p3, p2, 0.05, rulerGroup);
  const line3 = drawMeasureLine(p1, p2, 0.05, rulerGroup);

  const label1Pos = offsetLabelAwayFromThirdPoint(p1, p3, p2, 1.0);
  const label2Pos = offsetLabelAwayFromThirdPoint(p3, p2, p1, 1.0);
  const label3Pos = offsetLabelAwayFromThirdPoint(p1, p2, p3, 1.2);

  const label1 = createLabel(`${p1.distanceTo(p3).toFixed(2)} m`, label1Pos);
  const label2 = createLabel(`${p3.distanceTo(p2).toFixed(2)} m`, label2Pos);
  const label3 = createLabel(`${p1.distanceTo(p2).toFixed(2)} m`, label3Pos);

  const leader1 = createLeaderLine(p1.clone().lerp(p3, 0.5), label1Pos, rulerGroup);
  const leader2 = createLeaderLine(p3.clone().lerp(p2, 0.5), label2Pos, rulerGroup);
  const leader3 = createLeaderLine(p1.clone().lerp(p2, 0.5), label3Pos, rulerGroup);

  return {
    p1: p1Sphere,
    p2: p2Sphere,
    lines: [line1, line2, line3],
    labels: [label1, label2, label3],
    leaders: [leader1, leader2, leader3],
  };
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

    updateLineTransform(m.lines[0].mesh, p1, p3);
    updateLineTransform(m.lines[1].mesh, p3, p2);
    updateLineTransform(m.lines[2].mesh, p1, p2);

    const label1Pos = offsetLabelAwayFromThirdPoint(p1, p3, p2, 1.0);
    const label2Pos = offsetLabelAwayFromThirdPoint(p3, p2, p1, 1.0);
    const label3Pos = offsetLabelAwayFromThirdPoint(p1, p2, p3, 1.2);

    updateLabel(m.labels[0], `${p1.distanceTo(p3).toFixed(2)} m`, label1Pos);
    updateLabel(m.labels[1], `${p3.distanceTo(p2).toFixed(2)} m`, label2Pos);
    updateLabel(m.labels[2], `${p1.distanceTo(p2).toFixed(2)} m`, label3Pos);

    updateLeaderLine(m.leaders[0], p1.clone().lerp(p3, 0.5), label1Pos);
    updateLeaderLine(m.leaders[1], p3.clone().lerp(p2, 0.5), label2Pos);
    updateLeaderLine(m.leaders[2], p1.clone().lerp(p2, 0.5), label3Pos);
  }
}

function updateLeaderLine(line, start, end) {
  const points = [start, end];
  line.geometry.setFromPoints(points);
}


function updatePreviewLine(mouseEvent) {
  if (!rulerEnabled || allSpheres.length % 2 !== 1) return;

  mouse.x = (mouseEvent.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(mouseEvent.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, cameraRef);
  const visibleMeshes = collectVisibleMeshes(rulerGroup.parent, rulerGroup);
  const intersects = raycaster.intersectObjects(visibleMeshes, true);

  if (intersects.length === 0) return;

  const hit = intersects[0].point.clone();
  const worldStart = allSpheres[allSpheres.length - 1].position.clone().add(originPoint);
  const distance = worldStart.distanceTo(hit);

  const localStart = allSpheres[allSpheres.length - 1].position.clone();
  const localEnd = hit.clone().sub(originPoint);

  // === CHỈ tạo 1 lần, rồi update
  if (!previewLine) {
    previewLine = drawMeasureLine(localStart, localEnd, 0.05, rulerGroup);
    previewLine.mesh.renderOrder = 999;
    previewLine.mesh.material.depthTest = false;
    previewLine.mesh.material.depthWrite = false;
  } else {
    updateLineTransform(previewLine.mesh, localStart, localEnd);
  }

  // === Update label
  const mid = localStart.clone().lerp(localEnd, 0.5);
  if (!previewLabel) {
    previewLabel = createLabel(`${distance.toFixed(2)} m`, mid);
  } else {
    updateLabel(previewLabel, `${distance.toFixed(2)} m`, mid);
  }
}


export function activateRuler() {
  rulerEnabled = true;
}

export function deactivateRuler() {
  rulerEnabled = false;
  while (rulerGroup.children.length > 0) rulerGroup.remove(rulerGroup.children[0]);
  document.querySelectorAll('.ruler-label').forEach(el => el.remove());
  allLabels = [];
  originPoint = null;
  allSpheres = [];
  measurements = [];
  draggingSphere = null;
}

function collectVisibleMeshes(scene, excludeGroup) {
  const result = [];
  scene.traverseVisible(obj => {
    if (obj.isMesh && !isChildOfGroup(obj, excludeGroup)) result.push(obj);
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

function updateLineThickness(mesh, camera, min = 0.02, max = 1.0, factor = 0.002) {
  const distance = mesh.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position);
  const newRadius = THREE.MathUtils.clamp(distance * factor, min, max);
  const height = mesh.geometry.parameters.height;

  // Nếu đã đúng kích thước thì bỏ qua
  if (Math.abs(mesh.geometry.parameters.radiusTop - newRadius) < 0.001) return;

  mesh.geometry.dispose();
  mesh.geometry = new THREE.CylinderGeometry(newRadius, newRadius, height, 16, 1, true);
}

function updateAllLineScales(camera) {
  measurements.forEach(m => {
    m.lines.forEach(line => {
      if (line?.mesh?.geometry?.parameters?.height) {
        updateLineThickness(line.mesh, camera);
      }
    });
  });

  if (previewLine?.mesh?.geometry?.parameters?.height) {
    updateLineThickness(previewLine.mesh, camera);
  }
}

