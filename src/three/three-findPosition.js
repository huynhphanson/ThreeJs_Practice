import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { convertToECEF } from './three-convertCoor';
import { zoomAt } from './three-controls';

let pointCounter = 0;
const tempObjects = []; // các đối tượng tạm cần xóa
let btn = null;

export function findPosition(scene, camera, controls) {
  const searchInput = document.querySelector('.search-input');
  const rawInput = searchInput.value.trim();

  // Inject CSS cho label
  if (!document.querySelector('#css-label-style')) {
    const style = document.createElement('style');
    style.id = 'css-label-style';
    style.textContent = `
      .label {
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        font-family: 'Segoe UI', sans-serif;
        pointer-events: none;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  const showTooltip = (msg) => {
    const panel = document.querySelector('#search-panel');
    if (!panel) return;

    let tooltip = panel.querySelector('.tooltip-error');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'tooltip-error';
      tooltip.style.cssText = `
        position: absolute;
        top: 8px; right: 12px;
        background: rgba(255,160,60,0.9);
        color: #fff; padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: 'Segoe UI', 'Roboto', sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 999;
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: auto;
      `;
      panel.appendChild(tooltip);
    }

    tooltip.textContent = msg;
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });

    clearTimeout(tooltip._timeout);
    tooltip._timeout = setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(-10px)';
    }, 3000);
  };

  // Validate
  if (!rawInput) return showTooltip("Nhập X,Y hoặc X,Y,Z[,Desc].");
  const parts = rawInput.replace(/\s/g, '').split(",");
  if (parts.length < 2 || parts.length > 4) return showTooltip("Nhập tối đa X,Y,Z,Desc.");

  const coords = parts.slice(0, 3).map(Number);
  if (coords.some(val => isNaN(val)))
    return showTooltip("Tọa độ không hợp lệ.");
  if (coords.some(val => val < 0))
    return showTooltip("Tọa độ không được âm.");

  const [x, y, z = 10] = coords;
  let desc = parts[3]?.trim();
  if (!desc) {
    desc = String.fromCharCode(65 + (pointCounter % 26));
  }

  pointCounter++;

  const target = convertToECEF(x, y, z);

  // Tạo điểm tương tác
  const point = new THREE.Mesh(
    new THREE.SphereGeometry(.2),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  point.position.copy(target);
  point.name = desc;
  point.userData.type = 'point';
  scene.add(point);

  // Tạo label gắn riêng vào scene (không add vào point)
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label';
  labelDiv.textContent = desc;
  // Cho phép tương tác DOM nhãn
  labelDiv.style.pointerEvents = 'auto';
  labelDiv.style.cursor = 'pointer';
  // Gắn sự kiện double click
  labelDiv.addEventListener('dblclick', (e) => {
    e.stopPropagation(); // Ngăn sự kiện lan ra canvas

    // Zoom đến vị trí point
    const direction = camera.position.clone().sub(target).normalize();
    const newPos = target.clone().add(direction.multiplyScalar(20));
    zoomAt(target, newPos, camera, controls);
  });
  const label = new CSS2DObject(labelDiv);
  // Tính offset theo hướng ngược camera để tránh label đè lên point
  const camDir = camera.getWorldDirection(new THREE.Vector3());
  const labelOffset = camDir.multiplyScalar(-0.5).add(new THREE.Vector3(0, 0.5, 0));
  label.position.copy(target.clone().add(labelOffset));
  scene.add(label);

  // Zoom camera
  const direction = camera.position.clone().sub(target).normalize();
  const offset = direction.multiplyScalar(20);
  const newPos = target.clone().add(offset);
  zoomAt(target, newPos, camera, controls);


  registerTempObject(point);
  registerTempObject(label);

}

export function registerTempObject(obj) {
  tempObjects.push(obj);
  if (!btn && !document.getElementById('close-temp-points')) {
    createCloseButton();
  }
  if (btn) btn.style.display = 'flex';
}

function createCloseButton() {
  
  btn = document.createElement('div');
  btn.id = 'close-temp-points';
  btn.classList.add('circle-button');
  btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

  btn.addEventListener('click', () => {
    tempObjects.forEach(obj => obj.parent?.remove(obj));
    tempObjects.length = 0;
    btn.remove();
    btn = null;
  });

  document.body.appendChild(btn);
}