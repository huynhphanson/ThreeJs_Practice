import * as THREE from 'three';
import { convertTo9217 } from "./three-convertCoor";


export function cursorCoor (raycaster, scene, camera, container) {
  const divCoor = document.createElement('div');
  container.appendChild(divCoor);

  window.addEventListener('mousemove', (event) => {
    const coords = new THREE.Vector3();
    coords.x = (event.clientX / window.innerWidth) * 2 - 1;
    coords.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(coords, camera);

    const visibleObjects = scene.children.filter(obj => obj.visible);
    const intersects = raycaster.intersectObjects(visibleObjects);
    if (intersects.length > 0) {
      const p = intersects[0].point;
      const pEPSG = convertTo9217(p.x, p.y, p.z);

      const coordinate = {
        x: pEPSG.x.toFixed(3),
        y: pEPSG.y.toFixed(3),
        z: pEPSG.z.toFixed(3)
      };
      

      divCoor.innerHTML = `
      <div>VN2000-108°15'-3°</div>
      <div>X(E):${coordinate.x}</div>
      <div>Y(N):${coordinate.y}</div>
      <div>Z(H):${coordinate.z}</div>`;

      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });
}
