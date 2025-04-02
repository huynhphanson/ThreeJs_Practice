import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { CSS2DObject, DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { loadJson, obj3d, group, createCpointMesh, objModel} from './three/three-func.js';
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, onMouseWheel, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { progressBarModel } from './utils/ui.js';
import { initCesium } from './cesium/cesium-init.js';

import { syncThreeToCesium } from './cesium/cesium-syncThree.js';
import { loadGLTFModel } from './three/three-gltfModel.js';
import { load3dTilesModel } from './three/three-3dtilesModel.js';

const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();

// Cesium
const cesiumViewer = initCesium();


// Three
const raycaster = new THREE.Raycaster();
const threeContainer = document.querySelector('.three-container');
threeContainer.appendChild(renderer.domElement);
threeContainer.appendChild(labelRenderer.domElement);
// Load 3d Tiles Model
const tilesPath = '../../resources/models/3d-tiles/songcho/tileset.json'
const { tilesRenderer, dispose } = load3dTilesModel(tilesPath, camera, renderer, controls, scene);
// Load GLTF Model
const gltfPath = '../../resources/models/glb/songChoBlueDra.glb';
loadGLTFModel(gltfPath, scene, camera, controls);

function loop () {
	requestAnimationFrame(loop);
	// cesiumViewer.render();
	animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
	// tilesRenderer.update();
	try {
		// syncThreeToCesium(camera, controls, cesiumViewer); //
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
window.addEventListener('mousewheel', (event) => onMouseWheel(event, camera, obj3d, cPointDivs) );
window.addEventListener('resize', () => resizeScreen(camera, renderer, labelRenderer, effectFXAA, composer));

// functions
const searchBtn = document.querySelector('.btn-search'); // find position
searchBtn.addEventListener('click', () => findPosition(scene, camera, controls));

const oriBtn = document.querySelector('.btn-project-location'); // find project position
oriBtn.addEventListener('click', () => findProjectPosition(scene, camera, controls))

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


// add group3d to scene
group.add(obj3d);
scene.add(group);

// CSS2DObject
const points = [
	{"content": "Điểm 1", "x": "37", "y": "-110", "z": "50"},
	{"content": "Điểm 2", "x": "-90", "y": "-90", "z": "50"},
	{"content": "Điểm 3", "x": "175", "y": "-10", "z": "50"},
	{"content": "Điểm 4", "x": "25", "y": "105", "z": "50"},
];
let cPointDivs = [];
points.forEach((point, i) => {
	let div = [], node = [],  sphereMesh = [];
	div[i] = document.createElement('div');
	div[i].classList.add(`div${i}`);
	node[i] = document.createTextNode(point.content);
	div[i].appendChild(node[i]);
	labelRenderer.domElement.appendChild(div[i]);
	cPointDivs[i] = new CSS2DObject(document.querySelector(`.div${i}`));
	cPointDivs[i].position.set(point.x, point.y, point.z);
	sphereMesh[i] = createCpointMesh(point.content, point.x, point.y, point.z-5);
	obj3d.add(cPointDivs[i]);
	obj3d.add(sphereMesh[i]);
});