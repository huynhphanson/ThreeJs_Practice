import * as THREE from 'three';
import { threeInit } from './three/three-init.js'
import { CSS2DObject, DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { loadJson, obj3d, group, loadGLTFModel, createCpointMesh, objModel, loadGLTFPath } from './three/three-func.js';
import { animateLoop } from './three/three-animate.js';
import { outlinePass, effectFXAA } from './three/three-outline.js';
import { onMouseMove, onMouseWheel, findPosition, findProjectPosition, zoomTarget, resizeScreen, getCoordinate } from './three/three-controls.js';
import { progressBarModel } from './utils/ui.js';
import { initCesium } from './cesium/cesium-init.js';
import { TilesRenderer } from '3d-tiles-renderer';
import * as Cesium from 'cesium';
import proj4 from 'proj4';
const {scene, camera, renderer, controls, labelRenderer, composer} = threeInit();
// Định nghĩa hệ tọa độ WGS84 (EPSG:4326) và UTM Zone 48N (EPSG:32648)
proj4.defs([
	["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
	['EPSG:9217',
			'+proj=tmerc +lat_0=0 +lon_0=108.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs +type=crs']
]);
let pointcloudProjection = proj4("EPSG:9217");
let mapProjection = proj4.defs("EPSG:4326");
let toMap = proj4(pointcloudProjection, mapProjection);
// Cesium
const cesiumViewer = initCesium();

function syncThreeToCesium() {
  {

		let pPos = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorld);
		let pRight = new THREE.Vector3(600, 0, 0).applyMatrix4(camera.matrixWorld);
		let pUp = new THREE.Vector3(0, 600, 0).applyMatrix4(camera.matrixWorld);
		let pTarget = controls.target;

		let toCes = (pos) => {
			let xy = [pos.x, pos.y];
			let height = pos.z;
			let deg = toMap.forward(xy);
			let cPos = Cesium.Cartesian3.fromDegrees(...deg, height);

			return cPos;
		};

		let cPos = new Cesium.Cartesian3(pPos.x, pPos.y, pPos.z);
		let cUpTarget = new Cesium.Cartesian3(pUp.x, pUp.y, pUp.z);
		let cTarget = new Cesium.Cartesian3(pTarget.x, pTarget.y, pTarget.z);

		let cDir = Cesium.Cartesian3.subtract(cTarget, cPos, new Cesium.Cartesian3());
		let cUp = Cesium.Cartesian3.subtract(cUpTarget, cPos, new Cesium.Cartesian3());

		cDir = Cesium.Cartesian3.normalize(cDir, new Cesium.Cartesian3());
		cUp = Cesium.Cartesian3.normalize(cUp, new Cesium.Cartesian3());

		cesiumViewer.camera.setView({
			destination : cPos,
			orientation : {
				direction : cDir,
				up : cUp
			}
		});
		
	}

	let aspect = camera.aspect;
	if(aspect < 1){
		let fovy = Math.PI * (camera.fov / 180);
		cesiumViewer.camera.frustum.fov = fovy;
	}else{
		let fovy = Math.PI * (camera.fov / 180);
		let fovx = Math.atan(Math.tan(0.5 * fovy) * aspect) * 2
		cesiumViewer.camera.frustum.fov = fovx;
	}
}













// Three

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
	tilesRenderer.update();
	try {
		syncThreeToCesium(); // Đồng bộ với Cesium
} catch (error) {
		console.error("Error syncing cameras:", error);
}
}


// Loader3DTiles
const sphere = new THREE.Sphere();
const tilesRenderer = new TilesRenderer('../../resources/models/3d-tiles/full_shape/tileset.json');
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
/* loadGLTFPath().then(gltfPath => {
	loadGLTFModel(gltfPath).then(gltf => scene.add(gltf.scene))
}); */

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