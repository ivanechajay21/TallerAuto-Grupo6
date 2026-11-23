(function () {
  try {
    var theme = localStorage.getItem('sigtm-theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (error) {
    /* localStorage puede estar bloqueado; se usa el tema claro por defecto. */
  }
})();
