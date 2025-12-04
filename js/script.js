// JavaScript para Fundación Panorama de Colores

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // ========== MENÚ RESPONSIVE ==========
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Toggle del menú en móviles
    menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        menuToggle.innerHTML = navMenu.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Cerrar menú al hacer click en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
    
    // ========== SLIDER PRINCIPAL ==========
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    let currentSlide = 0;
    let slideInterval;
    
    // Función para mostrar un slide específico
    function showSlide(index) {
        // Asegurarse de que el índice esté dentro del rango
        if (index >= slides.length) currentSlide = 0;
        else if (index < 0) currentSlide = slides.length - 1;
        else currentSlide = index;
        
        // Ocultar todos los slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Quitar clase active de todos los dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Mostrar slide actual
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }
    
    // Función para ir al siguiente slide
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    // Función para ir al slide anterior
    function prevSlide() {
        showSlide(currentSlide - 1);
    }
    
    // Event listeners para los controles del slider
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    
    // Event listeners para los dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            resetSlideInterval();
        });
    });
    
    // Iniciar autoplay del slider
    function startSlideInterval() {
        slideInterval = setInterval(nextSlide, 5000);
    }
    
    // Reiniciar intervalo del slider
    function resetSlideInterval() {
        clearInterval(slideInterval);
        startSlideInterval();
    }
    
    // Iniciar el slider
    if (slides.length > 0) {
        startSlideInterval();
        
        // Pausar autoplay al hacer hover sobre el slider
        const sliderContainer = document.querySelector('.slider-container');
        sliderContainer.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        sliderContainer.addEventListener('mouseleave', () => {
            startSlideInterval();
        });
    }
    
    // ========== ANIMACIÓN DE CONTADORES ==========
    const counters = document.querySelectorAll('.impact-number');
    const speed = 200; // Velocidad de la animación
    
    function animateCounters() {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-count');
            const count = +counter.innerText;
            const increment = target / speed;
            
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(() => animateCounters(), 1);
            } else {
                counter.innerText = target;
            }
        });
    }
    
    // Observador de intersección para animar contadores cuando son visibles
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar la sección de impacto
    const impactoSection = document.getElementById('impacto');
    if (impactoSection) {
        observer.observe(impactoSection);
    }
    
    // ========== GALERÍA DE IMÁGENES ==========
    const galleryItems = document.querySelectorAll('.gallery-item');
    const modal = document.querySelector('.gallery-modal');
    const modalImage = document.querySelector('.modal-image');
    const modalCaption = document.querySelector('.modal-caption');
    const modalClose = document.querySelector('.modal-close');
    
    // Abrir modal de galería
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const imgSrc = this.querySelector('img').src;
            const imgAlt = this.querySelector('img').alt;
            
            modal.style.display = 'flex';
            modalImage.src = imgSrc;
            modalCaption.textContent = imgAlt;
            
            // Prevenir scroll del body
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Cerrar modal de galería
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    // Cerrar modal al hacer click fuera de la imagen
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // ========== FORMULARIO DE CONTACTO ==========
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validación simple
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            if (name && email && message) {
                // Aquí normalmente se enviaría el formulario a un servidor
                // Por ahora, solo mostraremos un mensaje de éxito
                alert('¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.');
                contactForm.reset();
            } else {
                alert('Por favor, completa todos los campos obligatorios.');
            }
        });
    }
    
    // ========== ANIMACIÓN AL SCROLL ==========
    // Agregar clase de animación a elementos cuando son visibles
    const animatedElements = document.querySelectorAll('.program-card, .about-card, .impact-card, .alliance-item, .donation-card');
    
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        scrollObserver.observe(element);
    });
    
    // ========== NAVEGACIÓN SUAVE ==========
    // Esta funcionalidad ya está implementada con el atributo scroll-behavior: smooth en el CSS
    // Pero agregamos un pequeño offset para el header fijo
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                // Calcular posición con offset para el header
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ========== EFECTO PARALLAX EN SLIDER ==========
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.slide');
        
        parallaxElements.forEach(element => {
            const rate = scrolled * 0.5;
            element.style.transform = `translateY(${rate}px)`;
        });
    });
    
    // ========== CAMBIO DE COLOR DEL HEADER AL SCROLL ==========
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.backgroundColor = 'var(--neutral-white)';
            navbar.style.backdropFilter = 'none';
        }
    });
});