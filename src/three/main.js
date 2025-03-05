import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader, EffectComposer, FXAAShader, GLTFLoader, OutlinePass, OutputPass, RenderPass, RGBELoader, ShaderPass} from 'three/examples/jsm/Addons.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap';
import { loadJson, obj3d, group, loadGLTFModel, createCpointMesh, objModel } from './three-func.js';
import { Loader3DTiles } from 'three-loader-3dtiles';
import { TilesRenderer } from '3d-tiles-renderer';

function animate() {
  controls.update();
	labelRenderer.render(scene, camera);
	renderer.render( scene, camera );
	tilesRenderer.update();
	composer.render();
};

// Config
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.1, 2000 );
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.set(-10, -100, 250);


const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.querySelector('.three-container').appendChild( renderer.domElement );
const controls = new OrbitControls( camera, renderer.domElement );
controls.target = new THREE.Vector3(150, -130, -90);
controls.update();
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

// Loader3DTiles
const sphere = new THREE.Sphere();
const tilesRenderer = new TilesRenderer('../../resources/models/3d-tiles/nhatrangjpeg1.0/tileset.json');
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
dracoLoader.setDecoderConfig( { type: 'js' } );

const loader = new GLTFLoader( tilesRenderer.manager );
loader.setDRACOLoader( dracoLoader );

tilesRenderer.manager.addHandler( /\.(gltf|glb)$/g, loader );

tilesRenderer.setCamera(camera);
tilesRenderer.setResolutionFromRenderer(camera, renderer);
tilesRenderer.addEventListener('load-tile-set', () => {
	console.log('Mô hình:', tilesRenderer.group);
	// tilesRenderer.group.rotation.y = Math.PI / 2;
	tilesRenderer.group.name = 'tiles';
	tilesRenderer.getBoundingSphere( sphere );
	let newPos = new THREE.Vector3(sphere.center.x - 400, sphere.center.y - 400, sphere.center.z + 700);
	console.log('Sphere:', sphere);
	console.log('new position', newPos);
	console.log('sphere center', sphere.center);
	camera.position.set(newPos.x, newPos.y, newPos.z);
	camera.lookAt(sphere.center);
	controls.target.set(sphere.center.x, sphere.center.y, sphere.center.z)
	controls.update()
});
scene.add(tilesRenderer.group);

// location Position
const oriBtn = document.querySelector('.btn-project-location');
oriBtn.addEventListener('click', () => {
	let newPos = new THREE.Vector3(sphere.center.x - 400, sphere.center.y - 400, sphere.center.z + 700);
	zoomAt(sphere.center, newPos);
})

// add group3d to scene
group.add(obj3d);
scene.add(group);

// Environment
new RGBELoader().load('./environments/qwantani_morning_4k.hdr', (environmentMap) => {
	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
	// scene.background = environmentMap;
	scene.environment = environmentMap;
})

// CSS2DRenderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.querySelector('.three-container').appendChild(labelRenderer.domElement);

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

// search Function
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.btn-search');
searchBtn.addEventListener('mousedown', () => {
	const valueSearch = searchInput.value.replace(/\s/g, '').split(",");
	scene.add(createCpointMesh ('checkPoint1', Number(valueSearch[0]), Number(valueSearch[1]), 5));
	let target = new THREE.Vector3(Number(valueSearch[0]), Number(valueSearch[1]), 10);
	let cameraPosition = camera.position.clone();
	let distance = cameraPosition.sub(target);
	let direction = distance.normalize();
	let offset = distance.clone().sub(direction.multiplyScalar(20.0));
	let newPos = target.clone().sub(offset);
	zoomAt(target, newPos);
});



// objModel('./resources/models/obj/line1.obj', 55, 0xeb7134);

// Load GLTF Model
/* async function loadGLTFPath() {
	const response = await fetch(`http://localhost:3008/uploads`);
	const data = await response.json();
	const gltfPath = data.url;
	return gltfPath
}
loadGLTFPath().then(gltfPath => {
	loadGLTFModel(gltfPath).then(gltf => scene.add(gltf.scene))
}); */

const gltfBox = document.querySelector('.gltfBox'); // Load Gtlf Model Button;
const progressBar = document.querySelector('.progress-bar');
gltfBox.addEventListener('click', async () => {
	if(gltfBox.checked){
		progressBar.style.display = 'flex';
		progressBar.style.width = '0%';
		
		progressBar.getAnimations().forEach(anim => anim.cancel());
		let start = Date.now();
		try {
			const gltfPath = await loadGLTFPath();
			const gltf = await loadGLTFModel(gltfPath);
			let end = Date.now();
			let timeLoad = end - start;
			const animation = progressBar.animate([
				{ width: '0%' },
				{ width: '100%' }
			], {
				duration: timeLoad,
				fill: 'forwards'
			});
			await animation.finished;
			scene.add(gltf.scene);
		}	catch (error) {
			console.error('Lỗi khi tải mô hình:', error);
		}	finally {
			progressBar.style.display = 'none';
		}
	} else {
		scene.traverse(child => {
			if (child.name === 'gltf model') {
				scene.remove(child);
			}
		})
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
	let distance = cameraPosition.distanceTo(new THREE.Vector3(0,0,0));
	// console.log(distance);
	if(distance > 300 || distance < 70){
		cPointDivs.forEach(cPointDiv => {
			obj3d.remove(cPointDiv);
		})
	} else {
		cPointDivs.forEach(cPointDiv => {
			obj3d.add(cPointDiv);
		})
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