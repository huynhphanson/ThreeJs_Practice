import * as THREE from 'three';
import {
  createScene,
  createCamera,
  createRenderer,
  createControls,
  createLabelRenderer,
  createEnvironment,
} from './three-config.js'
import { outline } from './three-outline.js';
import { toCartesian } from '../cesium/cesium-init.js';

export function threeInit () {

  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer();
  const controls = createControls(camera, renderer);
  const composer = outline(renderer, scene, camera);

  // CSS2DRenderer
  const labelRenderer = createLabelRenderer();

  // Environment
  const envPath = '../../environments/qwantani_morning_4k.hdr'
  const environmentMap = createEnvironment(envPath)
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = environmentMap;

  return {scene, camera, renderer, controls, labelRenderer, composer}
}