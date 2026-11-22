// JavaScript mínimo do site: menu no celular e vídeos de demonstração.
// Sem JavaScript o site continua funcionando (menu aberto, ilustração START → FINISH no lugar do vídeo).
(function () {
  // ----- formulário do printable grátis: envia sem sair da página e mostra o resultado -----
  var MSG = {
    ok: "Check your inbox: your printable is on its way. If it isn't there in a few minutes, look in your spam folder.",
    email: "Please enter a valid email address.",
    consent: "Please tick the box so we can email you the printable.",
    limit: "Too many requests. Please try again in an hour.",
    expired: "That download link has expired. Enter your email to get a new one.",
    send: "Sorry, something went wrong. Please try again later or write to hello@justafoodblog.com.",
    server: "Sorry, something went wrong. Please try again later or write to hello@justafoodblog.com."
  };
  function show(form, code, ok) {
    var el = form.querySelector(".freebie__msg");
    if (!el) return;
    el.textContent = MSG[code] || MSG.server;
    el.classList.toggle("is-error", !ok);
  }
  var forms = document.querySelectorAll("[data-freebie]");
  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener("submit", function (ev) {
      if (!window.fetch || !window.FormData) return;
      ev.preventDefault();
      var email = form.querySelector("input[type=email]");
      var consent = form.querySelector("input[name=consent]");
      if (!email.value || !email.checkValidity()) { show(form, "email", false); email.focus(); return; }
      if (!consent.checked) { show(form, "consent", false); consent.focus(); return; }
      var btn = form.querySelector("button");
      btn.disabled = true;
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (d) { show(form, d.code, d.ok); if (d.ok) { form.reset(); if (window.gtag) window.gtag("event", "generate_lead", { form: "free_printable" }); } })
        .catch(function () { show(form, "server", false); })
        .then(function () { btn.disabled = false; });
    });
  });
  var err = /[?&]error=([a-z]+)/.exec(location.search);
  if (err && forms[0]) show(forms[0], err[1], false);

  // ----- aviso de cookies (Google Analytics só grava cookie depois do "Accept") -----
  var box = document.getElementById("consent");
  if (box) {
    var saved = null;
    try { saved = localStorage.getItem("jafb-consent"); } catch (e) {}
    if (!saved) box.hidden = false;
    box.addEventListener("click", function (ev) {
      var choice = ev.target && ev.target.getAttribute("data-consent");
      if (!choice) return;
      try { localStorage.setItem("jafb-consent", choice); } catch (e) {}
      if (window.gtag) window.gtag("consent", "update", { analytics_storage: choice });
      box.hidden = true;
    });
  }

  // ----- menu mobile -----
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ----- vídeos de demonstração -----
  // O vídeo só é baixado quando o card aparece na tela (ou quando a pessoa aperta "Play demo").
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var demos = document.querySelectorAll("[data-demo]");
  Array.prototype.forEach.call(demos, function (demo) {
    var video = demo.querySelector("video");
    var poses = demo.querySelector(".ex-poses");
    var button = demo.querySelector("[data-demo-toggle]");
    if (!video || !button) return;
    var label = button.querySelector("span");
    var userStopped = false;
    button.hidden = false;

    var wanted = false;
    // A ilustração fica na tela até o vídeo começar de verdade (sem caixa em branco enquanto carrega).
    video.addEventListener("playing", function () {
      if (!wanted) return;
      video.hidden = false;
      poses.style.visibility = "hidden";
    });
    function play() {
      wanted = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      label.textContent = "Show start and finish";
      button.setAttribute("aria-pressed", "true");
    }
    function stop() {
      wanted = false;
      video.pause();
      video.hidden = true;
      poses.style.visibility = "";
      label.textContent = "Play demo";
      button.setAttribute("aria-pressed", "false");
    }
    button.addEventListener("click", function () {
      if (!wanted) {
        userStopped = false;
        play();
      } else {
        userStopped = true;
        stop();
      }
    });

    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting && !userStopped) play();
            else if (!e.isIntersecting && wanted) video.pause();
          });
        },
        { threshold: 0.6 }
      ).observe(demo);
    }
  });
})();
