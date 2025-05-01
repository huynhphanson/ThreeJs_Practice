// modelGroups.js
export const modelGroups = {
  Tiles3d: [],
  Bridge: [],
  Buildings: [],
};

export function addToModelGroup(category, mesh) {
  if (!modelGroups[category]) {
    modelGroups[category] = [];
  }
  modelGroups[category].push(mesh);
}

