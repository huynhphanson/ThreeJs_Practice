import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/Addons.js';

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
//RayCaster
const raycaster = new THREE.Raycaster();
window.addEventListener( 'mousedown', onMousedown );
const coords = new THREE.Vector2();
function onMousedown( event ) {
	( event.clientX / window.innerWidth ) * 2 - 1;
	( event.clientY / window.innerHeight ) * 2 + 1;
}

camera.position.z = 300;

function animate() {
    controls.update();
	renderer.render( scene, camera );
}

raycaster.setFromCamera(coords, camera);

const intersections = raycaster.intersectObjects(scene.children, true);
if(intersections.length > 0){
	console.log(intersections);
}
