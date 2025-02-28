import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1OGM1YmMzMy1kYjI1LTRjNGItOTY5Ni1jZmUyMmMxMzRiNDYiLCJpZCI6MjM2MjU0LCJpYXQiOjE3MjQyOTI4Nzh9.Jf658KQXXGt0BQHXyg3YcVdNzqRtWUgbkv1ppatp79M";

export async function initCesium() {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });
  return viewer;
}
