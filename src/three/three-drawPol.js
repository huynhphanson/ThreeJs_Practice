import * as THREE from 'three';
import { convertToECEF } from './three-convertCoor';
import { addToModelGroup } from './three-modelGroups';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const descriptionList = [];

export async function drawPolylineFromCSV(
  url,
  scene,
  camera,
  name = 'Polyline',
  zOffset = 0,
  maxDistance = 700
) {
  // Thêm CSS label nếu chưa có
  if (!document.getElementById('three-label-style')) {
    const style = document.createElement('style');
    style.id = 'three-label-style';
    style.innerHTML = `
      .label {
        white-space: nowrap;
        pointer-events: none;
        padding: 2px 6px;
        background: rgba(0, 0, 0, 0.3);
        color: white;
        font-weight: bold;
        font-size: 11px;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      /* Màu nền xanh lá cho điểm đầu/cuối */
      .label-start,
      .label-end {
        background: rgba(0, 128, 0, 0.85); /* xanh lá đậm trong suốt */
        border: 1px solid #0f0;
      }
    `;
  
    document.head.appendChild(style);
  }

  try {
    const response = await fetch(url);
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    const pointsECEF = [];
    const descriptionList = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 4) continue;

      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]) + zOffset;
      const desc = parts[4]?.trim() || '';

      const posECEF = convertToECEF(x, y, z);
      pointsECEF.push(posECEF);
      descriptionList.push(desc);
    }

    if (pointsECEF.length < 2) return;

    const origin = pointsECEF[0].clone();
    const pointsLocal = pointsECEF.map(p => p.clone().sub(origin));

    const group = new THREE.Group();
    group.name = name;
    group.position.copy(origin);
    scene.add(group);

    // Vẽ cylinder line
    for (let i = 0; i < pointsLocal.length - 1; i++) {
      const start = pointsLocal[i];
      const end = pointsLocal[i + 1];
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();

      const geom = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xa83248 });
      const mesh = new THREE.Mesh(geom, mat);

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

      addToModelGroup(name, mesh)
      group.add(mesh);
    }

    // Gắn nhãn mô tả
    for (let i = 0; i < pointsLocal.length; i++) {
      const point = pointsLocal[i];
      const desc = descriptionList[i];

      const div = document.createElement('div');
      div.className = 'label';
      div.textContent = desc;

      // 👉 GÁN CLASS ĐẶC BIỆT CHO ĐIỂM ĐẦU/CUỐI
      if (i === 0) div.classList.add('label-start');
      if (i === pointsLocal.length - 1) div.classList.add('label-end');
      
      const label = new CSS2DObject(div);
      label.position.copy(point);
      label.userData.isLabel = true; // dùng để lọc nhanh
      label.userData.originalParent = group;
      addToModelGroup(name, label);
      group.add(label);
      
    }

    // Hàm cập nhật ẩn/hiện nhãn theo camera
    const updateLabelVisibility = () => {
      group.children.forEach(obj => {
        if (obj instanceof CSS2DObject) {
          const dist = camera.position.distanceTo(obj.getWorldPosition(new THREE.Vector3()));
          obj.element.style.display = dist < maxDistance ? 'block' : 'none';
        }
      });
    };

    // Gắn vào scene để gọi lại trong render loop
    group.userData.updateLabelVisibility = updateLabelVisibility;
  } catch (err) {
    console.error('Không thể load CSV:', err);
  }
}