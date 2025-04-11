// modelGroups.js
export const modelGroups = {
  Tiles3d: [],
  surface: [],
  buildings: [],
};

export function addToModelGroup(category, mesh) {
  if (!modelGroups[category]) {
    modelGroups[category] = [];
  }
  modelGroups[category].push(mesh);
}

