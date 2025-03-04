import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/examples/jsm/Addons.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';

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

// DracoLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' );
dracoLoader.setDecoderConfig( { type: 'js' } );

// GLTFLoader
export async function loadGLTFPath() {
	const response = await fetch(`http://localhost:3008/uploads`);
	const data = await response.json();
	const gltfPath = data.url;
	return gltfPath
}

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
export function loadGLTFModel(path) {
	return new Promise((resolve) => {
    gltfLoader.load(
      path, 
      function (gltf) {
        gltf.scene.position.z = 0;
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
	mesh.name = name || 'point';
	return mesh;
}

// OBJLoader
const manager = new THREE.LoadingManager();
manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
  console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onLoad = function ( ) {
  console.log( 'Loading OBJ complete!');
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
  console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onError = function ( url ) {
  console.log( 'There was an error loading ' + url );
};
const objLoader = new OBJLoader(manager);
export function objModel(path, ele, color) {
  objLoader.load(path, 
    function (object) {
      object.traverse(node => {
        if(node.isMesh){
          node.material.color.set(color);
        }
      });
      object.position.z = ele;
      obj3d.add(object);
    }, (xhr) => {
      console.log('>>>ObjLoader:',(xhr.loaded / xhr.total * 100) + ' %loaded');
    }, (error) => {
      console.log('>>>ObjLoader Status: Error Happened');
    }
  );
};