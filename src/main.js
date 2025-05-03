import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { clearInfoTable } from '../src/utils/ui-main.js';
import { initCesium } from './cesium/cesium-init.js';
import { syncThreeToCesium } from './cesium/cesium-syncThree.js';
import { loadGLTFModel } from './three/three-gltfModel.js';
import { load3dTilesModel } from './three/three-3dtilesModel.js';
import { setViewer } from './cesium/cesium-viewer.js';
import { cursorCoor } from './three/three-cursor-coordinates.js';
import { initRuler, activateRuler, deactivateRuler } from './three/three-ruler.js';
import { initRulerArea, activateRulerArea, deactivateRulerArea } from './three/three-ruler-area.js';
import { isClickOnUI, renderLayerContent } from '../src/utils/ui-main.js';
import { initProjectInfo } from './utils/projectInfo.js';
import { modelGroups } from './three/three-modelGroups.js';

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
// Load 3d Tiles Model
const tilesModels = new Map();

const tilesPathIn = '../../resources/models/3d-tiles/scIn/tileset.json'
const inModel = await load3dTilesModel(tilesPathIn, camera, renderer, controls, scene)
tilesModels.set('in', inModel);


const tilesPathOut = '../../resources/models/3d-tiles/scOut/tileset.json'
const outModel = await load3dTilesModel(tilesPathOut, camera, renderer, controls, scene)
tilesModels.set('out', outModel);
renderLayerContent(modelGroups);

// Load GLTF Model
const gltfPath1 = '../../resources/models/glb/bridge2dra.glb';
// loadGLTFModel(gltfPath1, scene, camera, controls, 'Bridge');
const gltfPath2 = '../../resources/models/glb/songChoBlueDra.glb';
// loadGLTFModel(gltfPath2, scene, camera, controls, 'Buildings');

/* Loop */
function loop () {
	requestAnimationFrame(loop);
  composer.render();
	labelRenderer.render(scene, camera);
	cesiumViewer.render();
	animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
	tilesModels.forEach(model => {
    model.tilesRenderer.update();
  });
  
	try {
		syncThreeToCesium(camera, controls, cesiumViewer); //
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
