import * as THREE from 'three'
import gsap from 'gsap';
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
export function zoomAt (target, newPos, camera, controls) {
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
    const offset = distance.clone().sub(direction.multiplyScalar(20.0));
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