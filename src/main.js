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
import { initRuler, activateRuler, deactivateRuler } from './three/three-ruler.js';


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
const tilesPath = '../../resources/models/3d-tiles/songcho/tileset.json'
const { tilesRenderer, dispose } = load3dTilesModel(tilesPath, camera, renderer, controls, scene);

// Load GLTF Model
const gltfPath1 = '../../resources/models/glb/songChoSurfaceDra.glb';
// loadGLTFModel(gltfPath1, scene, camera, controls, 'surface');
const gltfPath2 = '../../resources/models/glb/songCho_NhaDra.glb';
loadGLTFModel(gltfPath2, scene, camera, controls, 'buildings');

/* Loop */
function loop () {
	requestAnimationFrame(loop);
	labelRenderer.render(scene, camera);
	// cesiumViewer.render();
	animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
	tilesRenderer.update();
	try {
		syncThreeToCesium(camera, controls, cesiumViewer); //
	} catch (error) {
		console.error("Error syncing cameras:", error);
	}
}
loop();

/* window events */
window.addEventListener('beforeunload', () => dispose());
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
window.addEventListener('dblclick', (event) => zoomTarget(event, raycaster, scene, camera, controls)); // zoom target position
// Console Coordinate
window.onpointerdown = (event) => {
	switch(event.button){
		case 0:
			getCoordinate(event, raycaster, scene, camera);// Left Click Function
			break;
		case 2:
			/* rClick(event); // Right Click Fucntion */
			break;
	}
};
// Ruler
const rulerBtn = document.querySelector('.fa-ruler');
let rulerInitialized = false;
let rulerActive = false;

rulerBtn.addEventListener('click', () => {
  rulerActive = !rulerActive;
  if (rulerActive) {
    if (!rulerInitialized) {
      initRuler(scene, camera, renderer, controls);
      rulerInitialized = true;
    }
    activateRuler(); // << Bật ruler
    rulerBtn.classList.add('i-active');
  } else {
    deactivateRuler(); // << Tắt ruler
    rulerBtn.classList.remove('i-active');
  }
});