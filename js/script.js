// JavaScript — Fundación Panorama de Colores

document.addEventListener('DOMContentLoaded', function () {

  // ========== MENÚ RESPONSIVE ==========
  var menuToggle = document.getElementById('menuToggle');
  var navMenu    = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function () {
      var isOpen = navMenu.classList.toggle('active');
      menuToggle.innerHTML = isOpen
        ? '<i class="fas fa-times"></i>'
        : '<i class="fas fa-bars"></i>';
    });

    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('active');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      });
    });

    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('active');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      }
    });
  }

  // ========== SLIDER PRINCIPAL ==========
  var slides  = document.querySelectorAll('.slide');
  var dots    = document.querySelectorAll('.dot');
  var prevBtn = document.querySelector('.slider-prev');
  var nextBtn = document.querySelector('.slider-next');
  var current = 0;
  var interval;

  function showSlide(idx) {
    if (idx >= slides.length) idx = 0;
    else if (idx < 0) idx = slides.length - 1;
    current = idx;
    slides.forEach(function (s) { s.classList.remove('active'); });
    dots.forEach(function (d)   { d.classList.remove('active'); });
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function resetInterval() {
    clearInterval(interval);
    interval = setInterval(function () { showSlide(current + 1); }, 4000);
  }

  if (slides.length) {
    resetInterval();
    if (nextBtn) nextBtn.addEventListener('click', function () { showSlide(current + 1); resetInterval(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { showSlide(current - 1); resetInterval(); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { showSlide(i); resetInterval(); });
    });

    var sliderContainer = document.querySelector('.slider-container');
    if (sliderContainer) {
      sliderContainer.addEventListener('mouseenter', function () { clearInterval(interval); });
      sliderContainer.addEventListener('mouseleave', resetInterval);

      var touchX = 0;
      sliderContainer.addEventListener('touchstart', function (e) {
        touchX = e.touches[0].clientX;
      }, { passive: true });
      sliderContainer.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) { showSlide(dx < 0 ? current + 1 : current - 1); resetInterval(); }
      }, { passive: true });
    }
  }

  // ========== ANIMACIÓN DE CONTADORES (franja de estadísticas) ==========
  var countersDone = false;

  function animateStatNumbers() {
    if (countersDone) return;
    countersDone = true;
    document.querySelectorAll('.stat-number').forEach(function (el) {
      var target = parseInt(el.textContent.replace(/\D/g, ''), 10);
      if (!target) return;
      var count = 0;
      var step  = Math.max(1, Math.ceil(target / 80));
      el.textContent = '0+';
      var timer = setInterval(function () {
        count = Math.min(count + step, target);
        el.textContent = count + '+';
        if (count >= target) clearInterval(timer);
      }, 18);
    });
  }

  var statsStrip = document.querySelector('.stats-strip');
  if (statsStrip) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) {
        animateStatNumbers();
        obs.disconnect();
      }
    }, { threshold: 0.3 }).observe(statsStrip);
  }

  // ========== GALERÍA MODAL ==========
  var modal      = document.querySelector('.gallery-modal');
  var modalImg   = modal && modal.querySelector('.modal-image');
  var modalCap   = modal && modal.querySelector('.modal-caption');
  var modalClose = modal && modal.querySelector('.modal-close');

  function openModal(src, alt) {
    if (!modal) return;
    modalImg.src = src;
    modalCap.textContent = alt;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('img');
      if (img) openModal(img.src, img.alt);
    });
  });
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // ========== FORMULARIO → WHATSAPP ==========
  var contactForm = document.getElementById('contactForm');
  var formSuccess = document.getElementById('form-success');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl    = document.getElementById('name');
      var emailEl   = document.getElementById('email');
      var phoneEl   = document.getElementById('phone');
      var messageEl = document.getElementById('message');

      var name    = nameEl    ? nameEl.value.trim()    : '';
      var email   = emailEl   ? emailEl.value.trim()   : '';
      var phone   = phoneEl   ? phoneEl.value.trim()   : '';
      var message = messageEl ? messageEl.value.trim() : '';

      var valid = true;
      [[nameEl, name], [emailEl, email], [messageEl, message]].forEach(function (pair) {
        if (!pair[1]) { if (pair[0]) pair[0].classList.add('input-error'); valid = false; }
      });
      if (!valid) return;

      var text = '¡Hola! Me comunico desde el sitio web.\n'
        + '*Nombre:* ' + name + '\n'
        + '*Email:* ' + email + '\n'
        + (phone ? '*Teléfono:* ' + phone + '\n' : '')
        + '*Mensaje:*\n' + message;

      window.open('https://wa.me/573226012056?text=' + encodeURIComponent(text), '_blank');

      contactForm.reset();
      if (formSuccess) {
        formSuccess.style.display = 'block';
        setTimeout(function () { formSuccess.style.display = 'none'; }, 5000);
      }
    });

    contactForm.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('input-error'); });
    });
  }

  // ========== NAVEGACIÓN SUAVE ==========
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = anchor.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var navH = (document.querySelector('.navbar') || { offsetHeight: 70 }).offsetHeight;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navH, behavior: 'smooth' });
    });
  });

  // ========== SCROLL: NAVBAR .scrolled + BOTÓN VOLVER ARRIBA ==========
  var navbar  = document.querySelector('.navbar');
  var backTop = document.getElementById('back-top');

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (navbar)  navbar.classList.toggle('scrolled', y > 80);
    if (backTop) backTop.classList.toggle('visible', y > 400);
  }, { passive: true });

  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

});
