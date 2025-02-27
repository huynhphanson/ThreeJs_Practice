const iconButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel')

iconButtons.forEach(button => {
  button.addEventListener('click', () => {
    const panelId = button.getAttribute('data-panel');
    const panel = document.getElementById(panelId);
    panels.forEach(p => p.classList.remove('active'));
    if (panel) {
      panel.classList.add('active');
    } 
  })
})

// Ẩn panel khi nhấn ra ngoài
document.addEventListener("click", (event) => {
  if (!event.target.closest(".icon-bar-right") && !event.target.closest(".panel")) {
      panels.forEach(p => p.classList.remove("active"));
  }
});