// js/core/changelog_modal.js
// Provides a global showChangelogModal() for use anywhere

export function showChangelogModal() {
  if (document.querySelector('.changelog-modal-bg')) return;
  const modalBg = document.createElement('div');
  modalBg.className = 'changelog-modal-bg';
  modalBg.tabIndex = -1;
  const modal = document.createElement('div');
  modal.className = 'changelog-modal';
  modal.innerHTML = `
    <div class="changelog-modal-header">
      <span>Dev Changelog</span>
      <button class="changelog-modal-close" title="Close">&times;</button>
    </div>
    <div class="changelog-modal-content"><span class="muted">Loading...</span></div>
  `;
  modalBg.appendChild(modal);
  document.body.appendChild(modalBg);
  document.body.style.overflow = 'hidden';
  // Close logic
  function closeModal() {
    document.body.style.overflow = '';
    modalBg.remove();
  }
  // Clicking or tapping anywhere in the modal background, modal, header, or content closes it
  modalBg.addEventListener('click', () => closeModal());
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  });
  // Fetch and display changelog
  fetch('CHANGELOG.md').then(r => r.text()).then(md => {
    modal.querySelector('.changelog-modal-content').innerHTML = `<pre style="white-space:pre-wrap;">${md.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>`;
  }).catch(() => {
    modal.querySelector('.changelog-modal-content').innerHTML = '<span class="muted">Could not load changelog.</span>';
  });
}

// Always expose globally
window.showChangelogModal = showChangelogModal;
