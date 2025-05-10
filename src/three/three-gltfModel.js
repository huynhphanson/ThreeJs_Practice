import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getECEFTransformFromEPSG } from './three-convertCoor.js';
import { generateInfoHTML } from '../utils/generateInfoHTML.js';
import { addToModelGroup } from './three-modelGroups.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { isClickOnUI } from '../utils/ui-main.js';
import { resetHighlight, applyHighlight } from '../utils/highlighUtils.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
draco.setDecoderConfig({ type: 'js' });

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
loader.setMeshoptDecoder(MeshoptDecoder);

let clickReady = false;
export let centerECEF, cameraECEF;

export async function loadGLTFModel(path, scene, camera, controls, category, clear = false) {
  if (clear) clearScene(scene);

  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => {
      const model = prepModel(gltf.scene);
      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const { ecef, matrix } = getECEFTransformFromEPSG(center.x, center.y, center.z);

      const { meshes, centerResult } = mergeMeshes(model, center, matrix, scene, category);

      setupCamera(center, centerResult, camera, controls);

      centerECEF = centerResult.clone();
      cameraECEF = camOffset(center);
      resolve();
    }, undefined, reject);
  });
}

// === Sub Functions ===

function prepModel(model) {
  model.rotateX(Math.PI / 2);
  model.updateMatrixWorld(true);
  return model;
}

function mergeMeshes(model, center, matrix, scene, category) {
  const map = new Map();
  const logUV = false; // ✅ bật/tắt log UV bị thiếu
  let idx = 0;

  model.traverse((obj) => {
    if (!obj.isMesh) return;

    const g = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);

    // ⚠️ Bổ sung normal nếu thiếu
    if (!g.attributes.normal) g.computeVertexNormals();

    // ⚠️ Thêm dummy UV nếu thiếu
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      const dummyUV = new Float32Array(count * 2).fill(0);
      g.setAttribute('uv', new THREE.BufferAttribute(dummyUV, 2));
      if (logUV) console.warn(`⚠️ Missing UV at mesh "${obj.name}" → filled with dummy UV`);
    }

    // Color attribute (copy từ vật liệu)
    const col = new Float32Array(g.attributes.position.count * 3);
    const c = obj.material.color;
    for (let i = 0; i < col.length; i += 3) {
      col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('objectId', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(idx), 1));

    // Group theo vật liệu
    const key = obj.material.uuid;
    if (!map.has(key)) map.set(key, { geoms: [], mat: obj.material, groups: [], meta: [] });

    const entry = map.get(key);
    const start = entry.geoms.reduce((sum, gg) => sum + gg.index.count, 0);
    entry.geoms.push(g);
    entry.groups.push({ start, count: g.index.count, groupIndex: idx });

    // Tính size & center
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);

    // Group userData theo prefix
    const groupedUserData = {};
    const userData = obj.userData || {};
    for (const key in userData) {
      const [prefix, subKey] = key.split('_', 2);
      if (!subKey) continue;
      if (!groupedUserData[prefix]) groupedUserData[prefix] = {};
      groupedUserData[prefix][subKey] = userData[key];
    }

    entry.meta.push({
      id: idx,
      name: obj.name || 'Unnamed',
      ...groupedUserData,
      userData: JSON.parse(JSON.stringify(userData)),
      size,
      center
    });

    idx++;
  });

  const meshes = [];

  map.forEach(({ geoms, mat, groups, meta }) => {
    const merged = BufferGeometryUtils.mergeGeometries(geoms, true);
    if (!merged) return;

    merged.clearGroups();
    groups.forEach(g => merged.addGroup(g.start, g.count, g.groupIndex));
    merged.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

    const mesh = new THREE.Mesh(merged, mat);
    mesh.applyMatrix4(matrix);
    mesh.geometry.computeBoundsTree();
    mesh.userData.metadata = meta;
    mesh.material.vertexColors = true;
    mesh.frustumCulled = false;

    scene.add(mesh);
    addToModelGroup(category, mesh);
    meshes.push(mesh);
  });

  return { meshes, centerResult: getECEFTransformFromEPSG(center.x, center.y, center.z).ecef };
}


function setupCamera(center, ecef, cam, ctrl) {
  const offset = center.clone().add(new THREE.Vector3(-100, -200, 300));
  const camPos = getECEFTransformFromEPSG(offset.x, offset.y, offset.z).ecef;
  const up = ecef.clone().normalize();

  cam.up.copy(up);
  cam.position.copy(camPos);
  ctrl.target.copy(ecef);
  ctrl.enableDamping = true;
  ctrl.dampingFactor = 0.1;
  ctrl.update();
}

function camOffset(center) {
  const offset = center.clone().add(new THREE.Vector3(-100, -200, 300));
  return getECEFTransformFromEPSG(offset.x, offset.y, offset.z).ecef;
}

function registerClick(scene, camera) {
  if (clickReady) return;
  clickReady = true;

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let down = false, downTime = 0, lastClick = 0;
  let downPos = { x: 0, y: 0 }, timeout = null;

  window.addEventListener("mousedown", (e) => {
    down = true;
    downTime = performance.now();
    downPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", (e) => {
    if (!down) return;
    down = false;
    const t = performance.now() - downTime;
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (t > 200 || dist > 5) return;

    const now = performance.now();
    if (now - lastClick < 180) {
      clearTimeout(timeout);
      return;
    }
    lastClick = now;
    timeout = setTimeout(() => onClick(e), 180);
  });

  window.addEventListener("dblclick", (e) => {
    if (isClickOnUI(e)) return;
    onClick(e);
  });

  function onClick(e) {
    if (isClickOnUI(e)) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);

    const hits = ray.intersectObjects(scene.children, true);
    resetHighlight();

    if (!hits.length) return;

    const mesh = hits[0].object;
    const idAttr = mesh.geometry?.attributes?.objectId;
    const colAttr = mesh.geometry?.attributes?.color;
    const face = hits[0].face?.a;

    const objId = applyHighlight(mesh, idAttr, colAttr, face, scene);
    if (objId === null) return;

    const meta = mesh.userData.metadata?.find(obj => obj.id === objId);
    console.log(meta);
    if (meta && infoContent) infoContent.innerHTML = generateInfoHTML(meta);
  }
}

function clearScene(scene) {
  const list = [];
  scene.traverse((c) => { if (c.isMesh) list.push(c); });
  list.forEach((o) => {
    o.geometry?.dispose();
    o.geometry?.disposeBoundsTree?.();
    if (Array.isArray(o.material)) o.material.forEach(cleanMat);
    else cleanMat(o.material);
    scene.remove(o);
  });
}

function cleanMat(mat) {
  Object.keys(mat).forEach((k) => {
    if (mat[k] && mat[k].dispose) mat[k].dispose();
  });
}
