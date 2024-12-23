import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/Addons.js';
import { color } from 'three/tsl';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );


const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );
const controls = new OrbitControls( camera, renderer.domElement );
controls.update();
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
// scene.add(ambientLight);

new RGBELoader().load('./environments/rogland_moonlit_night_4k.hdr', (environmentMap) => {
	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
	// scene.background = environmentMap;
	scene.environment = environmentMap;
})


// const directionaLightLeft = new THREE.DirectionalLight(0xFFFFFF, 10);
// scene.add(directionaLightLeft);
// directionaLightLeft.position.set(-30, 30, -10);
// const directionaLightRight = new THREE.DirectionalLight(0xFFFFFF, 10);
// scene.add(directionaLightRight);
// directionaLightRight.position.set(30, 30, 10);
let cubes = [];
const geometry = new THREE.BoxGeometry( 10, 10, 10 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube1 = new THREE.Mesh( geometry, material );
cube1.userData.origionalColor = 0x00ff00;
cube1.position.set(0, 0, 0);
cubes.push(cube1);

const cube2 = new THREE.Mesh( 
	new THREE.BoxGeometry(4, 4, 4),
	new THREE.MeshBasicMaterial({color: 0xffffff})
);
cube2.userData.origionalColor = 0xffffff;
cube2.position.set(-5, -10, -7);
cubes.push(cube2);
cubes.forEach(cube => {
	scene.add(cube);
})

// CSS2DRenderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// CSS2DObject
const label = document.querySelector('.label');
label.textContent = "hello World";
const cPointLabel = new CSS2DObject(label);
// cPointLabel.getSize(100, 100);
scene.add(cPointLabel);
cPointLabel.position.set(-20, 5, 10);

const loader = new GLTFLoader();
loader.load(
	// resource URL
	'mygia.glb',
	// called when the resource is loaded
	function ( gltf ) {
		scene.add( gltf.scene );
	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( 'An error happened' );
	}
);

const raycaster = new THREE.Raycaster();
let hoveredObjects = [];
window.addEventListener( 'pointermove', onMousedown );
function onMousedown( event ) {
	event.preventDefault();
	const coords = new THREE.Vector2();
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

camera.position.z = 40;

function animate() {
    controls.update();
	labelRenderer.render(scene, camera);
	renderer.render( scene, camera );
}

window.addEventListener('resize', () => {

	camera.aspect = window.innerWidth / window.innerHeight;

	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

})
