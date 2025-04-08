import * as THREE from 'three';
import { modelGroups } from "../../src/three/three-gltfModel";

const iconButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel')

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

document.getElementById('toggleBuildings').addEventListener('change', (e) => {
  modelGroups.buildings.forEach(model => model.visible = e.target.checked);
});
document.getElementById('toggleSurface').addEventListener('change', (e) => {
  modelGroups.surface.forEach(model => model.visible = e.target.checked);
});