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
/*       imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
        maximumLevel: 18  // giới hạn để tránh zoom quá sâu gây lỗi
      }), */
      contextOptions: {
        webgl: {
            alpha: false,
            antialias: true,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: false,
            depth: true,
            stencil: false
        },
      },
      orderIndependentTranslucency: true
  });
  cesiumViewer.scene.screenSpaceCameraController.enableTilt = false;
  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;
  cesiumViewer.scene.highDynamicRange = false;
  cesiumViewer.scene.useDepthPicking = false;
  // Đợi Cesium load xong tiles trước khi ẩn loading
  cesiumViewer.scene.globe.tileLoadProgressEvent.addEventListener(function (queuedTiles) {
    if (queuedTiles === 0) {
      document.getElementById('loading-overlay').style.display = 'none';
      cesiumViewer.scene.globe.tileLoadProgressEvent.removeEventListener(this); // gỡ sau khi xong
    }
  });

  return cesiumViewer;
}

export async function setBasemap(type, cesiumViewer) {
  let imageryProvider;

  switch (type) {
    case 'streets':
      imageryProvider = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
        maximumLevel: 18
      });
      cesiumViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      break;
    case 'hybrid':
      imageryProvider = new Cesium.IonImageryProvider({ assetId: 3 });
      cesiumViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      break;
    case 'traffic':
      imageryProvider = new Cesium.IonImageryProvider({ assetId: 4 });
      cesiumViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      break;
    default:
      console.warn("Unknown basemap:", type);
      return;
  }

  cesiumViewer.imageryLayers.removeAll();
  cesiumViewer.imageryLayers.addImageryProvider(imageryProvider);
}
