import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { TilesRenderer } from '3d-tiles-renderer';
import { convertTo9217, convertToECEF } from './three-convertCoor';
import { addToModelGroup } from './three-modelGroups';


export let centerECEFTiles, centerCameraTiles;

// Loader3DTiles
export async function load3dTilesModel (path, camera, renderer, controls, scene, category = 'MÔ HÌNH 3D', setCamera = false) {
  const sphere = new THREE.Sphere();
  const tilesRenderer = new TilesRenderer(path);
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
  dracoLoader.setDecoderConfig( { type: 'js' } );
  
  const loader = new GLTFLoader( tilesRenderer.manager );
  loader.setDRACOLoader( dracoLoader );
  
  tilesRenderer.manager.addHandler( /\.(gltf|glb)$/g, loader );
  tilesRenderer.maxDepth = 100; // tăng số tầng tile được tải nếu cần
  
  
  tilesRenderer.setCamera(camera);
  tilesRenderer.setResolutionFromRenderer(camera, renderer);
  const model = tilesRenderer.group;

  addToModelGroup(category, model);

  tilesRenderer.addEventListener('load-tile-set', () => {

    const bbox = new THREE.Box3();
    tilesRenderer.getBoundingBox(bbox);
    
    tilesRenderer.getBoundingSphere( sphere );
    centerECEFTiles = new THREE.Vector3(sphere.center.x, sphere.center.y, sphere.center.z);
    const centerEPSG = convertTo9217(centerECEFTiles.x, centerECEFTiles.y, centerECEFTiles.z);
    const size = new THREE.Vector3();
    const maxLength = bbox.getSize(size).length();
    const cameraEPSG = {
      x: centerEPSG.x - maxLength * 0.1,
      y: centerEPSG.y - maxLength * 0.4, 
      z: centerEPSG.z + maxLength * 0.25
    };
    // Convert EPSG back to ECEF and set camera position
    centerCameraTiles = convertToECEF(cameraEPSG.x, cameraEPSG.y, cameraEPSG.z);
    if (setCamera) {
      camera.position.set(centerCameraTiles.x, centerCameraTiles.y, centerCameraTiles.z);
      controls.target.copy(sphere.center);

      const up = centerCameraTiles.clone().normalize();
      camera.up.copy(up);

      controls.update(); // ⬅️ rất quan trọng
    }

    
    // add to scene
    scene.add(model);
  });

  // Giải phóng bộ nhớ khi không sử dụng
  const disposeTilesRenderer = () => {
    tilesRenderer.dispose();  // Giải phóng tài nguyên của TilesRenderer
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    // Nếu bạn có các đối tượng khác trong scene, bạn cũng nên giải phóng chúng
    scene.remove(model);
  };

  // Trả về hàm giải phóng bộ nhớ khi không cần sử dụng nữa
  return { 
    tilesRenderer, 
    dispose: disposeTilesRenderer,
    model
   };
}