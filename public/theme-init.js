(function () {
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = storedTheme ? storedTheme === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", isDark);
})();
