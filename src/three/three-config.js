import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, RGBELoader } from 'three/examples/jsm/Addons.js';

export function createScene () {
  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);
  return scene
}

export function createCamera () {
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.01;
  const far = 2000;

  const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );

  camera.up = new THREE.Vector3(0, 0, 1);
  camera.position.set(-10, -100, 250);
  return camera
}

export function createRenderer () {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight);
  return renderer
}

export function createControls (camera, renderer) {
  const controls = new OrbitControls (camera, renderer.domElement)
  controls.target = new THREE.Vector3(150, -130, -90);
  controls.update();
  controls.enableDamping = true;
  return controls
}

export function createLabelRenderer() {
  const labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  return labelRenderer
}

export function createEnvironment (path) {
  return new RGBELoader().load(path)
}