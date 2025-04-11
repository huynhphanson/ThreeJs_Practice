// generateInfoHTML.js
export function generateInfoDefault() {
  return `
    <div class="info-row">
      <span class="info-label">Name:</span>
      <span class="info-value">${"Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">X-Coor:</span>
      <span class="info-value">${"Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Y-Coor:</span>
      <span class="info-value">${"Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Z-Coor:</span>
      <span class="info-value">${"Unknown"}</span>
    </div>
  `;
}

export function generateInfoHTML(objectInfo) {
  if (!objectInfo || !objectInfo.userData || !objectInfo.userData.cartesian_point_offset) {
    return `<div class="info-row">No data available</div>`;
  }

  const [xCoord, yCoord, zCoord] = objectInfo.userData.cartesian_point_offset
    .split(',')
    .map(coord => parseFloat(coord).toFixed(3));

  return `
    <div class="info-row">
      <span class="info-label">Name:</span>
      <span class="info-value">${objectInfo.name || "Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">X-Coor:</span>
      <span class="info-value">${xCoord || "Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Y-Coor:</span>
      <span class="info-value">${yCoord || "Unknown"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Z-Coor:</span>
      <span class="info-value">${zCoord || "Unknown"}</span>
    </div>
  `;
}
