import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export function initCesium() {
  const cesiumContainer = document.getElementById('cesium-container');

  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMWM2NzhhMS04Mjg1LTQ5NDQtOGMyMS1iNDE5NWEwMzc1Y2MiLCJpZCI6MjgxMjAyLCJpYXQiOjE3NDExNDM4ODd9.m4Y1TPGxWchdX4DAN61hT7MiBCUxPDFq5OAmkPIgQbk";

  const cesiumViewer = new Cesium.Viewer(cesiumContainer, {
      useDefaultRenderLoop: false,
      selectionIndicator: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      targetFrameRate: 60,
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      }),
      contextOptions:{
        webgl: {
            alpha: false,
            antialias: true,
            preserveDrawingBuffer : true,
            failIfMajorPerformanceCaveat: false,
            depth:true,
            stencil:false,
            anialias:false
        },
      },
      orderIndependentTranslucency: true,
      baseLayerPicker: false,
      geocoder: false,
      automaticallyTrackDataSourceClocks: false,
      dataSources: null,
      clock: null,
      terrainShadows: Cesium.ShadowMode.DISABLED
    }
  );
  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;

/*   var minWGS84 = [109.182779, 12.190223];
  var maxWGS84 = [109.189507, 12.197322];
  const center = Cesium.Cartesian3.fromDegrees(
    (minWGS84[0] + maxWGS84[0]) / 2,
    ((minWGS84[1] + maxWGS84[1]) / 2),
    2000
  );
  cesiumViewer.camera.flyTo({
    destination : center,
    orientation : {
        heading : Cesium.Math.toRadians(0),
        pitch : Cesium.Math.toRadians(-80),
        roll : Cesium.Math.toRadians(0)
    },
    duration: .1
  }) */
  return cesiumViewer;
}

// Chuyển đổi tọa độ địa lý sang Cartesian3
export function toCartesian(lon, lat, height = 0) {
  return Cesium.Cartesian3.fromDegrees(lon, lat, height);
}
