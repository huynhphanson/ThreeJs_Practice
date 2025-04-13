import * as THREE from 'three';

// create PointMesh
export function createCpointMesh (name, x, y, z) {
	const geo = new THREE.SphereGeometry(.2); // radius of point
	const mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	mesh.name = name || 'point';
	return mesh;
}