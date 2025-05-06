import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { animateLoop } from './three/three-animate.js';
import { effectFXAA } from './three/three-outline.js';
import { findPosition, findProjectPosition, zoomTarget, resizeScreen } from './three/three-controls.js';
import { clearInfoTable } from '../src/utils/ui-main.js';
import { initCesium } from './cesium/cesium-init.js';
import { syncThreeToCesium } from './cesium/cesium-syncThree.js';
import { loadGLTFModel } from './three/three-gltfModel.js';
import { load3dTilesModel } from './three/three-3dtilesModel.js';
import { setViewer } from './cesium/cesium-viewer.js';
import { cursorCoor } from './three/three-cursor-coordinates.js';
import { initRuler, activateRuler, deactivateRuler } from './three/three-ruler.js';
import { initRulerArea, activateRulerArea, deactivateRulerArea } from './three/three-ruler-area.js';
import { isClickOnUI } from '../src/utils/ui-main.js';
import { renderLayerContent } from './utils/ui-renderLayer.js';
import { initProjectInfo } from './utils/projectInfo.js';
import { modelGroups } from './three/three-modelGroups.js';
import { drawPolylineFromCSV } from './three/three-drawPol.js';

/* Cesium Init */
export const cesiumViewer = initCesium();
setViewer(cesiumViewer);

/* THREE Init */
// Three
const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();
const raycaster = new THREE.Raycaster();
const threeContainer = document.querySelector('.three-container');
threeContainer.appendChild(renderer.domElement);
threeContainer.appendChild(labelRenderer.domElement);

/* Load Model */

const tilesModels = new Map();
// Path Sông Chò
const tilesSCPathIn = '../resources/models/3d-tiles/scIn/tileset.json'
const tilesSCPathOut = '../resources/models/3d-tiles/scOut/tileset.json'
const gltfPathSCBridge = '../resources/models/glb/sChoBridge.glb';
const gltfPathSCHouse = '../resources/models/glb/sChoHouse.glb';
const gltfPathSCDuongDan = '../resources/models/glb/sChoDuongDan.glb';
const gltfPathSCBoundary = '../resources/models/glb/sChoGPMB.glb'
const centerSCLinePath = '../resources/csv/SongCho_CenterLine.csv'

// Path Sông Giang
const tilesSGPathIn = '../resources/models/3d-tiles/sgIn/tileset.json'
const tilesSGPathOut = '../resources/models/3d-tiles/sgOut/tileset.json'
const gltfPathSGBoundary = '../resources/models/glb/sGiangGPMB.glb'
const centerSGLinePath = '../resources/csv/SongGiang_CenterLine.csv'

labelRenderer.domElement.style.display = 'none';
renderer.domElement.style.visibility = 'hidden';
document.getElementById('loading-overlay').style.display = 'flex';

Promise.all([
  // HIỆN TRẠNG SÔNG CHÒ 3D TILES
  load3dTilesModel(tilesSCPathIn, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG CHÒ/PHẠM VI TRONG RANH'),
  load3dTilesModel(tilesSCPathOut, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG CHÒ/PHẠM VI NGOÀI RANH'),
  // HIỆN TRẠNG SÔNG GIANG 3D TILES
  load3dTilesModel(tilesSGPathIn, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG GIANG/PHẠM VI TRONG RANH'),
  load3dTilesModel(tilesSGPathOut, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG GIANG/PHẠM VI NGOÀI RANH'),

  // HIỆN TRẠNG SÔNG CHÒ GLTF
  loadGLTFModel(gltfPathSCHouse, scene, camera, controls, 'HIỆN TRẠNG SÔNG CHÒ/MÔ HÌNH NHÀ'),
  loadGLTFModel(gltfPathSCBoundary, scene, camera, controls, 'HIỆN TRẠNG SÔNG CHÒ/RANH GPMB'),
  drawPolylineFromCSV(centerSCLinePath, scene, camera, 'HIỆN TRẠNG SÔNG CHÒ/TIM KHẢO SÁT', 40, 100),

  // HIỆN TRẠNG SÔNG GIANG GLTF
  loadGLTFModel(gltfPathSGBoundary, scene, camera, controls, 'HIỆN TRẠNG SÔNG GIANG/RANH GPMB'),
  drawPolylineFromCSV(centerSGLinePath, scene, camera, 'HIỆN TRẠNG SÔNG GIANG/TIM KHẢO SÁT', 10, 100),

  // Mô hình thiết kế SÔNG CHÒ
  loadGLTFModel(gltfPathSCBridge, scene, camera, controls, 'MÔ HÌNH CẦU SÔNG CHÒ'),
  loadGLTFModel(gltfPathSCDuongDan, scene, camera, controls, 'MÔ HÌNH ĐƯỜNG DẪN'),
]).then(([inSCModel, outSCModel, inSGModel, outSGModel]) => {
  tilesModels.set('inSG', inSGModel);
  tilesModels.set('outSG', outSGModel);
  tilesModels.set('inSC', inSCModel);
  tilesModels.set('outSC', outSCModel);

  renderLayerContent(modelGroups, camera, controls);
  document.getElementById('loading-overlay').style.display = 'none';
  renderer.domElement.style.visibility = 'visible';
  labelRenderer.domElement.style.display = 'block';

  loop();
});

/* Loop */
function loop () {
	requestAnimationFrame(loop);
  composer.render();
	labelRenderer.render(scene, camera);
	
	animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
	tilesModels.forEach(model => {
    model.tilesRenderer.update();
  });
  scene.traverse(obj => {
    if (obj.userData.updateLabelVisibility) {
      obj.userData.updateLabelVisibility();
    }
  });
  
	try {
		syncThreeToCesium(camera, controls, cesiumViewer);
    cesiumViewer.render();
	} catch (error) {
		console.error("Error syncing cameras:", error);
	}
}
loop();

/* window events */
window.addEventListener('beforeunload', () => {
  tilesModels.forEach(model => {
    model.dispose();
  });
});

window.addEventListener('click', (event) => clearInfoTable(event, raycaster, scene, camera));
window.addEventListener('resize', () => resizeScreen(camera, renderer, labelRenderer, effectFXAA, composer));


/* FUNCTIONS */
// Search
const searchBtn = document.querySelector('.btn-search'); // find position
searchBtn.addEventListener('click', () => findPosition(scene, camera, controls));
// ProjectoPosition
const oriBtn = document.querySelector('.btn-project-location'); // find project position
oriBtn.addEventListener('click', () => findProjectPosition(camera, controls))
// ZoomTarget
window.addEventListener('dblclick', (event) => {
  if (isClickOnUI(event)) return;
  zoomTarget(event, raycaster, scene, camera, controls)
}); // zoom target position

// Cursor Coordinates
const sidenavRightBottom = document.querySelector('.sidenav-right-bottom');
cursorCoor(raycaster, scene, camera, sidenavRightBottom);

// Ruler
const rulerBtn = document.querySelector('.fa-ruler');
let rulerInitialized = false;
let rulerActive = false;

rulerBtn.addEventListener('click', () => {
  rulerActive = !rulerActive;

  // Tắt area nếu đang bật
  if (areaActive) {
    areaActive = false;
    deactivateRulerArea();
    areaBtn.classList.remove('i-active');
  }

  if (rulerActive) {
    if (!rulerInitialized) {
      initRuler(scene, camera, renderer, controls);
      rulerInitialized = true;
    }
    activateRuler();
    rulerBtn.classList.add('i-active');
  } else {
    deactivateRuler();
    rulerBtn.classList.remove('i-active');
  }
});


// Ruler Area
const areaBtn = document.querySelector('.fa-draw-polygon');
let areaInitialized = false;
let areaActive = false;

areaBtn.addEventListener('click', () => {
  areaActive = !areaActive;

  // Tắt ruler nếu đang bật
  if (rulerActive) {
    rulerActive = false;
    deactivateRuler();
    rulerBtn.classList.remove('i-active');
  }

  if (areaActive) {
    if (!areaInitialized) {
      initRulerArea(scene, camera, renderer, controls);
      areaInitialized = true;
    }
    activateRulerArea();
    areaBtn.classList.add('i-active');
  } else {
    deactivateRulerArea();
    areaBtn.classList.remove('i-active');
  }
});

// Project Infomation
const infoBtn = document.querySelector('.info-project-btn');
let infoPanelActive = false;
infoBtn.addEventListener('click', () => {
  infoPanelActive = !infoPanelActive;
  initProjectInfo(); // 👉 tự xử lý hiển thị hoặc ẩn

  if (infoPanelActive) {
    infoBtn.classList.add('i-active');
  } else {
    infoBtn.classList.remove('i-active');
  }
});
