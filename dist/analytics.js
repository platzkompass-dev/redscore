(() => {
  if (!/(^|\.)redscore\.de$/i.test(location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  script.dataset.sdkn = "@vercel/analytics";
  document.head.append(script);
})();
