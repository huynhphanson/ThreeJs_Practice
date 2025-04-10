import * as THREE from 'three';
import { modelGroups } from "../../src/three/three-gltfModel";

const iconButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel')
const layerContent = document.getElementById('layerContent');


// Lọc qua các nút, ấn nút nào sẽ hiện bảng thông tin lên
iconButtons.forEach(button => {
  button.addEventListener('click', () => {
    const panelId = button.getAttribute('data-panel');
    const panel = document.getElementById(panelId);
    panels.forEach(p => p.classList.remove('active'));
    if (panel) {
      panel.classList.add('active');
    } 
  })
})

// Export function để khi click ra ngoài màn hình (ngoại trùng vùng model) thì bảng thuộc tính sẽ tắt, cần phải export để raycaster clearInfoTable vào trong main.js
export function clearInfoTable (event, raycaster, scene, camera) {
  
  const isClickInIcon = event.target.closest(".icon-bar-right");
  const isClickInPanel = event.target.closest(".panel");

  const coords = new THREE.Vector3();
  coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  // Bắn tia raycaster từ camera
  raycaster.setFromCamera(coords, camera);

  // Kiểm tra xem có chạm object nào không
  const intersects = raycaster.intersectObjects(scene.children, true); // true = tìm sâu trong Group

  const isClickOnModel = intersects.length > 0;

  if (!isClickInIcon && !isClickInPanel && !isClickOnModel) {
    panels.forEach(p => p.classList.remove("active"));
  }
}

// Lọc qua các lớp đối tượng trong three-gltfModel, sau đó tạo danh sách trong layer và tính năng bật tắt
let layerHTML = ''; // Khởi tạo chuỗi HTML

Object.keys(modelGroups).forEach(groupName => {
  const id = `toggle-${groupName}`;
  // Thêm vào chuỗi HTML thay vì ghi đè
  layerHTML += `
  <div class="info-row">
    <input type="checkbox" id="${id}" checked />
    <label class="info-value" for="${id}">${groupName.charAt(0).toUpperCase() + groupName.slice(1)}</label>
  </div>`;

});

// Cập nhật toàn bộ nội dung của layerContent chỉ một lần
layerContent.innerHTML = layerHTML;

// Sử dụng setTimeout để trì hoãn việc thêm sự kiện cho các checkbox
setTimeout(() => {
  Object.keys(modelGroups).forEach(groupName => {
    const id = `toggle-${groupName}`;
    
    const checkbox = document.getElementById(id);
    if (checkbox) {
      // Sự kiện bật/tắt lớp
      checkbox.addEventListener('change', (e) => {
        const visible = e.target.checked;
        toggleLayerVisibility(groupName, visible);
      });
    }
  });
}, 0); // Trì hoãn đến vòng lặp tiếp theo để đảm bảo các phần tử đã có trong DOM

function toggleLayerVisibility(groupName, visible) {
  const group = modelGroups[groupName];
  group.forEach(obj => {
    if (obj && obj.visible !== undefined) {
      obj.visible = visible;
    }
  });
}