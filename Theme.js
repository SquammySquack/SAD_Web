/* DCM & Co. - light / dark mode
   Loaded in the <head> of every page so the saved theme is applied before the page paints.
   Any element with the data-theme-toggle attribute switches the theme. */
(function () {
  var KEY = 'dcm_theme';
  var root = document.documentElement;

  function read() {
    try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; }
  }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var current = read() || 'light';   // the site starts in light mode until a visitor switches
  root.setAttribute('data-theme', current);

  function apply(theme) {
    current = theme;
    root.setAttribute('data-theme', theme);
    var dark = theme === 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
      buttons[i].setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      buttons[i].setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(current);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-theme-toggle]')) return;
      var next = current === 'dark' ? 'light' : 'dark';
      write(next);
      apply(next);
    });
  });

  // keep other open tabs in sync
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) apply(e.newValue);
  });
})();