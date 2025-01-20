import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Config
export const obj3d = new THREE.Object3D;
export const group = new THREE.Group;

// Texture
export function texture(path) {
  const textureLoader = new THREE.TextureLoader().load(path);
  textureLoader.wrapS = THREE.RepeatWrapping;
  textureLoader.wrapT = THREE.RepeatWrapping;
  textureLoader.repeat.set(0.05, 0.05);
  return textureLoader;
};
const buildMaterial = [];
buildMaterial.push(new THREE.MeshBasicMaterial({map: texture('../texture/2.png')}));
buildMaterial.push(new THREE.MeshBasicMaterial({map: texture('../texture/apartments4.png')}));

// Add ShapeGeometry
export async function loadJson(path, [shapeP, shapeL], lineC) {
  await fetch(path) // Fetch Json data
  .then(res => res.json())
  .then(data => {
    data.forEach(
      value => {
      const shape = new THREE.Shape();
      const points = [];
      if(value.geometry.type === 'Polygon'){
        shape.moveTo(value.geometry.coordinates[0][0][0], value.geometry.coordinates[0][0][1]);
        value.geometry.coordinates[0].forEach(coor => {
          shape.lineTo(coor[0], coor[1]);
        });
      };
      if(value.geometry.type === 'LineString'){
        value.geometry.coordinates.forEach(coor => {
          points.push(new THREE.Vector3(coor[0], coor[1], coor[2]));
        });
      }
      const shapeGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 10,
      });
      const shapeMaterial = new THREE.MeshBasicMaterial({
        color: shapeP,
        map: texture('../texture/apartments4.png')
      });
      const meshShapes = new THREE.Mesh(shapeGeometry, buildMaterial);
      meshShapes.position.z = 0;
      obj3d.add(meshShapes);
      // add border line
      const edges = new THREE.EdgesGeometry(shapeGeometry);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: shapeL,
      }));
      obj3d.add(line);

      // add lineString
      const lineStringGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineStringMat = new THREE.LineBasicMaterial({
        color: lineC,
        linewidth: 10,
        vertexColors: false
      })
      const lineString = new THREE.Line(lineStringGeo, lineStringMat);
      obj3d.add(lineString);
    });
  });
};

// GLTFLoader
const gltfLoader = new GLTFLoader();
export function loadGLTFModel(path) {
	return new Promise((resolve) => {
    gltfLoader.load(
      path, 
      function (gltf) {
        gltf.scene.position.z = 50;
        gltf.scene.name = 'gltf model';
        resolve(gltf);
      },
      function ( xhr ) {
        // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      function ( error ) {
        console.log( 'An error happened' );
      }
    );
  })
};

// create PointMesh
export function createCpointMesh (name, x, y, z) {
	const geo = new THREE.SphereGeometry(2); // radius of point
	const mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	mesh.name = name;
	return mesh;
}