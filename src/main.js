import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { CSS2DObject } from 'three/examples/jsm/Addons.js';
import { loadJson, obj3d, group, loadGLTFModel, createCpointMesh, objModel, loadGLTFPath, projectPosition } from './three/three-func.js';
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, onMouseWheel, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { progressBarModel } from './utils/ui.js';
import { initCesium } from './cesium/cesium-init.js';
import * as Cesium from 'cesium';
import proj4 from 'proj4';

const cesiumViewer = initCesium();
// Định nghĩa hệ tọa độ WGS84 (EPSG:4326) và UTM Zone 48N (EPSG:32648)
proj4.defs([
	["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
	['EPSG:9217',
			'+proj=tmerc +lat_0=0 +lon_0=108.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs +type=crs']
]);
const toMap = proj4('EPSG:9217', 'EPSG:4326');
const toScene = proj4('EPSG:4326', 'EPSG:9217');

// Cesium

function syncThreeToCesium () {
	let threePosition = camera.position;
	let threeDirection = new THREE.Vector3();
	camera.getWorldDirection(threeDirection);

	// Chuyen doi vi tri tu theejs sang cesium
	let cesiumPosition = new Cesium.Cartesian3(threePosition.x, threePosition.y, threePosition.z);
	let cesiumDirection = new Cesium.Cartesian3(threeDirection.x, threeDirection.y, threeDirection.z);
	cesiumViewer.camera.setView({
		destination: cesiumPosition,
		orientation: {
			direction: cesiumDirection,
			up: new Cesium.Cartesian3(0,0,1)
		}
	})
}

// Three
const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();
const raycaster = new THREE.Raycaster();
const threeContainer = document.querySelector('.three-container');
threeContainer.appendChild(renderer.domElement);
threeContainer.appendChild(labelRenderer.domElement);
// cesiumViewer.camera.changed.addEventListener(syncCesiumToThree);
// animateLoop(controls, scene, camera, renderer, labelRenderer, composer)
function loop () {
	requestAnimationFrame(loop);
	cesiumViewer.render();
	controls.update();
	labelRenderer.render(scene, camera);
	renderer.render(scene, camera);
	composer.render();
	syncThreeToCesium();
}
loop();
// window events
window.addEventListener('mousemove', (event) => onMouseMove( event, raycaster, camera, obj3d, outlinePass ));
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
loadGLTFPath().then(gltfPath => {
	loadGLTFModel(gltfPath).then(gltf => {
		scene.add(gltf.scene);
		const box = new THREE.Box3().setFromObject(gltf.scene);
		const helper = new THREE.Box3Helper(box, 0xff0000); // Màu đỏ
		const centerPosition = projectPosition(gltf.scene);
		console.log(centerPosition);
		scene.add(helper);
	});
	
});

const gltfBox = document.querySelector('.gltfBox'); // Load Gtlf Model Button;
const progressBar = document.querySelector('.progress-bar');
gltfBox.addEventListener('click', () => progressBarModel(gltfBox, progressBar, loadGLTFPath, scene));

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