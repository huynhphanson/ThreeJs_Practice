import * as THREE from 'three';
import { convertTo9217, convertToECEF } from './three-convertCoor';
import { zoomAt } from './three-controls';

// create PointMesh
function createCpointMesh (name, x, y, z) {
	const geo = new THREE.SphereGeometry(.2); // radius of point
	const mat = new THREE.MeshBasicMaterial({
		color: 0xFF0000,
		depthTest: false
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	mesh.name = name || 'point';
	return mesh;
}

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