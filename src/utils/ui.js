import { loadGLTFModel } from "../three/three-func";

// Show Progress Bar 
export async function progressBarModel (gltfBox, progressBar, loadGLTFPath, scene ) {
  if(gltfBox.checked){
    progressBar.style.display = 'flex';
    progressBar.style.width = '0%';
    
    progressBar.getAnimations().forEach(anim => anim.cancel());
    let start = Date.now();
    try {
      const gltfPath = await loadGLTFPath();
      const gltf = await loadGLTFModel(gltfPath);
      let end = Date.now();
      let timeLoad = end - start;
      const animation = progressBar.animate([
        { width: '0%' },
        { width: '100%' }
      ], {
        duration: timeLoad,
        fill: 'forwards'
      });
      await animation.finished;
      scene.add(gltf.scene);
    }	catch (error) {
      console.error('Lỗi khi tải mô hình:', error);
    }	finally {
      progressBar.style.display = 'none';
    }
  } else {
    scene.traverse(child => {
      if (child.name === 'gltf model') {
        scene.remove(child);
      }
    })
  }
}