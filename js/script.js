/**
 * Slider Moderno para Hero Section
 * Código optimizado y con buenas prácticas
 */

class ModernSlider {
    constructor(config = {}) {
        // Configuración por defecto
        this.config = {
            autoplay: true,
            autoplaySpeed: 5000,
            pauseOnHover: true,
            transitionSpeed: 500,
            infinite: true,
            ...config
        };
        
        // Elementos del DOM
        this.slider = document.querySelector('.hero-slider');
        this.slides = document.querySelectorAll('.slide');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.paginationDots = document.querySelectorAll('.pagination-dot');
        
        // Estado
        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.isAnimating = false;
        this.autoplayInterval = null;
        this.isHovering = false;
        
        // Inicialización
        this.init();
    }
    
    /**
     * Inicializar slider
     */
    init() {
        if (!this.slider || this.totalSlides === 0) {
            console.warn('Slider: No se encontraron slides');
            return;
        }
        
        // Configurar slides iniciales
        this.slides.forEach((slide, index) => {
            slide.style.zIndex = this.totalSlides - index;
            
            // Precargar imágenes de fondo
            this.preloadSlideImage(slide);
        });
        
        // Mostrar primer slide
        this.showSlide(0);
        
        // Configurar controles
        this.setupControls();
        
        // Iniciar autoplay si está configurado
        if (this.config.autoplay) {
            this.startAutoplay();
        }
        
        // Pausar autoplay al hacer hover
        if (this.config.pauseOnHover) {
            this.setupHoverPause();
        }
        
        // Configurar Intersection Observer para pausar cuando no es visible
        this.setupVisibilityObserver();
        
        // Configurar teclado
        this.setupKeyboardControls();
        
        console.log(`✅ Slider inicializado con ${this.totalSlides} slides`);
    }
    
    /**
     * Precargar imagen de slide
     * @param {HTMLElement} slide - Elemento del slide
     */
    preloadSlideImage(slide) {
        const bgElement = slide.querySelector('.slide-background');
        if (!bgElement) return;
        
        const bgImage = bgElement.style.backgroundImage;
        const imageUrl = bgImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
        
        if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            
            img.onload = () => {
                slide.classList.add('image-loaded');
            };
            
            img.onerror = () => {
                console.warn(`No se pudo cargar la imagen: ${imageUrl}`);
            };
        }
    }
    
    /**
     * Configurar controles del slider
     */
    setupControls() {
        // Botón anterior
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        // Botón siguiente
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Paginación
        this.paginationDots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Swipe para móviles
        this.setupSwipeGestures();
    }
    
    /**
     * Configurar gestos swipe para móviles
     */
    setupSwipeGestures() {
        if (!this.slider) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        const swipeThreshold = 50;
        
        this.slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        this.slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX, swipeThreshold);
        }, { passive: true });
        
        // Mouse drag para desktop
        let mouseDownX = 0;
        let mouseUpX = 0;
        
        this.slider.addEventListener('mousedown', (e) => {
            mouseDownX = e.clientX;
        });
        
        this.slider.addEventListener('mouseup', (e) => {
            mouseUpX = e.clientX;
            this.handleSwipe(mouseDownX, mouseUpX, swipeThreshold);
        });
    }
    
    /**
     * Manejar gesto swipe
     * @param {number} startX - Posición X inicial
     * @param {number} endX - Posición X final
     * @param {number} threshold - Umbral para considerar swipe
     */
    handleSwipe(startX, endX, threshold) {
        const diff = startX - endX;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }
    
    /**
     * Configurar pausa al hacer hover
     */
    setupHoverPause() {
        this.slider.addEventListener('mouseenter', () => {
            this.isHovering = true;
            this.pauseAutoplay();
        });
        
        this.slider.addEventListener('mouseleave', () => {
            this.isHovering = false;
            if (this.config.autoplay && !this.isAnimating) {
                this.startAutoplay();
            }
        });
    }
    
    /**
     * Configurar observador de visibilidad
     */
    setupVisibilityObserver() {
        if (!('IntersectionObserver' in window)) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Slider es visible, reanudar autoplay
                    if (this.config.autoplay && !this.isHovering) {
                        this.startAutoplay();
                    }
                } else {
                    // Slider no es visible, pausar autoplay
                    this.pauseAutoplay();
                }
            });
        }, {
            threshold: 0.5
        });
        
        observer.observe(this.slider);
    }
    
    /**
     * Configurar controles de teclado
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Solo responder si el slider está visible
            const sliderRect = this.slider.getBoundingClientRect();
            const isSliderVisible = (
                sliderRect.top < window.innerHeight &&
                sliderRect.bottom > 0
            );
            
            if (!isSliderVisible) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevSlide();
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                    
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                    
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                    break;
                    
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    this.toggleAutoplay();
                    break;
            }
        });
    }
    
    /**
     * Mostrar slide específico
     * @param {number} index - Índice del slide a mostrar
     */
    showSlide(index) {
        if (this.isAnimating || index === this.currentIndex) return;
        
        this.isAnimating = true;
        
        // Calcular índice real (para infinite scroll)
        let targetIndex = index;
        if (this.config.infinite) {
            if (index < 0) targetIndex = this.totalSlides - 1;
            if (index >= this.totalSlides) targetIndex = 0;
        } else {
            targetIndex = Math.max(0, Math.min(index, this.totalSlides - 1));
        }
        
        // Ocultar slide actual
        const currentSlide = this.slides[this.currentIndex];
        if (currentSlide) {
            currentSlide.classList.remove('active');
            currentSlide.style.zIndex = this.totalSlides - this.currentIndex;
        }
        
        // Mostrar nuevo slide
        const nextSlide = this.slides[targetIndex];
        if (nextSlide) {
            nextSlide.classList.add('active');
            nextSlide.style.zIndex = this.totalSlides + 1;
            
            // Animar entrada
            nextSlide.style.animation = `fadeIn ${this.config.transitionSpeed}ms ease`;
            
            // Actualizar paginación
            this.updatePagination(targetIndex);
            
            // Actualizar índice actual
            this.currentIndex = targetIndex;
            
            // Disparar evento personalizado
            this.dispatchSlideChangeEvent(targetIndex);
        }
        
        // Restablecer animación
        setTimeout(() => {
            if (nextSlide) {
                nextSlide.style.animation = '';
            }
            this.isAnimating = false;
        }, this.config.transitionSpeed);
    }
    
    /**
     * Slide siguiente
     */
    nextSlide() {
        this.showSlide(this.currentIndex + 1);
        
        // Reiniciar autoplay
        if (this.config.autoplay) {
            this.restartAutoplay();
        }
    }
    
    /**
     * Slide anterior
     */
    prevSlide() {
        this.showSlide(this.currentIndex - 1);
        
        // Reiniciar autoplay
        if (this.config.autoplay) {
            this.restartAutoplay();
        }
    }
    
    /**
     * Ir a slide específico
     * @param {number} index - Índice del slide
     */
    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.showSlide(index);
            
            // Reiniciar autoplay
            if (this.config.autoplay) {
                this.restartAutoplay();
            }
        }
    }
    
    /**
     * Actualizar paginación
     * @param {number} activeIndex - Índice activo
     */
    updatePagination(activeIndex) {
        this.paginationDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
            dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
        });
    }
    
    /**
     * Iniciar autoplay
     */
    startAutoplay() {
        if (this.autoplayInterval || !this.config.autoplay) return;
        
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.config.autoplaySpeed);
        
        // Añadir atributo para estilos
        this.slider?.setAttribute('data-autoplay', 'active');
    }
    
    /**
     * Pausar autoplay
     */
    pauseAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
            
            // Actualizar atributo
            this.slider?.setAttribute('data-autoplay', 'paused');
        }
    }
    
    /**
     * Reiniciar autoplay
     */
    restartAutoplay() {
        this.pauseAutoplay();
        if (!this.isHovering) {
            this.startAutoplay();
        }
    }
    
    /**
     * Alternar autoplay
     */
    toggleAutoplay() {
        if (this.autoplayInterval) {
            this.pauseAutoplay();
            this.showNotification('Autoplay pausado', 'info');
        } else {
            this.startAutoplay();
            this.showNotification('Autoplay activado', 'success');
        }
    }
    
    /**
     * Disparar evento de cambio de slide
     * @param {number} slideIndex - Índice del slide
     */
    dispatchSlideChangeEvent(slideIndex) {
        const event = new CustomEvent('slideChange', {
            detail: {
                index: slideIndex,
                total: this.totalSlides,
                slide: this.slides[slideIndex]
            }
        });
        
        this.slider.dispatchEvent(event);
    }
    
    /**
     * Mostrar notificación
     * @param {string} message - Mensaje
     * @param {string} type - Tipo (success, info, warning, error)
     */
    showNotification(message, type = 'info') {
        // Reutilizar la función del script principal si está disponible
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`Slider ${type}: ${message}`);
        }
    }
    
    /**
     * Destruir slider (limpieza)
     */
    destroy() {
        this.pauseAutoplay();
        
        // Remover event listeners
        if (this.prevBtn) {
            this.prevBtn.replaceWith(this.prevBtn.cloneNode(true));
        }
        
        if (this.nextBtn) {
            this.nextBtn.replaceWith(this.nextBtn.cloneNode(true));
        }
        
        this.paginationDots.forEach(dot => {
            dot.replaceWith(dot.cloneNode(true));
        });
        
        console.log('🗑️ Slider destruido');
    }
    
    /**
     * Actualizar configuración
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Aplicar cambios en tiempo real
        if (this.config.autoplay && !this.autoplayInterval && !this.isHovering) {
            this.startAutoplay();
        } else if (!this.config.autoplay) {
            this.pauseAutoplay();
        }
    }
    
    /**
     * Obtener información del slide actual
     * @returns {Object} - Información del slide
     */
    getCurrentSlideInfo() {
        return {
            index: this.currentIndex,
            total: this.totalSlides,
            element: this.slides[this.currentIndex],
            isFirst: this.currentIndex === 0,
            isLast: this.currentIndex === this.totalSlides - 1
        };
    }
}

// Inicializar slider cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const slider = new ModernSlider({
        autoplay: true,
        autoplaySpeed: 5000,
        pauseOnHover: true,
        transitionSpeed: 500,
        infinite: true
    });
    
    // Exponer slider globalmente para controles personalizados
    window.fundacionSlider = slider;
    
    // Ejemplo de controles personalizados:
    // window.fundacionSlider.nextSlide();
    // window.fundacionSlider.pauseAutoplay();
});

// Exportar clase si se usa con módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernSlider;
}