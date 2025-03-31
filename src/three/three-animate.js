import Stats from 'three/examples/jsm/libs/stats.module.js';

// Stats FPS
const statsFPS = new Stats();
statsFPS.showPanel(0);
document.body.appendChild(statsFPS.dom);
statsFPS.dom.style.position = 'absolute';
statsFPS.dom.style.left = '10px';
statsFPS.dom.style.top = '350px';

// Stats MS
const statsMS = new Stats();
statsMS.showPanel(1);
document.body.appendChild(statsMS.dom);
// Thay đổi vị trí xuống góc phải dưới màn hình
statsMS.dom.style.position = 'absolute';
statsMS.dom.style.left = '10px';
statsMS.dom.style.top = '400px';

// Stats MB
const statsMB = new Stats();
statsMB.showPanel(2);
document.body.appendChild(statsMB.dom);
// Thay đổi vị trí xuống góc phải dưới màn hình
statsMB.dom.style.position = 'absolute';
statsMB.dom.style.left = '10px';
statsMB.dom.style.top = '450px';

export function animateLoop(controls, scene, camera, renderer, labelRenderer, composer) {
  function animate() {
    statsFPS.begin();
    statsMS.begin();
    statsMB.begin();

    controls.update();
    labelRenderer.render(scene, camera);
    renderer.render(scene, camera);
    composer.render();
    renderer.setAnimationLoop( animate );
    statsFPS.end();
    statsMS.end();
    statsMB.end();
 
  }
  animate();
}
