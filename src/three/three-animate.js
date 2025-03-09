export function animateLoop(controls, scene, camera, renderer, labelRenderer, composer) {
  function animate() {
      controls.update();
      labelRenderer.render(scene, camera);
      renderer.render(scene, camera);
      renderer.setAnimationLoop( animate );
      composer.render();
  }
  animate();
}
