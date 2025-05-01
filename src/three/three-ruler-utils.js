// three-ruler-utils.js
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/Addons.js';

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

  if (/^Tổng:/.test(text) || /^Diện tích:/.test(text)) {
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