/* Wiize ChatWeb — botão flutuante. Não contém chaves nem credenciais. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__wiizeChatLoaded) return;
  window.__wiizeChatLoaded = true;
  var slug = String(script.getAttribute("data-wiize-chat") || "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) return;
  var base = new URL(script.src).origin;
  var left = script.getAttribute("data-position") === "left";
  var color = script.getAttribute("data-color") || "#16a34a";
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) color = "#16a34a";
  var label = String(script.getAttribute("data-label") || "").slice(0, 40);
  var side = left ? "left" : "right";

  var style = document.createElement("style");
  style.textContent =
    ".wz-cw-btn{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:flex;align-items:center;gap:8px;border:0;cursor:pointer;border-radius:999px;padding:0 18px;height:56px;min-width:56px;justify-content:center;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:transform .2s}" +
    ".wz-cw-btn:hover{transform:translateY(-2px)}" +
    ".wz-cw-frame{position:fixed;bottom:88px;" + side + ":20px;z-index:2147483000;width:380px;height:min(640px,calc(100vh - 110px));border:0;border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,.22);background:#fff;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .2s,transform .2s}" +
    ".wz-cw-frame.open{opacity:1;transform:none;pointer-events:auto}" +
    "@media (max-width:480px){.wz-cw-frame{left:0;right:0;bottom:0;width:100%;height:100%;border-radius:0}.wz-cw-frame.open~.wz-cw-btn{display:none}}";
  document.head.appendChild(style);

  var frame = document.createElement("iframe");
  frame.className = "wz-cw-frame";
  frame.title = "Atendimento";
  frame.setAttribute("allow", "clipboard-write");
  frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  var btn = document.createElement("button");
  btn.className = "wz-cw-btn";
  btn.style.background = color;
  btn.setAttribute("aria-label", label || "Abrir chat");
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z"/></svg>';
  if (label) { var span = document.createElement("span"); span.textContent = label; btn.appendChild(span); }

  var loaded = false, open = false;
  function toggle(v) {
    open = typeof v === "boolean" ? v : !open;
    if (open && !loaded) {
      frame.src = base + "/c/" + slug + "?embed=widget&host=" + encodeURIComponent(location.origin);
      loaded = true;
    }
    frame.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }
  btn.addEventListener("click", function () { toggle(); });
  // Só aceita mensagens vindas do próprio iframe da Wiize.
  window.addEventListener("message", function (e) {
    if (e.origin !== base || e.source !== frame.contentWindow) return;
    if (e.data && e.data.type === "wiize-chat:close") toggle(false);
  });
  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();
