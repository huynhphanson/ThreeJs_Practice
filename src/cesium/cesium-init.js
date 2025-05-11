export function initCesium() {
  const cesiumContainer = document.getElementById('cesium-container');

  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1OGM1YmMzMy1kYjI1LTRjNGItOTY5Ni1jZmUyMmMxMzRiNDYiLCJpZCI6MjM2MjU0LCJpYXQiOjE3MjQyOTI4Nzh9.Jf658KQXXGt0BQHXyg3YcVdNzqRtWUgbkv1ppatp79M";

  const cesiumViewer = new Cesium.Viewer(cesiumContainer, {
    useDefaultRenderLoop: false,
    selectionIndicator: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    baseLayerPicker: false,
    geocoder: false,
    terrainShadows: Cesium.ShadowMode.DISABLED,
    targetFrameRate: 60,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    contextOptions: {
      webgl: {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
        depth: true,
        stencil: false
      }
    },
    orderIndependentTranslucency: true
  });

  const scene = cesiumViewer.scene;
  scene.screenSpaceCameraController.enableTilt = false;
  scene.globe.depthTestAgainstTerrain = true;
  scene.highDynamicRange = false;
  scene.useDepthPicking = false;

  // ✅ Chỉ ẩn loading khi Cesium thực sự vẽ xong 1 khung hình có nội dung
  let hasRendered = false;
  scene.postRender.addEventListener(() => {
    if (hasRendered) return;

    const gl = scene.canvas.getContext('webgl') || scene.canvas.getContext('experimental-webgl');
    const pixels = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const isBlank = pixels.every(v => v === 0);
    if (!isBlank) {
      document.getElementById('loading-overlay').style.display = 'none';
      hasRendered = true;
    }
  });

  return cesiumViewer;
}

export async function setBasemap(type, cesiumViewer) {
  const providers = {
    streets: new Cesium.OpenStreetMapImageryProvider({
      url: 'https://a.tile.openstreetmap.org/',
      maximumLevel: 18
    }),
    hybrid: new Cesium.IonImageryProvider({ assetId: 3 }),
    traffic: new Cesium.IonImageryProvider({ assetId: 4 })
  };

  const imageryProvider = providers[type];
  if (!imageryProvider) {
    console.warn("Unknown basemap:", type);
    return;
  }

  cesiumViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  cesiumViewer.imageryLayers.removeAll();
  cesiumViewer.imageryLayers.addImageryProvider(imageryProvider);
}
