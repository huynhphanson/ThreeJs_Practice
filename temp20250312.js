function syncThreeToCesium() {
  let threePosition = new THREE.Vector3();
  let threeQuaternion = new THREE.Quaternion();

  // ✅ Lấy vị trí và góc xoay từ Three.js
  camera.getWorldPosition(threePosition);
  camera.getWorldQuaternion(threeQuaternion);

  console.log('🔹 Three.js Position:', threePosition);
  console.log('🔹 Three.js Quaternion:', threeQuaternion);

  // ✅ Chuyển vị trí sang hệ Cesium
  let cesiumPosition = new Cesium.Cartesian3(threePosition.x, threePosition.y, threePosition.z);

  // ✅ Chuyển Quaternion sang ma trận xoay
  let m = new THREE.Matrix4();
  m.makeRotationFromQuaternion(threeQuaternion);

  // ✅ Chuyển đổi hướng nhìn và hướng "up"
  let threeDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(m).normalize();
  let threeUp = new THREE.Vector3(0, 1, 0).applyMatrix4(m).normalize();

  let cesiumDirection = new Cesium.Cartesian3(threeDirection.x, threeDirection.y, threeDirection.z);
  let cesiumUp = new Cesium.Cartesian3(threeUp.x, threeUp.y, threeUp.z);

  Cesium.Cartesian3.normalize(cesiumDirection, cesiumDirection);
  Cesium.Cartesian3.normalize(cesiumUp, cesiumUp);

  // ✅ Cập nhật camera Cesium
  try {
      cesiumViewer.camera.setView({
          destination: cesiumPosition,
          orientation: {
              direction: cesiumDirection,
              up: cesiumUp
          }
      });
  } catch (error) {
      console.error("🚨 Lỗi setView():", error);
  }
}