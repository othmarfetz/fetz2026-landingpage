/**
 * FETZ Personal Brand
 * Editorial Precision - Main JavaScript
 * Modern interactions with graceful degradation
 */

(function() {
  'use strict';

  // ========================================================================
  // Feature Detection & Initialization
  // ========================================================================
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // ========================================================================
  // Header Scroll Behavior
  // ========================================================================
  const header = document.getElementById('header');
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateHeader() {
    const scrollY = window.scrollY;

    if (scrollY > 80) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }

    lastScrollY = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  // Initial check
  updateHeader();

  // ========================================================================
  // Mobile Navigation
  // ========================================================================
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav__link');

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('is-open');

      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    function openMobileNav() {
      mobileNav.classList.add('is-open');
      mobileNav.setAttribute('aria-hidden', 'false');
      menuToggle.classList.add('is-active');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Menü schließen');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
      mobileNav.classList.remove('is-open');
      mobileNav.setAttribute('aria-hidden', 'true');
      menuToggle.classList.remove('is-active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Menü öffnen');
      document.body.style.overflow = '';
    }

    // Close on link click
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        closeMobileNav();
      }
    });
  }

  // ========================================================================
  // Smooth Scroll for Anchor Links
  // ========================================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');

      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        e.preventDefault();

        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });

        // Update URL without jumping
        history.pushState(null, '', targetId);
      }
    });
  });

  // ========================================================================
  // Reveal Animations with Intersection Observer
  // ========================================================================
  if (!prefersReducedMotion) {
    const revealElements = document.querySelectorAll('[data-reveal]');

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
  } else {
    // Show all elements immediately if reduced motion is preferred
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('is-visible');
    });
  }

  // ========================================================================
  // Active Navigation Link Highlighting
  // ========================================================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[data-nav]');

  function highlightActiveNav() {
    const scrollY = window.scrollY;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('is-active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('is-active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightActiveNav, { passive: true });

  // ========================================================================
  // Number Counter Animation
  // ========================================================================
  const counters = document.querySelectorAll('[data-count]');

  if (!prefersReducedMotion && counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });

    counters.forEach(counter => {
      counterObserver.observe(counter);
    });

    function animateCounter(element) {
      const target = parseInt(element.getAttribute('data-count'), 10);
      const duration = 2000;
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out-expo)
        const easeOutExpo = 1 - Math.pow(2, -10 * progress);
        const currentValue = Math.floor(target * easeOutExpo);

        element.textContent = currentValue;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          element.textContent = target;
        }
      }

      requestAnimationFrame(updateCounter);
    }
  } else {
    // Show final values immediately if reduced motion
    counters.forEach(counter => {
      counter.textContent = counter.getAttribute('data-count');
    });
  }

  // ========================================================================
  // Magnetic Button Effect (Desktop only)
  // ========================================================================
  if (!isTouchDevice && !prefersReducedMotion) {
    const magneticButtons = document.querySelectorAll('.btn--primary, .nav__cta');

    magneticButtons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ========================================================================
  // Parallax Effect for Hero Pattern (if no CSS support)
  // ========================================================================
  if (!prefersReducedMotion && !CSS.supports('animation-timeline', 'scroll()')) {
    const heroPattern = document.querySelector('.hero__pattern');

    if (heroPattern) {
      window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const maxScroll = window.innerHeight;

        if (scrollY < maxScroll) {
          const translateY = scrollY * 0.3;
          heroPattern.style.transform = `translateY(${translateY}px)`;
        }
      }, { passive: true });
    }
  }

  // ========================================================================
  // Journey Slider
  // ========================================================================
  const journeyTrack = document.getElementById('journeyTrack');
  const journeyPrev = document.getElementById('journeyPrev');
  const journeyNext = document.getElementById('journeyNext');
  const journeyDots = document.getElementById('journeyDots');
  const journeySlides = document.querySelectorAll('.journey-slide');

  if (journeyTrack && journeySlides.length > 0) {
    let currentSlide = 0;
    const totalSlides = journeySlides.length;

    function updateSlider() {
      // Move track
      journeyTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

      // Update active states
      journeySlides.forEach((slide, index) => {
        slide.classList.toggle('is-active', index === currentSlide);
      });

      // Update dots
      if (journeyDots) {
        const dots = journeyDots.querySelectorAll('.journey-slider__dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('is-active', index === currentSlide);
        });
      }

      // Update button states
      if (journeyPrev) {
        journeyPrev.disabled = currentSlide === 0;
      }
      if (journeyNext) {
        journeyNext.disabled = currentSlide === totalSlides - 1;
      }
    }

    function goToSlide(index) {
      currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
      updateSlider();
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
      }
    }

    // Button listeners
    if (journeyPrev) {
      journeyPrev.addEventListener('click', prevSlide);
    }
    if (journeyNext) {
      journeyNext.addEventListener('click', nextSlide);
    }

    // Dot listeners
    if (journeyDots) {
      journeyDots.addEventListener('click', (e) => {
        const dot = e.target.closest('.journey-slider__dot');
        if (dot) {
          const index = parseInt(dot.dataset.dot, 10);
          goToSlide(index);
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    journeyTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    journeyTrack.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }, { passive: true });

    // Initialize
    updateSlider();
  }

  // ========================================================================
  // Projects Slider (horizontal scroll)
  // ========================================================================
  const projectsTrack = document.getElementById('projectsTrack');
  const projectsPrev = document.getElementById('projectsPrev');
  const projectsNext = document.getElementById('projectsNext');
  const projectsCurrent = document.getElementById('projectsCurrent');
  const projectsTotal = document.getElementById('projectsTotal');

  if (projectsTrack) {
    const projectSlides = projectsTrack.querySelectorAll('.project-slide');
    const totalProjects = projectSlides.length;

    if (projectsTotal) {
      projectsTotal.textContent = totalProjects;
    }

    function getVisibleSlides() {
      const trackWidth = projectsTrack.offsetWidth;
      const slideWidth = projectSlides[0]?.offsetWidth || 300;
      return Math.floor(trackWidth / slideWidth) || 1;
    }

    function getCurrentSlideIndex() {
      const scrollLeft = projectsTrack.scrollLeft;
      const slideWidth = projectSlides[0]?.offsetWidth + 24 || 324; // 24 = gap
      return Math.round(scrollLeft / slideWidth);
    }

    function updateCounter() {
      if (projectsCurrent) {
        const current = Math.min(getCurrentSlideIndex() + 1, totalProjects);
        projectsCurrent.textContent = Math.max(1, current);
      }
    }

    function scrollToSlide(index) {
      const slideWidth = projectSlides[0]?.offsetWidth + 24 || 324;
      projectsTrack.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth'
      });
    }

    if (projectsPrev) {
      projectsPrev.addEventListener('click', () => {
        const current = getCurrentSlideIndex();
        if (current > 0) {
          scrollToSlide(current - 1);
        }
      });
    }

    if (projectsNext) {
      projectsNext.addEventListener('click', () => {
        const current = getCurrentSlideIndex();
        const visible = getVisibleSlides();
        if (current < totalProjects - visible) {
          scrollToSlide(current + 1);
        }
      });
    }

    projectsTrack.addEventListener('scroll', updateCounter, { passive: true });

    // Initialize
    updateCounter();
  }

  // ========================================================================
  // Email Link Click Handler
  // ========================================================================
  const emailLinks = document.querySelectorAll('a[href^="mailto:"]');

  emailLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Optional: Track email clicks for analytics
      if (typeof gtag === 'function') {
        gtag('event', 'click', {
          event_category: 'Contact',
          event_label: 'Email Click'
        });
      }
    });
  });

  // ========================================================================
  // External Links Handler
  // ========================================================================
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    // Ensure security for external links
    if (!link.getAttribute('rel')?.includes('noopener')) {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // ========================================================================
  // Keyboard Navigation Enhancement
  // ========================================================================
  document.addEventListener('keydown', (e) => {
    // Add focus-visible polyfill behavior
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });

  // ========================================================================
  // Performance: Lazy Load Images (if not using native lazy loading)
  // ========================================================================
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.loading = 'lazy';
    });
  } else {
    // Fallback for older browsers
    const lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length > 0) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '100px'
      });

      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }

  // ========================================================================
  // Products Slider
  // ========================================================================
  const productsSlider = document.getElementById('productsSlider');
  const productsTrack = document.getElementById('productsTrack');

  if (productsSlider && productsTrack) {
    const slides = productsTrack.querySelectorAll('.product-slide');
    const dots = productsSlider.querySelectorAll('.products-slider__dot');
    const nextBtn = document.getElementById('sliderNext');
    const totalSlides = slides.length;
    let currentIndex = 0;

    function goToSlide(index) {
      // Wrap around
      if (index >= totalSlides) index = 0;
      if (index < 0) index = totalSlides - 1;

      currentIndex = index;

      // Slide the track
      productsTrack.style.transform = `translateX(-${currentIndex * 100}%)`;

      // Update dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === currentIndex);
      });
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    // Next button
    if (nextBtn) {
      nextBtn.addEventListener('click', nextSlide);
    }

    // Dot navigation
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.goto, 10);
        goToSlide(index);
      });
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    productsSlider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    productsSlider.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToSlide(currentIndex + 1);
        } else {
          goToSlide(currentIndex - 1);
        }
      }
    }, { passive: true });

    // Keyboard navigation when slider is in view
    document.addEventListener('keydown', (e) => {
      const rect = productsSlider.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;

      if (inView) {
        if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
        if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
      }
    });
  }

  // ========================================================================
  // Console Branding
  // ========================================================================
  console.log(
    '%c FETZ ',
    'background: #013546; color: #ffffff; font-size: 24px; font-weight: bold; padding: 8px 16px; border-radius: 4px;'
  );
  console.log(
    '%cStrategie • Design • Technologie',
    'color: #ec4c50; font-size: 14px; font-weight: 500;'
  );
  console.log(
    '%cfetz.cc — Othmar Fetz',
    'color: #737373; font-size: 12px;'
  );

})();
