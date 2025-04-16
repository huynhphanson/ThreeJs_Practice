import * as THREE from 'three';
import { convertTo9217, convertToECEF } from './three-convertCoor';
import { zoomAt } from './three-controls';
import { centerECEFTiles } from './three-3dtilesModel';
import { centerECEF } from './three-gltfModel';

// create PointMesh
function createCpointMesh (name, x, y, z) {
	const geo = new THREE.SphereGeometry(.2); // radius of point
	const mat = new THREE.MeshBasicMaterial({
		color: 0xFF0000,
		depthTest: false
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	mesh.renderOrder = 999;
	mesh.name = name || 'point';
	return mesh;
}



export function findPosition(scene, camera, controls) {
	const centerEPSGGltf = convertTo9217(centerECEF.x, centerECEF.y, centerECEF.z);
	const centerEPSGTiles = convertTo9217(centerECEFTiles.x, centerECEFTiles.y, centerECEFTiles.z);

	const searchInput = document.querySelector('.search-input');
	const valueSearch = searchInput.value.replace(/\s/g, '').split(",");

	const rawCoords = valueSearch;

	// Kiểm tra độ dài phải đúng 2 hoặc 3 phần tử
	if (rawCoords.length < 2 || rawCoords.length > 3) {
		showToast("Nhập tọa độ định dạng: X,Y");
		return;
	}

	// Kiểm tra từng phần tử: không rỗng, là số và không âm
	for (const val of rawCoords) {
		if (val === '') {
			showToast("Không được để trống giá trị.");
			return;
		}
		const num = Number(val);
		if (isNaN(num)) {
			showToast("Vui lòng chỉ nhập số hợp lệ.");
			return;
		}
		if (num < 0) {
			showToast("Tọa độ không được là số âm.");
			return;
		}
	}

	// Chuyển sang số sau khi đã đảm bảo an toàn
	const coords = rawCoords.map(Number);


	const target = convertToECEF(coords[0], coords[1], coords[2] || centerEPSGGltf.z + 20 || centerEPSGTiles.z + 20);
	scene.add(createCpointMesh('checkPoint', target.x, target.y, target.z));
	const newPos = convertToECEF(coords[0], coords[1], coords[2] + 100 || centerEPSGGltf.z + 100 || centerEPSGTiles.z + 100);

	zoomAt(target, newPos, camera, controls);
}

function showToast(message) {
	const toast = document.createElement('div');
	toast.innerHTML = `⚠️ ${message}`;
	toast.style = `
		position: fixed;
		top: 15px;
		right: 50px;
		color: #fff;
		background: rgba(0,0,0,0.85);
		padding: 6px 8px;
		border-radius: 6px;
		font-size: 14px;
		font-family: sans-serif;
		box-shadow: 0 2px 8px rgba(0,0,0,0.3);
		opacity: 0;
		transform: translateY(-10px);
		transition: opacity 0.2s ease, transform 0.2s ease;
		z-index: 9999;
	`;

	document.body.appendChild(toast);

	// Trigger fade-in
	requestAnimationFrame(() => {
		toast.style.opacity = '1';
		toast.style.transform = 'translateY(0)';
	});

	// Fade-out sau 2.5s rồi remove
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateY(-10px)';
		setTimeout(() => toast.remove(), 100);
	}, 1000);
}
