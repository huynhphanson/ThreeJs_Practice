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
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
        maximumLevel: 18  // giới hạn để tránh zoom quá sâu gây lỗi
      }),

      /* //Google Base
      imageryProviderViewModels: [
        Cesium.createDefaultImageryProviderViewModels(),
        new Cesium.ProviderViewModel({
          name: 'Google Maps Satellite',
          iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Google_Maps_logo_2019.svg/100px-Google_Maps_logo_2019.svg.png',
          creationFunction: function() {
            return new Cesium.UrlTemplateImageryProvider({
              url: 'https://maps.googleapis.com/maps/api/staticmap?center={y},{x}&zoom={z}&size=256x256&maptype=satellite&key=AIzaSyAnPbwOCbwVzeegrR-_JcPgcY4AxL1SlfQ',
              credit: '© Google',
            });
          }
        })
      ],
      imageryProviderViewModel: Cesium.createDefaultImageryProviderViewModels()[0], // Chọn ảnh vệ tinh Google */

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

  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;
  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;
  cesiumViewer.scene.highDynamicRange = false;
  cesiumViewer.scene.useDepthPicking = false;
  // cesiumViewer.terrainProvider = Cesium.createWorldTerrain();


  return cesiumViewer;
}
