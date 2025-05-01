export function initProjectInfo() {
  const existing = document.getElementById('project-overlay');
  if (existing) {
    const panel = document.getElementById('project-panel');
    if (panel) {
      panel.style.top = '20%';
      panel.style.opacity = 0;
      existing.style.opacity = 0;

      const onFadeOutDone = () => {
        existing.remove();
        existing.removeEventListener('transitionend', onFadeOutDone);
      };

      existing.addEventListener('transitionend', onFadeOutDone);
    } else {
      existing.remove();
    }
    return;
  }

  // === Overlay mờ toàn màn hình ===
  const overlay = document.createElement('div');
  overlay.id = 'project-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 999,
    opacity: 0,
    transition: 'opacity 0.4s ease'
  });

  Object.assign(panel.style, {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    minWidth: '320px',
    background: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    opacity: 0,
    transition: 'all 0.4s ease',
    pointerEvents: 'auto'
  });

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // === Kích hoạt hiệu ứng xuất hiện sau 1 frame
  requestAnimationFrame(() => {
    overlay.style.opacity = 1;     // ✅ overlay mờ vào
    panel.style.top = '50%';       // ✅ panel rơi xuống
    panel.style.opacity = 1;       // ✅ panel hiện dần
  });
  
  // === Bảng thông tin ===
  const panel = document.createElement('div');
  panel.id = 'project-panel';
  panel.innerHTML = `
    <h3>Thông tin</h3>
    <p>Dữ liệu đo, mô hình, hoặc hướng dẫn...</p>
  `;
}
