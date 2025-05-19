import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { startLoop } from './three/three-animate.js';
import { effectFXAA } from './three/three-outline.js';
import { findProjectPosition, zoomTarget, resizeScreen } from './three/three-controls.js';
import { clearInfoTable, isClickOnUI } from '/src/utils/ui-main.js';
import { initCesium } from './cesium/cesium-init.js';
import { loadGLTFModel } from './three/three-gltfModel.js';
import { load3dTilesModel } from './three/three-3dtilesModel.js';
import { setViewer } from './cesium/cesium-viewer.js';
import { cursorCoor } from './three/three-cursor-coordinates.js';
import { initRuler, activateRuler, deactivateRuler } from './three/three-ruler.js';
import { initRulerArea, activateRulerArea, deactivateRulerArea } from './three/three-ruler-area.js';
import { renderLayerContent } from './utils/ui-renderLayer.js';
import { initProjectInfo } from './utils/projectInfo.js';
import { modelGroups } from './three/three-modelGroups.js';
import { drawPolylineFromCSV } from './three/three-drawPol.js';
import { registerClickHandler } from './three/three-registerClick.js';
import { findPosition } from './three/three-findPosition.js';

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
const tilesSCPathIn = 'https://tsdev.host/PROJECT_T27/TL8B/assets/models/3d-tiles/scIn/tileset.json';
const tilesSCPathOut = 'https://tsdev.host/PROJECT_T27/TL8B/assets/models/3d-tiles/scOut/tileset.json';
const gltfPathSCBridge = './assets/models/glb/sChoBridge.glb';
const gltfPathSCHouse = './assets/models/glb/sChoHouse.glb';
const gltfPathSCDuongDan = './assets/models/glb/sChoDuongDan.glb';
const gltfPathSCBoundary = './assets/models/glb/sChoGPMB.glb'
const centerSCLinePath = './assets/csv/SongCho_CenterLine.csv'

// Path Sông Giang
const tilesSGPathIn = 'https://tsdev.host/PROJECT_T27/TL8B/assets/models/3d-tiles/sgIn/tileset.json';
const tilesSGPathOut = 'https://tsdev.host/PROJECT_T27/TL8B/assets/models/3d-tiles/sgOut/tileset.json';
const gltfPathSGBoundary = './assets/models/glb/sGiangGPMB.glb'
const centerSGLinePath = './assets/csv/SongGiang_CenterLine.csv'

labelRenderer.domElement.style.display = 'none';
renderer.domElement.style.visibility = 'hidden';
document.getElementById('loading-overlay').style.display = 'flex';

Promise.all([
  // HIỆN TRẠNG SÔNG CHÒ 3D TILES
  load3dTilesModel(tilesSCPathIn, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG CHÒ/PHẠM VI TRONG RANH', true),
  load3dTilesModel(tilesSCPathOut, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG CHÒ/PHẠM VI NGOÀI RANH'),
  // HIỆN TRẠNG SÔNG GIANG 3D TILES
  load3dTilesModel(tilesSGPathIn, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG GIANG/PHẠM VI TRONG RANH'),
  load3dTilesModel(tilesSGPathOut, camera, renderer, controls, scene, 'HIỆN TRẠNG SÔNG GIANG/PHẠM VI NGOÀI RANH'),


  // HIỆN TRẠNG SÔNG CHÒ GLTF
  // loadGLTFModel(gltfPathSCHouse, scene, camera, controls, 'HIỆN TRẠNG SÔNG CHÒ/MÔ HÌNH NHÀ',false, false),
  // loadGLTFModel(gltfPathSCBoundary, scene, camera, controls, 'HIỆN TRẠNG SÔNG CHÒ/RANH GPMB'),
  // drawPolylineFromCSV(centerSCLinePath, scene, camera, controls, 'HIỆN TRẠNG SÔNG CHÒ/TIM KHẢO SÁT', 40, 100),

  // HIỆN TRẠNG SÔNG GIANG GLTF
  // loadGLTFModel(gltfPathSGBoundary, scene, camera, controls, 'HIỆN TRẠNG SÔNG GIANG/RANH GPMB'),
  // drawPolylineFromCSV(centerSGLinePath, scene, camera, controls, 'HIỆN TRẠNG SÔNG GIANG/TIM KHẢO SÁT', 10, 100),

  // Mô hình thiết kế SÔNG CHÒ
  // loadGLTFModel(gltfPathSCBridge, scene, camera, controls, 'MÔ HÌNH CẦU SÔNG CHÒ'),
  // loadGLTFModel(gltfPathSCDuongDan, scene, camera, controls, 'MÔ HÌNH ĐƯỜNG DẪN'),

  // Vòng lặp
  startLoop(scene, camera, controls, renderer, labelRenderer, composer, tilesModels, cesiumViewer)
]).then(([inSCModel, outSCModel, inSGModel, outSGModel]) => {
  tilesModels.set('inSG', inSGModel);
  tilesModels.set('outSG', outSGModel);
  tilesModels.set('inSC', inSCModel);
  tilesModels.set('outSC', outSCModel);

  renderLayerContent(modelGroups, camera, controls);
  document.getElementById('loading-overlay').style.display = 'none';
  renderer.domElement.style.visibility = 'visible';
  labelRenderer.domElement.style.display = 'block';

});

startLoop(scene, camera, controls, renderer, labelRenderer, composer, tilesModels, cesiumViewer);

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
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.btn-search');

const triggerSearch = () => findPosition(scene, camera, controls);

searchBtn.addEventListener('click', triggerSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerSearch();
});

// ProjectoPosition
const oriBtn = document.querySelector('.btn-project-location');
oriBtn.addEventListener('click', () => findProjectPosition(camera, controls))
// ZoomTarget
window.addEventListener('dblclick', (event) => {
  if (isClickOnUI(event)) return;
  zoomTarget(event, raycaster, scene, camera, controls)
});
// Click Model Event
const infoContent = document.getElementById('infoContent');
registerClickHandler(scene, camera, infoContent); // ✅ đúng thứ tự



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
  initProjectInfo();

  if (infoPanelActive) {
    infoBtn.classList.add('i-active');
  } else {
    infoBtn.classList.remove('i-active');
  }
});
