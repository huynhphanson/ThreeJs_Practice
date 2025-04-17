import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getECEFTransformFromEPSG } from './three-convertCoor.js';
import { generateInfoDefault, generateInfoHTML } from '../utils/generateInfoHTML.js';
import { modelGroups } from './three-modelGroups.js';

import proj4 from 'proj4';

proj4.defs('EPSG:9217',
  '+proj=tmerc +lat_0=0 +lon_0=108.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs +type=crs');

// DracoLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
dracoLoader.setDecoderConfig( { type: 'js' } );

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

let previousObjects = [];
let previousColors = new Map();

let clickHandlersRegistered = false;

export let centerECEF, cameraECEF;

// Get DOM Info-Panel
const infoContent = document.getElementById('infoContent');
infoContent.innerHTML = generateInfoDefault();

export function loadGLTFModel(path, scene, camera, controls, category) {
  clearPreviousModel(scene);

  if (!modelGroups[category]) modelGroups[category] = [];

  gltfLoader.load(path, (gltf) => {
    const model = gltf.scene;
    model.rotateX(Math.PI / 2);
    model.updateMatrixWorld(true);

    const metadata = [];
    const materialMap = new Map();
    let idCounter = 0;

    const bbox = new THREE.Box3().setFromObject(model);
    const centerEPSG = new THREE.Vector3();
    bbox.getCenter(centerEPSG);

    model.traverse((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld(true);

        const geom = child.geometry.clone();
        geom.applyMatrix4(child.matrixWorld);

        const objectId = new Float32Array(geom.attributes.position.count).fill(idCounter);
        geom.setAttribute('objectId', new THREE.BufferAttribute(objectId, 1));

        const colors = new Float32Array(geom.attributes.position.count * 3);
        const c = new THREE.Color().copy(child.material.color);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = c.r;
          colors[i + 1] = c.g;
          colors[i + 2] = c.b;
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        metadata.push({ id: idCounter, name: child.name || 'Unnamed', userData: { ...child.userData } });

        const key = child.material.uuid;
        if (!materialMap.has(key)) {
          materialMap.set(key, { geometries: [], material: child.material });
        }
        materialMap.get(key).geometries.push(geom);
        idCounter++;
      }
    });

    const mergedMeshes = [];
    materialMap.forEach(({ geometries, material }) => {
      const merged = BufferGeometryUtils.mergeGeometries(geometries, true);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.userData.metadata = metadata;
        mergedMeshes.push(mesh);
      }
    });

    const { ecef: originECEF, matrix: threeMatrix } = getECEFTransformFromEPSG(
      centerEPSG.x, centerEPSG.y, centerEPSG.z
    );

    mergedMeshes.forEach(mesh => {
      mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-centerEPSG.x, -centerEPSG.y, -centerEPSG.z));
      mesh.applyMatrix4(threeMatrix);
      mesh.frustumCulled = false;
      mesh.material.roughness = 1;
      mesh.name = category;
      modelGroups[category].push(mesh);
      scene.add(mesh);
    });

    // Camera focus
    const offset = centerEPSG.clone().add(new THREE.Vector3(-100, -200, 300));
    const { ecef: cameraECEF } = getECEFTransformFromEPSG(offset.x, offset.y, offset.z);
    
    centerECEF = new THREE.Vector3(originECEF.x, originECEF.y, originECEF.z);
    const upVector = centerECEF.clone().normalize();
    scene.up.copy(upVector);
    camera.up.copy(upVector);
    camera.position.copy(cameraECEF);
    controls.target.copy(centerECEF);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.update();

    // CLICK + HIGHLIGHT
    if (!clickHandlersRegistered) {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let isMouseDown = false;
      let mouseDownTime = 0;
      let mouseDownPosition = { x: 0, y: 0 };
      let lastClickTime = 0;
      let clickTimeout = null;

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
          (event.clientX - mouseDownPosition.x) ** 2 +
          (event.clientY - mouseDownPosition.y) ** 2
        );
        if (timeDiff > 200 || moveDistance > 5) return;

        const now = performance.now();
        if (now - lastClickTime < 180) {
          clearTimeout(clickTimeout);
          return;
        }

        lastClickTime = now;
        clickTimeout = setTimeout(() => {
          handleClick(event);
        }, 180);
      });

      function handleClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (Array.isArray(previousObjects)) {
          previousObjects.forEach(obj => {
            const colorAttr = obj.geometry?.attributes?.color;
            const original = previousColors.get(obj);
            if (colorAttr && original) {
              colorAttr.array.set(original);
              colorAttr.needsUpdate = true;
            }
          });
        }
        previousObjects = [];
        previousColors.clear();

        if (intersects.length > 0) {
          const mesh = intersects[0].object;
          const objIdAttr = mesh.geometry?.attributes?.objectId;
          const colorAttr = mesh.geometry?.attributes?.color;
          const faceIndex = intersects[0].face?.a;
          if (!objIdAttr || !colorAttr || faceIndex === undefined) return;

          const objId = objIdAttr.array[faceIndex];
          const backup = new Float32Array(colorAttr.array);
          previousObjects.push(mesh);
          previousColors.set(mesh, backup);

          for (let i = 0; i < colorAttr.count; i++) {
            if (objIdAttr.array[i] === objId) {
              colorAttr.setXYZ(i, 0, 1, 0);
            }
          }
          colorAttr.needsUpdate = true;
          mesh.material.vertexColors = true;
          mesh.material.needsUpdate = true;

          const meta = mesh.userData.metadata?.find(obj => obj.id === objId);
          const infoContent = document.getElementById('infoContent');
          if (meta && infoContent) {
            infoContent.innerHTML = generateInfoHTML(meta);
          }
        }
      }

      clickHandlersRegistered = true;
    }

  }, undefined, (err) => {
    console.error('❌ Error loading GLTF:', err);
  });
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