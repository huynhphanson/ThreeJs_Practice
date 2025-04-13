import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { CSS2DObject, DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { obj3d, group, createCpointMesh} from './three/three-func.js';
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, onMouseWheel, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { clearInfoTable } from '../src/utils/ui-main.js';
import { initCesium } from './cesium/cesium-init.js';

import { syncThreeToCesium } from './cesium/cesium-syncThree.js';
import { loadGLTFModel } from './three/three-gltfModel.js';
import { load3dTilesModel } from './three/three-3dtilesModel.js';
import { setViewer } from './cesium/cesium-viewer.js';
import { initRuler } from './three/three-ruler.js';

const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();

// Cesium
export const cesiumViewer = initCesium();
setViewer(cesiumViewer);


// Three
const raycaster = new THREE.Raycaster();
const threeContainer = document.querySelector('.three-container');
threeContainer.appendChild(renderer.domElement);
threeContainer.appendChild(labelRenderer.domElement);

// Load 3d Tiles Model
const tilesPath = '../../resources/models/3d-tiles/songcho/tileset.json'
const { tilesRenderer, dispose } = load3dTilesModel(tilesPath, camera, renderer, controls, scene);

// Load GLTF Model

const gltfPath1 = '../../resources/models/glb/songChoSurfaceDra.glb';
// loadGLTFModel(gltfPath1, scene, camera, controls, 'surface');
const gltfPath2 = '../../resources/models/glb/songCho_NhaDra.glb';
loadGLTFModel(gltfPath2, scene, camera, controls, 'buildings');


function loop () {
	requestAnimationFrame(loop);
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


// window events
window.addEventListener('beforeunload', () => {
  dispose();
});
window.addEventListener('click', (event) => onMouseMove( event, raycaster, camera, obj3d, outlinePass ));
window.addEventListener('click', (event) => clearInfoTable(event, raycaster, scene, camera));
window.addEventListener('resize', () => resizeScreen(camera, renderer, labelRenderer, effectFXAA, composer));


// functions
const searchBtn = document.querySelector('.btn-search'); // find position
searchBtn.addEventListener('click', () => findPosition(scene, camera, controls));

const oriBtn = document.querySelector('.btn-project-location'); // find project position
oriBtn.addEventListener('click', () => findProjectPosition(camera, controls))

window.addEventListener('dblclick', (event) => zoomTarget(event, raycaster, scene, camera, controls)); // zoom target position

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

rulerBtn.addEventListener('click', () => {
  if (!rulerInitialized) {
    initRuler(scene, camera, renderer);
    rulerInitialized = true;
  }
});


// add group3d to scene
group.add(obj3d);
scene.add(group);

