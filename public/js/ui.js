import { modelGroups } from "../../src/three/three-gltfModel";

const iconButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel')

iconButtons.forEach(button => {
  button.addEventListener('click', () => {
    const panelId = button.getAttribute('data-panel');
    console.log(panelId)
    const panel = document.getElementById(panelId);
    panels.forEach(p => p.classList.remove('active'));
    if (panel) {
      panel.classList.add('active');
    } 
  })
})

// Ẩn panel khi nhấn ra ngoài
document.addEventListener("click", (event) => {
  if (!event.target.closest(".icon-bar-right") && !event.target.closest(".panel")) {
      panels.forEach(p => p.classList.remove("active"));
  }
});

document.getElementById('toggleBuildings').addEventListener('change', (e) => {
  console.log(e.target.checked);
  modelGroups.buildings.forEach(model => model.visible = e.target.checked);
});
document.getElementById('toggleSurface').addEventListener('change', (e) => {
  console.log(e.target.checked);
  modelGroups.surface.forEach(model => model.visible = e.target.checked);
});