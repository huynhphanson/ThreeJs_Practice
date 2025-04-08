import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { TilesRenderer } from '3d-tiles-renderer';
import { convertTo9217, convertToECEF } from './three-convertCoor';

// Loader3DTiles
export function load3dTilesModel (path, camera, renderer, controls, scene) {
  const sphere = new THREE.Sphere();
  const tilesRenderer = new TilesRenderer(path);
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
  dracoLoader.setDecoderConfig( { type: 'js' } );
  
  const loader = new GLTFLoader( tilesRenderer.manager );
  loader.setDRACOLoader( dracoLoader );
  
  tilesRenderer.manager.addHandler( /\.(gltf|glb)$/g, loader );
  
  tilesRenderer.setCamera(camera);
  tilesRenderer.setResolutionFromRenderer(camera, renderer);

  tilesRenderer.addEventListener('load-tile-set', () => {
    // Tạo chấm đỏ (dùng SphereGeometry)
    const dotGeometry = new THREE.SphereGeometry(10, 16, 16); // Bán kính 10
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Màu đỏ
    const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
    const bbox = new THREE.Box3();
    tilesRenderer.getBoundingBox(bbox);
    dotMesh.position.copy(bbox.getCenter(new THREE.Vector3()));
    scene.add(dotMesh)
    const boxHelper = new THREE.Box3Helper(bbox, 0xffff00);
    // scene.add(boxHelper);

    tilesRenderer.group.name = '3d-tiles';
    tilesRenderer.getBoundingSphere( sphere );
    let centerECEF = new THREE.Vector3(sphere.center.x, sphere.center.y, sphere.center.z);
    const centerEPSG = convertTo9217(centerECEF.x, centerECEF.y, centerECEF.z);
    const size = new THREE.Vector3();
    const maxLength = bbox.getSize(size).length();
    const cameraEPSG = {
      x: centerEPSG.x,
      y: centerEPSG.y - maxLength * 0.5, 
      z: centerEPSG.z + maxLength * 0.5
    };
    // Convert EPSG back to ECEF and set camera position
    const newPos = convertToECEF(cameraEPSG.x, cameraEPSG.y, cameraEPSG.z);
    camera.position.set(newPos.x, newPos.y, newPos.z);
    controls.target = new THREE.Vector3(sphere.center.x, sphere.center.y, sphere.center.z);
  });
  scene.add(tilesRenderer.group);

  // Giải phóng bộ nhớ khi không sử dụng
  const disposeTilesRenderer = () => {
    tilesRenderer.removeEventListener('load-tile-set', onTileSetLoaded);
    tilesRenderer.dispose();  // Giải phóng tài nguyên của TilesRenderer
    tilesRenderer.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    // Nếu bạn có các đối tượng khác trong scene, bạn cũng nên giải phóng chúng
    scene.remove(tilesRenderer.group);
  };

  // Trả về hàm giải phóng bộ nhớ khi không cần sử dụng nữa
  return { tilesRenderer, dispose: disposeTilesRenderer };

}