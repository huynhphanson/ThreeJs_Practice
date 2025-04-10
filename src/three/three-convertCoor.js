import * as THREE from 'three';
import proj4 from 'proj4';

proj4.defs('EPSG:9217',
  '+proj=tmerc +lat_0=0 +lon_0=108.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs +type=crs');
// 2️⃣ Hàm chuyển đổi từng vertex trong GLTF từ VN-2000 → ECEF
export function convertToECEF(x, y, z) {
  
  const pointcloudProjection = proj4('EPSG:9217');
  const mapProjection = proj4.defs('WGS84');
  const toMap = proj4(pointcloudProjection, mapProjection);
  // Chuyển VN-2000 → WGS84
  const [lon, lat] = toMap.forward([x, y]);
  const height = z;

  // Chuyển từ WGS84 → ECEF
  const ecef = Cesium.Cartesian3.fromDegrees(lon, lat, height);

  // Chuyển từ ECEF về hệ local (Cesium - Three.js)
  const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(ecef);
  return new THREE.Vector3(matrix[12], matrix[13], matrix[14]);
}

export function convertTo9217(ecefX, ecefY, ecefZ) {

  const cartesian = new Cesium.Cartesian3(ecefX, ecefY, ecefZ);
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const height = cartographic.height;

  const pointcloudProjection = proj4('EPSG:9217');
  const mapProjection = proj4.defs('WGS84');
  const toVN2000 = proj4(mapProjection, pointcloudProjection);
  const [x, y] = toVN2000.forward([lon, lat]);

  return new THREE.Vector3(x, y, height) ;
}
