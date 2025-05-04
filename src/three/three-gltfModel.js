// === LOAD GLTF + BVH + RAYCAST + HIGHLIGHT + INFOPANEL (TỔ CHỨC GỌN) ===
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getECEFTransformFromEPSG } from './three-convertCoor.js';
import { generateInfoDefault, generateInfoHTML } from '../utils/generateInfoHTML.js';
import { addToModelGroup } from './three-modelGroups.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { isClickOnUI } from '../utils/ui-main.js';
import { resetHighlight, applyHighlight } from '../utils/highlighUtils.js';

// === SETUP ===
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
dracoLoader.setDecoderConfig({ type: 'js' });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

let clickHandlersRegistered = false;
export let centerECEF, cameraECEF;

const infoContent = document.getElementById('infoContent');
infoContent.innerHTML = generateInfoDefault();

// === LOAD MODEL ===
export async function loadGLTFModel(path, scene, camera, controls, category, clear = false) {
  if (clear) clearPreviousModel(scene);

  return new Promise((resolve, reject) => {
    gltfLoader.load(path, (gltf) => {
      const model = gltf.scene;
      
      model.rotateX(Math.PI / 2);
      model.updateMatrixWorld(true);
  
      const bbox = new THREE.Box3().setFromObject(model);
      const centerEPSG = bbox.getCenter(new THREE.Vector3());
      const { ecef: originECEF, matrix: threeMatrix } = getECEFTransformFromEPSG(centerEPSG.x, centerEPSG.y, centerEPSG.z);
  
      const materialMap = new Map();
      const meshes = [];
      let groupIndex = 0;
  
      model.traverse((child) => {
        if (!child.isMesh) return;
  
        child.updateMatrixWorld(true);
        const geom = child.geometry.clone().applyMatrix4(child.matrixWorld);
        if (!geom.index) geom.setIndex([...Array(geom.attributes.position.count).keys()]);
  
        const colorAttr = new Float32Array(geom.attributes.position.count * 3);
        const c = child.material.color;
        for (let i = 0; i < colorAttr.length; i += 3) {
          colorAttr[i] = c.r; colorAttr[i + 1] = c.g; colorAttr[i + 2] = c.b;
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
        geom.setAttribute('objectId', new THREE.BufferAttribute(new Float32Array(geom.attributes.position.count).fill(groupIndex), 1));
  
        const key = child.material.uuid;
        if (!materialMap.has(key)) materialMap.set(key, { geometries: [], material: child.material, groups: [], meta: [] });
  
        const group = materialMap.get(key);
        const indexStart = group.geometries.reduce((acc, g) => acc + g.index.count, 0);
  
        group.geometries.push(geom);
        group.groups.push({ start: indexStart, count: geom.index.count, groupIndex });
        const box = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        group.meta.push({
          id: groupIndex,
          name: child.name || 'Unnamed',
          userData: { ...child.userData },
          size,
          center
        });
        
  
        groupIndex++;
      });
  
      materialMap.forEach(({ geometries, material, groups, meta }) => {
        const merged = BufferGeometryUtils.mergeGeometries(geometries, true);
        if (!merged) return;
  
        merged.clearGroups();
        groups.forEach(g => merged.addGroup(g.start, g.count, g.groupIndex));
        merged.applyMatrix4(new THREE.Matrix4().makeTranslation(-centerEPSG.x, -centerEPSG.y, -centerEPSG.z));
  
        const mesh = new THREE.Mesh(merged, material);
        mesh.applyMatrix4(threeMatrix);
        mesh.geometry.computeBoundsTree();
        mesh.userData.metadata = meta;
        mesh.material.vertexColors = true;
        mesh.frustumCulled = false;
  
        scene.add(mesh);
        addToModelGroup(category, mesh)
        meshes.push(mesh);
      });
      
      centerECEF = originECEF.clone();
      const offset = centerEPSG.clone().add(new THREE.Vector3(-100, -200, 300));
      cameraECEF = getECEFTransformFromEPSG(offset.x, offset.y, offset.z).ecef;
  
      const up = centerECEF.clone().normalize();
      scene.up.copy(up);
      camera.up.copy(up);
      camera.position.copy(cameraECEF);
      controls.target.copy(centerECEF);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.update();
  
      // === RAYCAST INTERACTION ===
      if (!clickHandlersRegistered) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let isMouseDown = false, mouseDownTime = 0, lastClickTime = 0;
        let mouseDownPosition = { x: 0, y: 0 }, clickTimeout = null;
  
        window.addEventListener("mousedown", (e) => {
          isMouseDown = true;
          mouseDownTime = performance.now();
          mouseDownPosition = { x: e.clientX, y: e.clientY };
        });
  
        window.addEventListener("mouseup", (e) => {
          
          if (!isMouseDown) return;
          isMouseDown = false;
  
          const timeDiff = performance.now() - mouseDownTime;
          const moveDistance = Math.hypot(e.clientX - mouseDownPosition.x, e.clientY - mouseDownPosition.y);
          if (timeDiff > 200 || moveDistance > 5) return;
  
          const now = performance.now();
          if (now - lastClickTime < 180) {
            clearTimeout(clickTimeout);
            return;
          }
  
          lastClickTime = now;
          clickTimeout = setTimeout(() => handleClick(e), 180);
        });
        
        window.addEventListener("dblclick", (e) => {
          if (isClickOnUI(e)) return;
          handleClick(e);
        });
        
        function handleClick(event) {
          if (isClickOnUI(event)) return; // trước raycast
          mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
        
          const intersects = raycaster.intersectObjects(scene.children, true);
          resetHighlight(); // 🧹 xóa highlight cũ
        
          if (!intersects.length) return;
        
          const mesh = intersects[0].object;
          const objIdAttr = mesh.geometry?.attributes?.objectId;
          const colorAttr = mesh.geometry?.attributes?.color;
          const faceIndex = intersects[0].face?.a;
        
          const objId = applyHighlight(mesh, objIdAttr, colorAttr, faceIndex, scene);
          if (objId === null) return;
        
          const meta = mesh.userData.metadata?.find(obj => obj.id === objId);
          if (meta && infoContent) {
            infoContent.innerHTML = generateInfoHTML(meta);
          }
        }
        clickHandlersRegistered = true;
      };
      resolve();
    }, undefined, (err) => {
      console.error('❌ Error loading GLTF:', err);
      reject(err); // ❌ Bắt lỗi
    });
  });
};

// === CLEAR MODEL ===
function clearPreviousModel(scene) {
  const objectsToRemove = [];
  scene.traverse((child) => { if (child.isMesh) objectsToRemove.push(child); });

  objectsToRemove.forEach((object) => {
    object.geometry?.dispose();
    object.geometry?.disposeBoundsTree?.();
    if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
    else disposeMaterial(object.material);
    scene.remove(object);
  });
}

function disposeMaterial(material) {
  Object.keys(material).forEach((key) => {
    if (material[key] && material[key].dispose) material[key].dispose();
  });
}
