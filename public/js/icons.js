/* DIGI parťák – ikony (jednoduché obrysové ikony, tah 2.5 px) a maskot. */
(function () {
  'use strict';
  const P = {
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    book: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    steps: '<path d="M3 20h6v-5h6v-5h6"/><path d="M14 4h6v4"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    text: '<path d="M4 7V5h10v2M9 5v14M7 19h4"/><path d="M14 12v-1h7v1M17.5 11v8M16 19h3"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 5.5"/><path d="M20 4v7h-7"/>',
    paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
    smartphone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 4.5 5"/>',
    pill: '<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="m9.5 8.5 5 7"/>',
    bank: '<path d="M3 9 12 4l9 5M4 9h16M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'
  };

  function icon(name, size) {
    const s = size || 24;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  /* Maskot: usměvavá bublina s telefonem (podle brandu). */
  function mascot(variant) {
    const phone = variant === 'plain' ? '' :
      '<rect x="88" y="24" width="26" height="42" rx="6" transform="rotate(14 101 45)" fill="#E3D5FF" stroke="#271206" stroke-width="4"/>' +
      '<path d="M86 56c6-3 12 0 12 6s-7 8-12 5" fill="#FFFDF7" stroke="#271206" stroke-width="4" stroke-linecap="round"/>';
    const sparks = variant === 'small' ? '' :
      '<path d="M8 22 16 28M14 10l5 9M28 6l1 9" stroke="#D8F34E" stroke-width="5" stroke-linecap="round"/>';
    return '<svg class="mascot" viewBox="0 0 124 112" aria-hidden="true" focusable="false">' + sparks +
      '<path d="M38 88 26 104l26-10" fill="#FFFDF7" stroke="#271206" stroke-width="4" stroke-linejoin="round"/>' +
      '<ellipse cx="58" cy="54" rx="40" ry="36" fill="#FFFDF7" stroke="#271206" stroke-width="4"/>' +
      '<path d="M32 89 44 92" stroke="#FFFDF7" stroke-width="6"/>' +
      '<path d="M40 48q5-6 10 0M64 48q5-6 10 0" fill="none" stroke="#271206" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M44 60q13 13 26 0" fill="none" stroke="#271206" stroke-width="4" stroke-linecap="round"/>' +
      phone + '</svg>';
  }

  window.DP = window.DP || {};
  window.DP.icon = icon;
  window.DP.mascot = mascot;
})();
