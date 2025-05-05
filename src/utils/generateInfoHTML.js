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

export function generateInfoHTML(meta) {
  if (!meta) return '<div>No data</div>';

  const toRow = (key, value) => `
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; vertical-align: top;">${key}</td>
      <td style="padding: 4px 8px;">${value}</td>
    </tr>
  `;

  const section = (title, rows) => `
    <h3 style="margin: 8px 0 4px;">${title}</h3>
    <table style="border-collapse: collapse; width: 100%; font-size: 13px;">${rows}</table>
  `;

  const formatVector = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

  // Section: Basic
  const basicRows = [
    toRow('Name', meta.name),
    toRow('ID', meta.id),
    toRow('Size', formatVector(meta.size)),
    toRow('Center', formatVector(meta.center)),
  ];

  // Section: Survey Data
  const surveyRows = meta.surveyData
  ? Object.entries(meta.surveyData).map(([k, v]) => {
      const isURL = typeof v === 'string' && v.startsWith('http');
      const display = isURL ? `<a href="${v}" target="_blank" style="color: blue;">${v}</a>` : v;
      return toRow(k, display);
    }).join('')
  : '<tr><td colspan="2" style="padding: 4px 8px;">(None)</td></tr>';


  // Section: Geometry Info
  const geomRows = meta.geometryInfo
    ? Object.entries(meta.geometryInfo).map(([k, v]) => toRow(k, v)).join('')
    : '<tr><td colspan="2" style="padding: 4px 8px;">(None)</td></tr>';

  return `
    <div style="font-family: sans-serif;">
      ${section('Thông tin cơ bản', basicRows.join(''))}
      ${section('Survey Data', surveyRows)}
      ${section('Geometry Info', geomRows)}
    </div>
  `;
}
