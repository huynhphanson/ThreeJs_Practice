export function initCesium() {
  const cesiumContainer = document.getElementById('cesium-container');

  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMWM2NzhhMS04Mjg1LTQ5NDQtOGMyMS1iNDE5NWEwMzc1Y2MiLCJpZCI6MjgxMjAyLCJpYXQiOjE3NDExNDM4ODd9.m4Y1TPGxWchdX4DAN61hT7MiBCUxPDFq5OAmkPIgQbk";

  const cesiumViewer = new Cesium.Viewer(cesiumContainer, {
      useDefaultRenderLoop: false, // Nếu bạn dùng Three.js để render chính, nên tắt
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
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      }),
      contextOptions: {
        webgl: {
            alpha: false,
            antialias: true,
            preserveDrawingBuffer: true, // Giữ frame để có thể capture ảnh
            failIfMajorPerformanceCaveat: false,
            depth: true,
            stencil: false
        },
      },
      orderIndependentTranslucency: true
  });

  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;

  return cesiumViewer;
}
