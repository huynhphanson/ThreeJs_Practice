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
let isAnimating = false;
let highlightedSphere = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isMouseDown = false;
let mouseDownTime = 0;
let mouseDownPosition = { x: 0, y: 0 };
let lastClickTime = 0;
let clickTimeout = null;
let currentMouseHit = null;

let draggingSphere = null;
let points = [];
let selectedSpheres = []; // 👈 song song với points
let previewLine = null;
let previewLabel = null;
let previewLine1 = null;
let previewLabel1 = null;
let polygonAreaLabel = null;
let polygonMesh = null;

let lastMousePosition = new THREE.Vector2();
let totalLengthLabel = null;
let polylineLines = [];
let polylineLabels = [];
let polylineTotalLabel = null;
let finalized = false;


function finalizePolylineMeasurement(points) {
  // Clear polylineLines và polylineLabels cũ nếu có
  
  polylineLines.forEach(l => {
    rulerGroup.remove(l);
    l.geometry.dispose();
    l.material.dispose();
  });
  polylineLabels.forEach(l => {
    rulerGroup.remove(l);
  });
  if (polylineTotalLabel) rulerGroup.remove(polylineTotalLabel);

  polylineLines = [];
  polylineLabels = [];
  polylineTotalLabel = null;

  const worldPoints = points.map(p => p.clone());
  let totalLength = 0;

  for (let i = 0; i < worldPoints.length - 1; i++) {
    const start = worldPoints[i];
    const end = worldPoints[i + 1];

    const localStart = start.clone().sub(originPoint);
    const localEnd = end.clone().sub(originPoint);

    const line = drawMeasureLine(localStart, localEnd, 0.05, rulerGroup).mesh;
    polylineLines.push(line);
    
    const mid = localStart.clone().lerp(localEnd, 0.5);
    const distance = start.distanceTo(end);
    const label = createLabel(`${distance.toFixed(2)} m`, mid);
    polylineLabels.push(label);

    totalLength += distance;
  }

  const centerWorld = computeCentroid(worldPoints);
  const centerLocal = centerWorld.clone().sub(originPoint);
  
  polylineTotalLabel = createLabel(`Tổng: ${totalLength.toFixed(2)} m`, centerLocal);
  rulerGroup.add(polylineTotalLabel);
}

function updatePolylineDisplay() {
  // 🧹 Remove all old polyline lines from rulerGroup
  rulerGroup.children
    .filter(obj => obj.userData?.isPolyline)
    .forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
    });
  // 🧹 Remove all old polyline labels from rulerGroup
  rulerGroup.children
    .filter(obj => obj.isCSS2DObject && obj.userData?.isPolylineLabel)
    .forEach(label => label.removeFromParent());

  polylineLines = [];
  polylineLabels.forEach(l => rulerGroup.remove(l));
  polylineLabels = [];
  if (polylineTotalLabel) {
    rulerGroup.remove(polylineTotalLabel);
    polylineTotalLabel = null;
  }
    
  const worldPoints = points.map(p => p.clone().add(originPoint));
  let totalLength = 0;

  for (let i = 0; i < worldPoints.length - 1; i++) {
    const start = worldPoints[i];
    const end = worldPoints[i + 1];

    const localStart = start.clone().sub(originPoint);
    const localEnd = end.clone().sub(originPoint);

    const line = drawMeasureLine(localStart, localEnd, 0.05, rulerGroup).mesh;
    polylineLines.push(line);    

    const mid = localStart.clone().lerp(localEnd, 0.5);
    const distance = start.distanceTo(end);
    const label = createLabel(`${distance.toFixed(2)} m`, mid);
    label.userData.isPolylineLabel = true;
    polylineLabels.push(label);

    totalLength += distance;
  }

  const centerWorld = computeCentroid(worldPoints);
  const centerLocal = centerWorld.clone().sub(originPoint);
  polylineTotalLabel = createLabel(`Tổng: ${totalLength.toFixed(2)} m`, centerLocal);
  rulerGroup.add(polylineTotalLabel);
}



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

    rendererRef.domElement.addEventListener('mousemove', (event) => {
      if (!rulerEnabled) return;
    
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef);
    
      // === (1) Cập nhật kéo sphere nếu đang drag
      if (draggingSphere) {
        const intersects = raycaster.intersectObjects(
          collectVisibleMeshes(rulerGroup.parent, rulerGroup), true
        );
        if (intersects.length > 0) {
          const hit = intersects[0].point.clone();
          const localPos = hit.sub(originPoint);
      
          draggingSphere.position.copy(localPos);
      
          const index = selectedSpheres.indexOf(draggingSphere);
          if (index !== -1) {
            points[index].copy(localPos); // 👈 đây là dòng cực kỳ quan trọng
          }
      
          updateAllMeasurements(); // update tam giác
          if (points.length >= 3 && polylineLines.length > 0) {
            updatePolylineDisplay(); // update tổng chiều dài
          }
        }
        return;
      }
      
    
      // === (2) Hover highlight sphere
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
    
      // === (3) Preview line (chỉ khi đang đo)
      if (points.length > 0 && originPoint && !finalized) {
        const intersects = raycaster.intersectObjects(
          collectVisibleMeshes(rulerGroup.parent, rulerGroup), true
        );
        if (intersects.length === 0) return;
    
        const hit = intersects[0].point.clone();
        const localStart = points[points.length - 1].clone();
        const localEnd = hit.clone().sub(originPoint);
    
        if (!previewLine) {
          previewLine = drawMeasureLine(localStart, localEnd, 0.05, rulerGroup);
        } else {
          updateLineTransform(previewLine.mesh, localStart, localEnd);
        }
    
        const mid = localStart.clone().lerp(localEnd, 0.5);
        const distance = localStart.clone().add(originPoint).distanceTo(hit);
    
        if (!previewLabel) {
          previewLabel = createLabel(`${distance.toFixed(2)} m`, mid);
        } else {
          updateLabel(previewLabel, `${distance.toFixed(2)} m`, mid);
        }
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

    rendererRef.domElement.addEventListener("contextmenu", (event) => {
      if (!rulerEnabled) return;
      event.preventDefault();

      if (points.length === 1 && selectedSpheres.length === 1) {
        const sphere = selectedSpheres[0];
        rulerGroup.remove(sphere);
        allSpheres = allSpheres.filter(s => s !== sphere);

        if (previewLine?.mesh) {
          rulerGroup.remove(previewLine.mesh);
          previewLine.mesh.geometry?.dispose?.();
          previewLine.mesh.material?.dispose?.();
        }
        previewLine = null;

        if (previewLabel) {
          rulerGroup.remove(previewLabel);
          previewLabel = null;
        }

        points = [];
        selectedSpheres = [];
        return;
      }

      if (points.length === 2 && selectedSpheres.length === 2) {
        const p1 = selectedSpheres[0];
        const p2 = selectedSpheres[1];

        const measurement = drawRightTriangle(p1, p2);
        measurements.push(measurement);

        if (previewLine1) {
          rulerGroup.remove(previewLine1.mesh);
          previewLine1.mesh.geometry.dispose();
          if (previewLine1.mesh.material.dispose) previewLine1.mesh.material.dispose();
          previewLine1 = null;
        }

        if (previewLabel1) {
          rulerGroup.remove(previewLabel1);
          previewLabel1 = null;
        }

        if (previewLine) {
          if (previewLine.mesh) {
            rulerGroup.remove(previewLine.mesh);
            previewLine.mesh.geometry?.dispose?.();
            previewLine.mesh.material?.dispose?.();
          }
          previewLine = null;
        }

        if (previewLabel) {
          rulerGroup.remove(previewLabel);
          previewLabel = null;
        }

        points = [];
        selectedSpheres = [];

        p1.raycast = THREE.Mesh.prototype.raycast;
        p2.raycast = THREE.Mesh.prototype.raycast;
        return;
      }

      if (points.length >= 3) {
        if (polygonMesh) rulerGroup.remove(polygonMesh);
        if (polygonAreaLabel) rulerGroup.remove(polygonAreaLabel);
      
        finalizePolylineMeasurement(points);
        finalized = true;
      
        updatePolylineDisplay(); // ✅ thêm dòng này vào đây
      
        if (previewLine?.mesh) {
          rulerGroup.remove(previewLine.mesh);
          previewLine.mesh.geometry?.dispose?.();
          previewLine.mesh.material?.dispose?.();
          previewLine = null;
        }
        if (previewLabel) {
          rulerGroup.remove(previewLabel);
          previewLabel = null;
        }
      }
      
    });

    clickHandlersRegistered = true;
  }
}

function computeCentroid(worldPoints) {
  const sum = worldPoints.reduce((acc, p) => acc.add(p), new THREE.Vector3());
  return sum.divideScalar(worldPoints.length);
}

function onMouseClick(event, scene) {
  if (!rulerEnabled || event.button !== 0 || finalized) return;

  updatePreviewLine({ clientX: event.clientX, clientY: event.clientY });
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, cameraRef);

  const intersects = raycaster.intersectObjects(collectVisibleMeshes(scene, rulerGroup), true);
  if (intersects.length === 0) return;

  const worldPoint = intersects[0].point.clone();
  if (!originPoint) {
    originPoint = worldPoint.clone();
    rulerGroup.position.copy(originPoint);
  }

  const localPoint = worldPoint.clone().sub(originPoint);
  const sphere = createSphere(localPoint);
  rulerGroup.add(sphere);
  points.push(localPoint);
  selectedSpheres.push(sphere);
  allSpheres.push(sphere);

  if (points.length >= 2 && previewLine) {
    previewLine1 = previewLine;
    previewLabel1 = previewLabel;
    previewLine = null;
    previewLabel = null;
  }
}


function animateLabels() {
  requestAnimationFrame(animateLabels);
  updateSphereScales(allSpheres, cameraRef);
  updateAllLineScales(cameraRef);
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
  cylinder.userData.isPolyline = true; // đánh dấu line là polyline

  if (group) group.add(cylinder);
  return { mesh: cylinder };
}


function updateLineTransform(cylinder, p1, p2) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();

  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), direction.clone().normalize()
  );

  // === 🔁 THAY geometry mới (rất quan trọng)
  const radius = cylinder.geometry.parameters.radiusTop || 0.05;
  const newGeometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true);

  cylinder.geometry.dispose();
  cylinder.geometry = newGeometry;

  // Gán lại vị trí và hướng
  cylinder.position.copy(midpoint);
  cylinder.quaternion.copy(quat);

  // Cập nhật lại shader repeat nếu có
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
  if (!cameraRef) return null;

  const worldPos = localPosition.clone().add(originPoint || new THREE.Vector3());
  const distance = cameraRef.position.distanceTo(worldPos);
  const radius = THREE.MathUtils.clamp(Math.log10(distance + 1) * 0.1, 0.05, 0.5);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false,
    })
  );
  sphere.raycast = THREE.Mesh.prototype.raycast; // ✅ giữ raycast

  sphere.position.copy(localPosition);
  sphere.userData.isRulerSphere = true;

  // ✅ Quan trọng: đảm bảo được raycast
  sphere.raycast = THREE.Mesh.prototype.raycast;

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
  label.userData.isPolylineLabel = true; // 👈 flag để sau này tìm xoá

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

  const rightAngleMesh = drawRightAngleSymbol(p1, p2, p3);
  rulerGroup.add(rightAngleMesh);

  return {
    p1: p1Sphere,
    p2: p2Sphere,
    lines: [line1, line2, line3],
    labels: [label1, label2, label3],
    leaders: [leader1, leader2, leader3],
    rightAngleMesh
  };
}

export function drawRightAngleSymbol(p1, p2, p3) {
  const dir1 = new THREE.Vector3().subVectors(p1, p3);
  const dir2 = new THREE.Vector3().subVectors(p2, p3);

  const len1 = dir1.length();
  const len2 = dir2.length();

  // Nếu cạnh quá ngắn (dưới 1m) thì không vẽ
  const minLength = 0.5;
  if (len1 < minLength || len2 < minLength) return null;

  const n1 = dir1.clone().normalize();
  const n2 = dir2.clone().normalize();

  const scale = Math.min(len1, len2) * 0.2;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(scale, 0);
  shape.lineTo(scale, scale);
  shape.lineTo(0, scale);
  shape.lineTo(0, 0);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa500,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const zAxis = new THREE.Vector3().crossVectors(n2, n1).normalize();
  const xAxis = n1;
  const yAxis = n2;

  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  matrix.setPosition(p3);
  mesh.applyMatrix4(matrix);

  return mesh;
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
    if (m.rightAngleMesh) {
      rulerGroup.remove(m.rightAngleMesh);
      m.rightAngleMesh.geometry.dispose();
      m.rightAngleMesh.material.dispose();
      m.rightAngleMesh = null;
    }
    
    const newRightAngle = drawRightAngleSymbol(p1, p2, p3);
    if (newRightAngle) {
      rulerGroup.add(newRightAngle);
      m.rightAngleMesh = newRightAngle;
    }
    
    
  }
}

function updateLeaderLine(line, start, end) {
  const points = [start, end];
  line.geometry.setFromPoints(points);
}

function updatePreviewLine(event) {
  if (!rulerEnabled || points.length === 0) return;

  const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera({ x: mouseX, y: mouseY }, cameraRef);

  const intersects = raycaster.intersectObjects(
    collectVisibleMeshes(rulerGroup.parent, rulerGroup), true
  );
  if (intersects.length === 0) return;

  const hit = intersects[0].point.clone();
  const localStart = points[points.length - 1].clone();
  const localEnd = hit.clone().sub(originPoint);

  if (!previewLine) {
    previewLine = drawMeasureLine(localStart, localEnd, 0.05, rulerGroup);
  } else {
    updateLineTransform(previewLine.mesh, localStart, localEnd);
  }

  const mid = localStart.clone().lerp(localEnd, 0.5);
  const distance = localStart.clone().add(originPoint).distanceTo(hit);

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