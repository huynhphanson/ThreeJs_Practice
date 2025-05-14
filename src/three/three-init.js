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

export function threeInit () {

  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer();
  const controls = createControls(camera, renderer);
  const composer = outline(renderer, scene, camera);

  // CSS2DRenderer
  const labelRenderer = createLabelRenderer();

  // Environment
  const envPath = '../../assets/environments/rogland_moonlit_night_4k.hdr'
  const environmentMap = createEnvironment(envPath)
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = environmentMap;
  renderer.toneMappingExposure = 1.5; // tăng từ mặc định 1.0

  return {scene, camera, renderer, controls, labelRenderer, composer}
}