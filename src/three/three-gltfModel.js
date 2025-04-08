import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { convertToECEF, convertTo9217 } from './three-convertCoor.js';

// DracoLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
dracoLoader.setDecoderConfig( { type: 'js' } );

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

export const modelGroups = {
  surface: [],
  buildings: [],
  infrastructure: []
};

let previousObjects = [];
let previousColors = new Map();

let clickHandlersRegistered = false;
export function loadGLTFModel(path, scene, camera, controls, category) {
  // 🛑 Xóa mô hình cũ trước khi load mới
  clearPreviousModel(scene);

  // Phân loại mô hình
  if (!modelGroups[category]) {
    modelGroups[category] = [];
  }

  // Thực hiện load mô hình
  gltfLoader.load(
    path,
    function (gltf) {
      const model = gltf.scene;
      model.rotateX(Math.PI / 2);
      const materialMap = new Map(); // Lưu danh sách geometry theo từng vật liệu
      const metadata = [];
      let idCounter = 0; // Đánh số ID duy nhất cho từng object
      model.updateMatrixWorld(true, true);

      model.traverse((child) => {
        if (child.isMesh) {
          child.updateMatrixWorld(true);
          const clonedGeom = child.geometry.clone();
          clonedGeom.applyMatrix4(child.matrixWorld);
          
          // Lấy vị trí từng vertex
          const positionAttr = clonedGeom.attributes.position;
          const positions = positionAttr.array;
          for (let i = 0; i < positions.length; i += 3) {
              const localPos = convertToECEF(positions[i], positions[i + 1], positions[i + 2]);
              positions[i] = localPos.x;
              positions[i + 1] = localPos.y;
              positions[i + 2] = localPos.z;
          }
          positionAttr.needsUpdate = true;

          // Tạo objectId và kiểm tra dữ liệu
          const idArray = new Float32Array(clonedGeom.attributes.position.count).fill(idCounter);
          clonedGeom.setAttribute('objectId', new THREE.BufferAttribute(idArray, 1));
  
          // Lưu metadata
          metadata.push({
              id: idCounter,
              name: child.name || "Unnamed",
              userData: { ...child.userData }
          });
  
          // Tạo thuộc tính màu cho từng vertex
          const colors = new Float32Array(clonedGeom.attributes.position.count * 3);
          const originalColor = new THREE.Color().copy(child.material.color);
          for (let i = 0; i < colors.length; i += 3) {
              colors[i] = originalColor.r;
              colors[i + 1] = originalColor.g;
              colors[i + 2] = originalColor.b;
          }
          clonedGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
          // Gom nhóm vật liệu
          const materialKey = child.material.uuid;
          if (!materialMap.has(materialKey)) {
              materialMap.set(materialKey, { geometries: [], material: child.material, originalColor });
          }
          materialMap.get(materialKey).geometries.push(clonedGeom);
  
          idCounter++;
        }
      });
  
      // Tạo mesh từ từng nhóm vật liệu
      const mergedMeshes = [];
      materialMap.forEach(({ geometries, material }) => {
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);
        if (mergedGeometry) {
          const mergedMesh = new THREE.Mesh(mergedGeometry, material);
          mergedMesh.userData.metadata = metadata;
          mergedMeshes.push(mergedMesh);
        }
      });
      
      const bbox = new THREE.Box3();
      // Thêm các mesh đã merge vào scene
      mergedMeshes.forEach(mesh => {
        // Phân loại 
        mesh.name = category;
        modelGroups[category].push(mesh);

        mesh.geometry.computeBoundingBox();
        bbox.expandByObject(mesh);
        mesh.frustumCulled = false;
        mesh.material.roughness = 1;  // Bề mặt hoàn toàn nhám (tắt phản chiếu)
      });

      // 🔹 Tính toán tâm của mô hình theo hệ ECEF
      const centerECEF = new THREE.Vector3();
      bbox.getCenter(centerECEF);

      // 🔹 Dịch chuyển tất cả các điểm về trung tâm mới
      mergedMeshes.forEach(mesh => {
          mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-centerECEF.x, -centerECEF.y, -centerECEF.z));
          mesh.position.set(centerECEF.x, centerECEF.y, centerECEF.z);
          scene.add(mesh);
      });

      // Focus camera on model
      const upVector = new THREE.Vector3(centerECEF.x, centerECEF.y, centerECEF.z).normalize();
      scene.up.copy(upVector);
      camera.up.copy(upVector);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;  // Adjust damping for smoother transitions


      // Focus Camera on Model
      const centerEPSG = convertTo9217(centerECEF.x, centerECEF.y, centerECEF.z);
      const size = new THREE.Vector3();
      const maxLength = bbox.getSize(size).length();
      const cameraEPSG = {
        x: centerEPSG.x,
        y: centerEPSG.y - maxLength * 0.4, 
        z: centerEPSG.z + maxLength * 0.4
      };

      // Convert EPSG back to ECEF and set camera position
      const cameraECEF = convertToECEF(cameraEPSG.x, cameraEPSG.y, cameraEPSG.z);
      camera.position.set(cameraECEF.x, cameraECEF.y, cameraECEF.z);
      controls.target.set(centerECEF.x, centerECEF.y, centerECEF.z);

      // Limit the camera's vertical rotation to prevent gimbal lock
      controls.maxPolarAngle = Math.PI * 0.75;  // Limit vertical rotation (45 degrees above/below the horizon)
      controls.minPolarAngle = Math.PI * 0.15;  // Optional: Allow some movement below horizon

      const boxHelper = new THREE.Box3Helper(bbox, 0xff00ff);
      scene.add(boxHelper);
      
      // Creata Raycaster Event
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      let isMouseDown = false;
      let mouseDownTime = 0;
      let mouseDownPosition = { x: 0, y: 0 };

      let lastClickTime = 0;
      let clickTimeout = null;

      // Sau khi gắn model, chỉ thêm sự kiện click một lần
      if (!clickHandlersRegistered) {
        window.addEventListener("mousedown", (event) => {
          isMouseDown = true;
          mouseDownTime = performance.now();
          mouseDownPosition = { x: event.clientX, y: event.clientY };
        });

        window.addEventListener("mouseup", (event) => {
          if (!isMouseDown) return;
          isMouseDown = false;

          const timeDiff = performance.now() - mouseDownTime;
          const moveDistance = Math.sqrt(
            Math.pow(event.clientX - mouseDownPosition.x, 2) +
            Math.pow(event.clientY - mouseDownPosition.y, 2)
          );

          if (timeDiff > 200 || moveDistance > 5) return;

          const now = performance.now();
          if (now - lastClickTime < 180) {
            clearTimeout(clickTimeout);
            return;
          }

          lastClickTime = now;

          clickTimeout = setTimeout(() => {
            handleSingleClick(event);
          }, 180);
        });

        clickHandlersRegistered = true;
      }

      function handleSingleClick(event) {
        // Get DOM Info-Panel
        const infoContent = document.getElementById('infoContent');

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        // 🔹 Khôi phục màu gốc cho tất cả đối tượng đã highlight trước đó
        if (Array.isArray(previousObjects)) {
          previousObjects.forEach(obj => {
            const colorAttr = obj.geometry?.attributes?.color;
            const originalColors = previousColors.get(obj);
            if (colorAttr && originalColors) {
              colorAttr.array.set(originalColors);
              colorAttr.needsUpdate = true;
            }
          });
        }

        // Reset danh sách lưu trạng thái highlight
        previousObjects = previousObjects || [];
        previousColors = previousColors || new Map();
        previousObjects.length = 0;  // Reset danh sách nhưng không gán lại thành null
        previousColors.clear();
        

        if (intersects.length > 0) {
          const clickedMesh = intersects[0].object;
          if (!clickedMesh.geometry || !clickedMesh.geometry.attributes) {
            console.warn("Lỗi: Không tìm thấy geometry của đối tượng!");
            return;
          }

          const objectIdAttr = clickedMesh.geometry.attributes.objectId;
          const colorAttr = clickedMesh.geometry.attributes.color;

          if (!objectIdAttr || !colorAttr) {
            // console.warn("Object ID hoặc Color Attribute không tồn tại!");
            return;
          }

          const faceIndex = intersects[0].face?.a;
          if (faceIndex === undefined) return;

          const objectId = objectIdAttr.array[faceIndex];

          // 🔹 Lưu trạng thái màu ban đầu của đối tượng
          const originalColors = new Float32Array(colorAttr.array);
          previousObjects.push(clickedMesh);
          previousColors.set(clickedMesh, originalColors);

          // 🔹 Thay đổi màu sắc của đối tượng được chọn
          for (let i = 0; i < colorAttr.count; i++) {
            if (objectIdAttr.array[i] === objectId) {
              colorAttr.setXYZ(i, 0, 1, 0); // Màu xanh lá cây
            }
          }
          colorAttr.needsUpdate = true;

          clickedMesh.material.vertexColors = true;
          clickedMesh.material.needsUpdate = true;

          // 🔹 Tìm thông tin đối tượng
          const objectInfo = clickedMesh.userData.metadata?.find(obj => obj.id === objectId);
          console.log("🔹 Thông tin đối tượng:", objectInfo);
          const [xCoord, yCoord, zCoord] = objectInfo.userData.cartesian_point_offset.split(',').map(coord => parseFloat(coord).toFixed(3));
          infoContent.innerHTML = `
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${objectInfo.name || "Unknown"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">X-Coor:</span>
              <span class="info-value">${xCoord || "Unknown"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Y-Coor:</span>
              <span class="info-value">${yCoord || "Unknown"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Z-Coor:</span>
              <span class="info-value">${zCoord || "Unknown"}</span>
            </div>
          `
        }
      }
    }
  );
}

function clearPreviousModel(scene) {
  const objectsToRemove = [];
  
  scene.traverse((child) => {
    if (child.isMesh) {
      objectsToRemove.push(child);
    }
  });

  objectsToRemove.forEach((object) => {
    // 🛑 Giải phóng bộ nhớ của geometry
    if (object.geometry) {
      object.geometry.dispose();
    }

    // 🛑 Giải phóng bộ nhớ của material
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => disposeMaterial(material));
      } else {
        disposeMaterial(object.material);
      }
    }

    scene.remove(object);
  });
}


function disposeMaterial(material) {
  Object.keys(material).forEach((key) => {
    if (material[key] && material[key].dispose) {
      material[key].dispose();
    }
  });
}