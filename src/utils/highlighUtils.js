let previousObjects = [];
let previousColors = new Map();

export function resetHighlight() {
  previousObjects.forEach(obj => {
    const colorAttr = obj.geometry?.attributes?.color;
    const original = previousColors.get(obj);
    if (colorAttr && original) {
      colorAttr.array.set(original);
      colorAttr.needsUpdate = true;
    }
  });
  previousObjects = [];
  previousColors.clear();
}

export function applyHighlight(mesh, objIdAttr, colorAttr, faceIndex) {
  if (!objIdAttr || !colorAttr || faceIndex === undefined) return null;

  const objId = objIdAttr.array[faceIndex];
  const backup = new Float32Array(colorAttr.array);
  previousObjects.push(mesh);
  previousColors.set(mesh, backup);

  for (let i = 0; i < colorAttr.count; i++) {
    if (objIdAttr.array[i] === objId) {
      colorAttr.setXYZ(i, 0, 1, 0);
    }
  }
  colorAttr.needsUpdate = true;
  return objId;
}
