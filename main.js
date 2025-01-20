import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer, FXAAShader, OBJLoader, OutlinePass, OutputPass, RenderPass, RGBELoader, ShaderPass} from 'three/examples/jsm/Addons.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap';
import { loadJson, texture, obj3d, group, loadGLTFModel } from './src/three.func';

// Config

const raycaster = new THREE.Raycaster();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.set(165, -50, 150);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.querySelector('.three-Container').appendChild( renderer.domElement );
const controls = new OrbitControls( camera, renderer.domElement );
controls.target = new THREE.Vector3(25, -30, -90);
controls.update();
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

// Environment
new RGBELoader().load('./environments/rogland_moonlit_night_4k.hdr', (environmentMap) => {
	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
	// scene.background = environmentMap;
	scene.environment = environmentMap;
})

// Add ShapeGeometry
loadJson('./JSON/path2.geojson', ['', 0x7b03fc], 0x3281a8);
loadJson('./JSON/path3.geojson', [0x32a852, 0x32a889], 0xfc9803);


// Add Cubes
const geometry = new THREE.BoxGeometry( 10, 10, 10 );
const material = new THREE.MeshBasicMaterial( { 
	map: texture('./texture/apartments4.png')
} );
const cube1 = new THREE.Mesh( geometry, material );
cube1.userData.label = "Thông tin 1";
cube1.position.set(-20, 40, 10);
obj3d.add(cube1);

// add group3d to scene
group.add(obj3d);
scene.add(group);

// CSS2DRenderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.querySelector('.three-Container').appendChild(labelRenderer.domElement);

// CSS2DObject
const label = document.querySelector('.label');
label.textContent = 'Hello_World';
const cPointLabel = new CSS2DObject(label);
cPointLabel.position.set(0, 10, 50);
scene.add(cPointLabel);
const points = [
	{"content": "Điểm 1", "x": "37", "y": "-110", "z": "50"},
	{"content": "Điểm 2", "x": "-90", "y": "-90", "z": "50"},
	{"content": "Điểm 3", "x": "175", "y": "-10", "z": "50"},
	{"content": "Điểm 4", "x": "25", "y": "105", "z": "50"},
];
let div = [];
let node = [];
let cPointDiv = [];
let sphereMesh = [];
points.forEach((point, i) => {
	div[i] = document.createElement('div');
	div[i].classList.add(`div${i}`);
	node[i] = document.createTextNode(point.content);
	div[i].appendChild(node[i]);
	labelRenderer.domElement.appendChild(div[i]);
	cPointDiv[i] = new CSS2DObject(document.querySelector(`.div${i}`));
	cPointDiv[i].position.set(point.x, point.y, point.z);
	sphereMesh[i] = createCpointMesh(point.content, point.x, point.y, point.z-5);
	obj3d.add(cPointDiv[i]);
	obj3d.add(sphereMesh[i]);
});

// create PointMesh
function createCpointMesh (name, x, y, z) {
	const geo = new THREE.SphereGeometry(2);
	const mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	mesh.name = name;
	return mesh;
}

// search Function
const searchInput = document.querySelector('.search-Input');
const searchBtn = document.querySelector('.searchBtn');
searchBtn.addEventListener('mousedown', () => {
	const valueSearch = searchInput.value.replace(/\s/g, '').split(",");
	console.log(valueSearch);
	scene.add(createCpointMesh ('checkPoint1', Number(valueSearch[0]), Number(valueSearch[1]), 5));
	let target = new THREE.Vector3(Number(valueSearch[0]), Number(valueSearch[1]), 10);
	let cameraPosition = camera.position.clone();
	let distance = cameraPosition.sub(target);
	let direction = distance.normalize();
	let offset = distance.clone().sub(direction.multiplyScalar(20.0));
	let newPos = target.clone().sub(offset);
	zoomAt(target, newPos);
});

// original Position
const oriBtn = document.querySelector('.locationBtn');
oriBtn.addEventListener('mousedown', () => {
	let target = new THREE.Vector3(0, 0, 0);
	let cameraPosition = camera.position.clone();
	let distance = cameraPosition.sub(target);
	let direction = distance.normalize();
	let offset = distance.clone().sub(direction.multiplyScalar(200.0));
	let newPos = new THREE.Vector3(100, -100, 100);
	zoomAt(target, newPos);
})

// OBJLoader
const manager = new THREE.LoadingManager();
manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onLoad = function ( ) {
	console.log( 'Loading OBJ complete!');
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};
const objLoader = new OBJLoader(manager);
function objModel(path, ele, color) {
	objLoader.load(path, 
		function (object, color) {
			object.traverse(node => {
				if(node.isMesh){
					node.material.color.set(color);
				}
			});
			object.position.z = ele;
			obj3d.add(object);
		}, (xhr) => {
			console.log('>>>ObjLoader:',(xhr.loaded / xhr.total * 100) + ' %loaded');
		}, (error) => {
			console.log('>>>ObjLoader Status: Error Happened');
		}
	);
};
objModel('./Obj/line1.obj', 55, '0xeb34d8');

// Load GLTF Model
loadGLTFModel('./GLB/mygia.glb').then(gltf => obj3d.add(gltf.scene));
const gltfBox = document.querySelector('.gltfBox'); // Load Gtlf Model Button
gltfBox.addEventListener('click', async () => {
	if(gltfBox.checked){
		let start = Date.now();
		await loadGLTFModel('./GLB/mygia.glb');
		let end = Date.now();
		let timeLoad = end - start;
		const progressBar = document.querySelector('.progress-bar');
		progressBar.style.display = 'flex';
		progressBar.animate([
			{
				width: '0%'
			},
			{
				width: '100%'
			}
		], {
			duration: timeLoad,
			fill: 'forwards'
		});
		await loadGLTFModel('./GLB/mygia.glb').then(gltf => obj3d.add(gltf.scene));
		progressBar.style.display = 'none';
	}	else{
		scene.remove(obj3d.children.pop());
	}
});


window.addEventListener('dblclick', zoomCam);

document.onpointerdown = (event) => {
	switch(event.button){
		case 0:
			lClick(event);// Left Click Function
			break;
		case 2:
			/* rClick(event); // Right Click Fucntion */
			break;
	}
};
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousewheel', onMouseWheel);


function onMouseWheel(event){
	let cameraPosition = camera.position.clone();
	let distance = cameraPosition.distanceTo(cPointLabel.position);
	if(distance > 300 || distance < 70){
		scene.remove(cPointLabel);
	} else {
		scene.add(cPointLabel);
	}
};

function zoomCam( event ) {
	event.preventDefault();
	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(scene.children);
	if(intersects.length > 0){
		let target = intersects[0].point;
		let cameraPosition = camera.position.clone();
		let distance = cameraPosition.sub(target);
		let direction = distance.normalize();
		let offset = distance.clone().sub(direction.multiplyScalar(20.0));
		let newPos = target.clone().sub(offset);
		zoomAt(target, newPos);
		// console.log('>>CamPosition:', camera.position);
		// console.log('>>TargetPosition:', target)
		// console.log('>>Direction:', direction);
	} 
};

// Outline
let composer, effectFXAA, outlinePass;

composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

outlinePass = new OutlinePass (new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
composer.addPass(outlinePass);

// selectedObjects
let selectedObjects = [];
function addSelectedObject( object ) {

	selectedObjects = [];
	selectedObjects.push( object );

}

const outputPass = new OutputPass();
composer.addPass(outputPass);

effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(effectFXAA);



function onMouseMove( event ) {
	event.preventDefault();

	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(obj3d.children);
	if(intersects.length > 0){
		const selectedObject = intersects[0].object;
		addSelectedObject(selectedObject);
		outlinePass.selectedObjects = selectedObjects;
	} else {
		outlinePass.selectedObjects = [];
}};

function lClick( event ) {
	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(scene.children);
	if(intersects.length > 0){
		const p = intersects[0].point;
		console.log('Tọa độ:',p.x, p.y, p.z);
	}
};

function animate() {
  controls.update();
	labelRenderer.render(scene, camera);
	renderer.render( scene, camera );
	composer.render();
};

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	labelRenderer.setSize( window.innerWidth, window.innerHeight );
	effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
	
});

// Zoome Gsap
const zoomAt = (target, newPos) => {
	gsap.to( camera.position, {
		duration: 1,
		x: newPos.x,
		y: newPos.y,
		z: newPos.z,
	} );

	gsap.to( controls.target, {
		duration: 1,
		x: target.x,
		y: target.y,
		z: target.z,
	} );
};