import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader, RGBELoader} from 'three/examples/jsm/Addons.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/Addons.js';




const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.set(165, -50, 150);
// scene.add(camera);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.querySelector('.threeContainer').appendChild( renderer.domElement );
const controls = new OrbitControls( camera, renderer.domElement );
controls.target = new THREE.Vector3(25, -30, -90);
controls.update();
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

new RGBELoader().load('./environments/rogland_moonlit_night_4k.hdr', (environmentMap) => {
	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
	// scene.background = environmentMap;
	scene.environment = environmentMap;
})

let cubes = [];
const geometry = new THREE.BoxGeometry( 10, 10, 10 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube1 = new THREE.Mesh( geometry, material );
cube1.userData.origionalColor = 0x00ff00;
cube1.userData.label = "Thông tin 1";
cube1.position.set(0, 0, 10);
cubes.push(cube1);

const cube2 = new THREE.Mesh( 
	new THREE.BoxGeometry(4, 4, 4),
	new THREE.MeshBasicMaterial({color: 0xffffff})
);
cube2.userData.origionalColor = 0xffffff;
cube2.userData.label = "Thông tin 2";
cube2.position.set(-5, -18, 20);
cubes.push(cube2);

cubes.forEach((cube, index) => {
	scene.add(cube);
})

// CSS2DRenderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.querySelector('.threeContainer').appendChild(labelRenderer.domElement);

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
	scene.add(cPointDiv[i]);
	scene.add(sphereMesh[i]);
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


// OBJLoader
const manager = new THREE.LoadingManager();
manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onLoad = function ( ) {
	console.log( 'Loading complete!');
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};
const objLoader = new OBJLoader(manager);
objLoader.load(
	'./Obj/line1.obj', 
	function (object) {
		object.traverse(node => {
			if(node.isMesh){
				// node.material.color.set(0xff0000);
			}
		});
		object.position.z = 50;
		scene.add(object);
	}, (xhr) => {
		console.log('>>>ObjLoader:',(xhr.loaded / xhr.total * 100) + ' %loaded');
	}, (error) => {
		console.log('>>>ObjLoader Status: Error Happened');
	}
);

// GLTFLoader
const loader = new GLTFLoader();
function loadGLTFModel() {
	loader.load(
		// resource URL
		'./GLB/mygia.glb',
		// called when the resource is loaded
		function ( gltf ) {
			gltf.scene.position.z = 50;
			scene.add( gltf.scene );
		},
		// called while loading is progressing
		function ( xhr ) {
			// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
		},
		// called when loading has errors
		function ( error ) {
			console.log( 'An error happened' );
		}
	);
};
loadGLTFModel();
/* const btnModel = document.querySelector('.btnModel');
btnModel.addEventListener('mousedown', () => {
	loadGLTFModel();
}); */

const raycaster = new THREE.Raycaster();
window.addEventListener('dblclick', zoomCam)
window.addEventListener('mousedown', onMouseDownGltf)
window.addEventListener('mousedown', onMouseDown);
window.addEventListener( 'mousemove', onMouseMove );
window.addEventListener('mousewheel', onMouseWheel);

function onMouseWheel(event){
	let cameraPosition = camera.position.clone();
	let distance = cameraPosition.distanceTo(cPointLabel.position);
	console.log(distance);
	if(distance > 300 || distance < 10){
		scene.remove(cPointLabel);
		scene.remove(cPointDiv);
	} else {
		scene.add(cPointLabel);
	}
}



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
	} else {
		
}}


function onMouseMove( event ) {
	event.preventDefault();
	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(cubes);
	if(intersects.length > 0){
		cubes.forEach(cube => {
			if(intersects[0].object === cube){
				cube.material.color.set(0xff0000);
			}
		})
	} else {
		cubes.forEach(cube => {
			cube.material.color.set(cube.userData.origionalColor);
		})
}}
function onMouseDownGltf( event ) {
	event.preventDefault();
	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(scene.children);
	if(intersects.length > 0){
		const p = intersects[0].point;
		console.log('Tọa độ:',p.x, p.y, p.z);
	} else {
		cubes.forEach(cube => {
			cube.material.color.set(cube.userData.origionalColor);
		})
}}


function onMouseDown( event ) {
	event.preventDefault();
	const coords = new THREE.Vector3();
	coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera(coords, camera);

	const intersects = raycaster.intersectObjects(cubes);
	if(intersects.length > 0){
		cubes.forEach(cube => {
			if(intersects[0].object === cube){
				// console.log(cube.userData.label);
				showLabel(cube.userData.label);
			}
		});
		// zoomAt(intersects[0].object, camera);
	}
}





function animate() {
    controls.update();
	labelRenderer.render(scene, camera);
	renderer.render( scene, camera );
}

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	labelRenderer.setSize( window.innerWidth, window.innerHeight );
})


// Interact JS
const tagContainer = document.querySelector('.tagContainer');
const exitBtn = document.querySelector('.exitBtn');
exitBtn.addEventListener('click', () => {
	tagContainer.style.display = 'none';
});

function showLabel(object){
	const contentContainer = document.querySelector('.contentContainer');
	contentContainer.textContent = object;
	tagContainer.style.display = 'flex';
}

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

