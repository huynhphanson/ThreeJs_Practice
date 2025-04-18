import * as THREE from 'three'
import gsap from 'gsap';
import { createCpointMesh } from './three-func';
import { convertTo9217, convertToECEF } from './three-convertCoor';
import { centerCameraTiles, centerECEFTiles } from './three-3dtilesModel';
import { centerECEF, cameraECEF } from './three-gltfModel';

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
  // event.preventDefault();
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

export function findPosition(scene, camera, controls) {
  const searchInput = document.querySelector('.search-input');
  const valueSearch = searchInput.value.replace(/\s/g, '').split(",");

  if (valueSearch.length < 2) {
    alert("Vui lòng nhập ít nhất X và Y.");
    return;
  }

  const coords = valueSearch.map(Number);

  const hasInvalid = coords.some(val => isNaN(val));
  const hasNegative = coords.some(val => val < 0);

  if (hasInvalid) {
    alert("Vui lòng chỉ nhập số hợp lệ.");
    return;
  }

  if (hasNegative) {
    alert("Tọa độ không được là số âm.");
    return;
  }

  const target = convertToECEF(coords[0], coords[1], coords[2] || 10);
  scene.add(createCpointMesh('checkPoint1', target.x, target.y, target.z));

  let cameraPosition = camera.position.clone();
  let distance = cameraPosition.sub(target);
  let direction = distance.normalize();
  let offset = distance.clone().sub(direction.multiplyScalar(20.0));
  let newPos = target.clone().sub(offset);

  zoomAt(target, newPos, camera, controls);
}


export function findProjectPosition (camera, controls) {
  if (centerECEF && cameraECEF) {
    zoomAt(centerECEF, cameraECEF, camera, controls);
  } else if (centerECEFTiles && centerCameraTiles) {
    zoomAt(centerECEFTiles, centerCameraTiles, camera, controls);
  }
}

export function zoomTarget (event, raycaster, scene, camera, controls) {
  event.preventDefault();

  const coords = new THREE.Vector2();
  coords.x = (event.clientX / window.innerWidth) * 2 - 1;
  coords.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(coords, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const target = intersects[0].point;
    const cameraPosition = camera.position.clone();
    const distance = cameraPosition.sub(target);
    const direction = distance.normalize();
    const offset = distance.clone().sub(direction.multiplyScalar(15.0));
    const newPos = target.clone().sub(offset);

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
    const pEPSG = convertTo9217(p.x, p.y, p.z)
    console.log('Tọa độ:',pEPSG.x, pEPSG.y, pEPSG.z);
    // console.log('Đang chọn:', intersects[0].object)
  }
}