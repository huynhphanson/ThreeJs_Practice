import * as THREE from 'three'
import gsap from 'gsap';
import { createCpointMesh } from './three-func';

let selectedObjects = [];
function addSelectedObject( object ) {
  selectedObjects = [object];
}

export function resizeScreen (camera, renderer, labelRenderer, effectFXAA, composer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  labelRenderer.setSize( window.innerWidth, window.innerHeight );
  effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

export function onMouseMove( event, raycaster, camera, obj3d, outlinePass ) {
  event.preventDefault();
  const coords = new THREE.Vector2();
  coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  raycaster.setFromCamera(coords, camera);
  const intersects = raycaster.intersectObjects(obj3d.children);
  if (intersects.length > 0) {
    addSelectedObject(intersects[0].object);
  } else {
    selectedObjects = [];
  }

  if (outlinePass) {
    outlinePass.selectedObjects = selectedObjects;
  }
};

export function onMouseWheel (event, camera, obj3d, cPointDivs) {
  let cameraPosition = camera.position.clone();
  let distance = cameraPosition.distanceTo(new THREE.Vector3(0,0,0));
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
// Zoome Gsap
function zoomAt (target, newPos, camera, controls) {
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

export function findPosition (scene, camera, controls) {
  const searchInput = document.querySelector('.search-input');
  const valueSearch = searchInput.value.replace(/\s/g, '').split(",");
  scene.add(createCpointMesh ('checkPoint1', Number(valueSearch[0]), Number(valueSearch[1]), 5));
  let target = new THREE.Vector3(Number(valueSearch[0]), Number(valueSearch[1]), 10);
  let cameraPosition = camera.position.clone();
  let distance = cameraPosition.sub(target);
  let direction = distance.normalize();
  let offset = distance.clone().sub(direction.multiplyScalar(20.0));
  let newPos = target.clone().sub(offset);
  zoomAt(target, newPos, camera, controls);
}

export function findProjectPosition (scene, camera, controls) {
  const gltfModel = scene.getObjectByName('gltf model');
  const boundingBox = new THREE.Box3().setFromObject(gltfModel);
  const centerTarget = new THREE.Vector3();
  boundingBox.getCenter(centerTarget);
  let cameraPosition = camera.position.clone();
  let distance = cameraPosition.sub(centerTarget);
  let direction = distance.normalize();
  let offset = distance.clone().sub(direction.multiplyScalar(200.0));
  let newPos = new THREE.Vector3(100, -100, 100);
  zoomAt(centerTarget, newPos, camera, controls);
}

export function zoomTarget (event, raycaster, scene, camera, controls) {
  event.preventDefault();
  const coords = new THREE.Vector2();
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
    zoomAt(target, newPos, camera, controls);
  } 
}

export function getCoordinate (event, raycaster, scene, camera) {
  const coords = new THREE.Vector3();
  coords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  coords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  raycaster.setFromCamera(coords, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if(intersects.length > 0){
    const p = intersects[0].point;
    console.log('Tọa độ:',p.x, p.y, p.z);
  }
}