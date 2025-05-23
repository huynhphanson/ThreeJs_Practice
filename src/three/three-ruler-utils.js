// three-ruler-utils.js
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/Addons.js';

export const hoverableSpheres = [];

export function computeCentroid(worldPoints) {
  const sum = worldPoints.reduce((acc, p) => acc.add(p), new THREE.Vector3());
  return sum.divideScalar(worldPoints.length);
}

export function createLabel(text, position, groupIndex = null, parentGroup) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text;
  div.style.marginTop = '-1em';
  div.style.color = 'white';
  div.style.fontSize = '14px';
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  div.style.padding = '2px 6px';
  div.style.borderRadius = '4px';

  if (/^Tổng chiều dài:/.test(text) || /^Diện tích:/.test(text)) {
    div.style.backgroundColor = 'rgba(0, 200, 0, 0.85)';
    div.style.textShadow = '0 0 2px #000';
    div.style.fontWeight = 'bold';
    div.style.color = 'white';
    div.style.borderRadius = '4px';
    div.style.padding = '2px 6px';
  }

  const label = new CSS2DObject(div);
  label.userData = {
    isPolylineLabel: true,
    groupIndex,
  };
  label.position.copy(position);
  parentGroup.add(label);
  return label;
}

export function updateLabel(label, text, position) {
  if (!label || !position) return;
  label.element.innerText = text;
  label.position.copy(position);
}

export function offsetLabelAwayFromThirdPoint(p1, p2, p3, offset = 1.0) {
  const mid = p1.clone().lerp(p2, 0.5);
  const edge = p2.clone().sub(p1).normalize();
  const toThird = p3.clone().sub(mid).normalize();
  const perp = new THREE.Vector3().crossVectors(edge, toThird).normalize();
  const outward = new THREE.Vector3().crossVectors(perp, edge).normalize();
  const testDir = p3.clone().sub(mid).normalize();
  if (outward.dot(testDir) > 0) outward.negate();
  return mid.add(outward.multiplyScalar(offset));
}

export function createLeaderLine(start, end, parentGroup) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color: 0xffa500,
    depthTest: false,
    transparent: true,
    opacity: 0.6,
  });
  const line = new THREE.Line(geometry, material);
  if (parentGroup) parentGroup.add(line);
  return line;
}

export function updateLeaderLine(line, start, end) {
  const points = [start, end];
  line.geometry.setFromPoints(points);
}

export function updateLineTransform(cylinder, p1, p2) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), direction.clone().normalize()
  );
  const radius = cylinder.geometry.parameters.radiusTop || 0.05;
  const newGeometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true);
  cylinder.geometry.dispose();
  cylinder.geometry = newGeometry;
  cylinder.position.copy(midpoint);
  cylinder.quaternion.copy(quat);
  if (cylinder.material?.uniforms?.repeat) {
    cylinder.material.uniforms.repeat.value = Math.max(1, length / 10);
  }
}

export function collectVisibleMeshes(scene, excludeGroup) {
  const result = [];
  scene.traverseVisible(obj => {
    if (obj.isMesh && !isChildOfGroup(obj, excludeGroup)) result.push(obj);
  });
  return result;
}

export function isChildOfGroup(obj, group) {
  while (obj) {
    if (obj === group) return true;
    obj = obj.parent;
  }
  return false;
}

export function createMeasureLineMaterial(length) {
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

export function createSphere(localPosition, originPoint, cameraRef) {
  const worldPos = localPosition.clone().add(originPoint);
  const distance = cameraRef.position.distanceTo(worldPos);
  const radius = THREE.MathUtils.clamp(Math.log10(distance + 1) * 0.1, 0.05, 0.5);

  const material = new THREE.MeshStandardMaterial({
    color: 0xff3b3b,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new THREE.Color(0x220000),
  });

  const geometry = new THREE.IcosahedronGeometry(radius, 1); // modern look

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  mesh.userData.targetScale = 1;
  mesh.userData.currentScale = 1;
  mesh.userData.targetColor = new THREE.Color(0xff0000);
  mesh.userData.currentColor = new THREE.Color(0xff0000);
  mesh.position.copy(localPosition);

  return mesh;
}

export function drawMeasureLine(p1, p2, radius = 0.1, group = null, type = 'polyline', groupIndex = null) {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true);
  const material = createMeasureLineMaterial(length);

  material.depthTest = false;
  material.depthWrite = false;

  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.renderOrder = 999;

  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  cylinder.position.copy(midpoint);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  cylinder.userData = {
    isPolyline: true,
    type,
    groupIndex
  };

  if (group) group.add(cylinder);
  return { mesh: cylinder };
}

export function updateLineThickness(mesh, camera, min = 0.02, max = 1.0, factor = 0.002) {
  const distance = mesh.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position);
  const newRadius = THREE.MathUtils.clamp(distance * factor, min, max);
  const height = mesh.geometry.parameters.height;

  if (Math.abs(mesh.geometry.parameters.radiusTop - newRadius) < 0.001) return;

  mesh.geometry.dispose();
  mesh.geometry = new THREE.CylinderGeometry(newRadius, newRadius, height, 16, 1, true);
}

export function handleHover(mouse, camera, raycaster, spheres, renderer, isEnabled = true) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(spheres, false);
  const hovered = intersects[0]?.object ?? null;

  let isHovering = false;

  for (const sphere of spheres) {
    if (!sphere.userData) continue;

    if (sphere === hovered) {
      sphere.userData.targetScale = 1.5;
      sphere.userData.targetColor.set(0x00ff00);
      isHovering = true;
    } else {
      sphere.userData.targetScale = 1;
      sphere.userData.targetColor.set(0xff0000);
    }
  }

  if (renderer?.domElement) {
    renderer.domElement.style.cursor = isEnabled && isHovering ? 'pointer' : 'default';
  }
}
