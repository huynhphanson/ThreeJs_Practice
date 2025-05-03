import * as THREE from 'three';


const iconButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel')

// Nếu click vào vùng UI sẽ không kích hoạt các chức năng khác
export function isClickOnUI(event) {
  const uiAreas = ['.sidenav-right', '.info-panel']; // các vùng muốn bỏ qua
  return uiAreas.some(selector => {
    const el = document.querySelector(selector);
    return el && el.contains(event.target);
  });
}


// Lọc qua các nút, ấn nút nào sẽ hiện bảng thông tin lên
iconButtons.forEach(button => {
  button.addEventListener('click', () => {
    iconButtons.forEach(btn => btn.classList.remove('i-active'));
    button.classList.add('i-active');

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
    iconButtons.forEach(btn => btn.classList.remove('i-active'));
  }
};

// Layer: Lọc qua các lớp đối tượng trong three-gltfModel, sau đó tạo danh sách trong layer và tính năng bật tắt
export function renderLayerContent(modelGroups) {
  const layerContent = document.getElementById('layerContent');
  layerContent.innerHTML = ''; // Xóa cũ

  const parentGroups = {};

  // Tách nhóm cha/con từ groupName kiểu 'Tiles3d/In'
  Object.keys(modelGroups).forEach(fullName => {
    const [parent, child] = fullName.split('/');
    if (!parentGroups[parent]) parentGroups[parent] = {};
    parentGroups[parent][child] = modelGroups[fullName];
  });

  Object.entries(parentGroups).forEach(([parent, children]) => {
    // Tạo nhóm cha
    const groupDiv = document.createElement('div');
    groupDiv.className = 'layer-group';

    const row = document.createElement('div');
    row.className = 'layer-row';

    const toggle = document.createElement('span');
    toggle.className = 'toggle-icon';
    toggle.textContent = '▶';

    const parentCheckbox = document.createElement('input');
    parentCheckbox.type = 'checkbox';
    parentCheckbox.checked = true;

    const parentLabel = document.createElement('label');
    parentLabel.textContent = parent;

    row.appendChild(toggle);
    row.appendChild(parentCheckbox);
    row.appendChild(parentLabel);
    groupDiv.appendChild(row);

    // Nhóm con
    const childContainer = document.createElement('div');
    childContainer.className = 'child-group'; // Mặc định ẩn

    Object.entries(children).forEach(([childName, groupObjs]) => {
      const childRow = document.createElement('div');
      childRow.className = 'layer-row';

      const childCheckbox = document.createElement('input');
      childCheckbox.type = 'checkbox';
      childCheckbox.checked = true;

      const childLabel = document.createElement('label');
      childLabel.textContent = childName;

      childCheckbox.addEventListener('change', () => {
        groupObjs.forEach(obj => obj.visible = childCheckbox.checked);
        syncParentCheckbox(); // cập nhật lại cha
      });

      childRow.appendChild(document.createElement('span')); // icon trống
      childRow.appendChild(childCheckbox);
      childRow.appendChild(childLabel);
      childContainer.appendChild(childRow);
    });

    groupDiv.appendChild(childContainer);
    layerContent.appendChild(groupDiv);

    // Sự kiện xổ/mở
    toggle.addEventListener('click', () => {
      const isOpen = childContainer.classList.toggle('open');
      toggle.textContent = isOpen ? '▼' : '▶';
    });

    // Bật/tắt tất cả con
    parentCheckbox.addEventListener('change', () => {
      const checked = parentCheckbox.checked;
      childContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.checked = checked;
        cb.dispatchEvent(new Event('change'));
      });
    });

    // Cập nhật trạng thái checkbox cha khi con thay đổi
    function syncParentCheckbox() {
      const all = [...childContainer.querySelectorAll('input[type=checkbox]')];
      const allChecked = all.every(cb => cb.checked);
      const someChecked = all.some(cb => cb.checked);
      parentCheckbox.checked = allChecked;
      parentCheckbox.indeterminate = !allChecked && someChecked;
    }
  });
}
