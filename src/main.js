import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { CSS2DObject, DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { loadJson, obj3d, group, createCpointMesh, objModel} from './three/three-func.js';
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, onMouseWheel, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { progressBarModel } from './utils/ui.js';
import { initCesium } from './cesium/cesium-init.js';
import { TilesRenderer } from '3d-tiles-renderer';
import { syncThreeToCesium } from './cesium/cesium-syncThree.js';
import { loadGLTFModel } from './three/three-gltfModel.js';

const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();

// Cesium
const cesiumViewer = initCesium();


// Three
const raycaster = new THREE.Raycaster();
const threeContainer = document.querySelector('.three-container');
threeContainer.appendChild(renderer.domElement);
threeContainer.appendChild(labelRenderer.domElement);

// Loader3DTiles
const sphere = new THREE.Sphere();
const tilesRenderer = new TilesRenderer('../../resources/models/3d-tiles/full/tileset.json');
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
dracoLoader.setDecoderConfig( { type: 'js' } );

const loader = new GLTFLoader( tilesRenderer.manager );
loader.setDRACOLoader( dracoLoader );

tilesRenderer.manager.addHandler( /\.(gltf|glb)$/g, loader );

tilesRenderer.setCamera(camera);
tilesRenderer.setResolutionFromRenderer(camera, renderer);
tilesRenderer.addEventListener('load-tile-set', () => {
	// Tạo chấm đỏ (dùng SphereGeometry)
	const dotGeometry = new THREE.SphereGeometry(10, 16, 16); // Bán kính 10
	const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Màu đỏ
	const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
	const box = new THREE.Box3();
	tilesRenderer.getBoundingBox(box);
	dotMesh.position.copy(box.getCenter(new THREE.Vector3()));
	obj3d.add(dotMesh)
	const boxHelper = new THREE.Box3Helper(box, 0xffff00);
	// scene.add(boxHelper);
	tilesRenderer.group.name = 'tiles';
	tilesRenderer.getBoundingSphere( sphere );
	let newPos = new THREE.Vector3(sphere.center.x + 400, sphere.center.y + 400, sphere.center.z + 700);
	camera.position.set(newPos.x, newPos.y, newPos.z);
	controls.target = new THREE.Vector3(sphere.center.x, sphere.center.y, sphere.center.z);
});
scene.add(tilesRenderer.group);

function loop () {
	requestAnimationFrame(loop);
	cesiumViewer.render();
	animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
	tilesRenderer.update();
	try {
		syncThreeToCesium(camera, controls, cesiumViewer); // Đồng bộ với Cesium
} catch (error) {
		console.error("Error syncing cameras:", error);
}
}
loop();

// Load GLTF Model
const gltfPath = '../../resources/models/glb/SCvndra.glb';
loadGLTFModel(gltfPath, scene, camera, controls);

// window events
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


// Load GLTF Model
/* loadGLTFPath().then(gltfPath => {
	loadGLTFModel(gltfPath).then(gltf => scene.add(gltf.scene))
}); */


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