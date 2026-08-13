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
  // Projekt-Videos
  //
  // Stumme Endlosschleife in der Projektkachel. Wer reduzierte Bewegung
  // eingestellt hat, bekommt das Standbild mit Steuerung. Außerhalb des
  // Sichtfelds wird pausiert – sonst laufen die Videos im Hintergrund
  // weiter, während man ganz woanders auf der Seite ist.
  // ========================================================================
  document.querySelectorAll('.project__video').forEach(video => {
    if (prefersReducedMotion) {
      video.removeAttribute('autoplay');
      video.removeAttribute('loop');
      video.setAttribute('controls', '');
      video.pause();
      return;
    }

    if (!('IntersectionObserver' in window)) return;

    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.2 }).observe(video);
  });

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
      // Add class to header for logo color change
      if (header) header.classList.add('menu-open');
    }

    function closeMobileNav() {
      mobileNav.classList.remove('is-open');
      mobileNav.setAttribute('aria-hidden', 'true');
      menuToggle.classList.remove('is-active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Menü öffnen');
      document.body.style.overflow = '';
      // Remove class from header
      if (header) header.classList.remove('menu-open');
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
  let revealObserver = null;

  if (!prefersReducedMotion) {
    revealObserver = new IntersectionObserver((entries) => {
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

    const revealElements = document.querySelectorAll('[data-reveal]');
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
    const magneticButtons = document.querySelectorAll('.btn--primary');

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
    const nextBtnTop = document.getElementById('sliderNextTop');
    const counterCurrent = productsSlider.querySelector('.products-slider__current');
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

      // Update counter
      if (counterCurrent) {
        counterCurrent.textContent = currentIndex + 1;
      }
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    // Next button (bottom - desktop)
    if (nextBtn) {
      nextBtn.addEventListener('click', nextSlide);
    }

    // Next button (top - mobile)
    if (nextBtnTop) {
      nextBtnTop.addEventListener('click', nextSlide);
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
  // Expertise Image Scrubbing (Hover-based Image Carousel)
  // ========================================================================
  if (!prefersReducedMotion && !isTouchDevice) {
    const imageScrubContainers = document.querySelectorAll('[data-image-scrub]');

    imageScrubContainers.forEach(container => {
      // Support both expertise and about image slides
      const slides = container.querySelectorAll('.expertise__image-slide, .about__image-slide');
      const totalSlides = slides.length;
      let currentIndex = 0;

      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;

        // Calculate which image to show based on mouse position
        const newIndex = Math.min(Math.floor(percentage * totalSlides), totalSlides - 1);

        if (newIndex !== currentIndex) {
          // Remove active class from current
          slides[currentIndex].classList.remove('is-active');

          // Add active class to new
          slides[newIndex].classList.add('is-active');

          currentIndex = newIndex;
        }
      });

      // Reset to first image when mouse leaves
      container.addEventListener('mouseleave', () => {
        slides[currentIndex].classList.remove('is-active');
        slides[0].classList.add('is-active');
        currentIndex = 0;
      });
    });
  }

  // ========================================================================
  // Blog Posts from WordPress REST API
  // ========================================================================
  const blogGrid = document.getElementById('blogGrid');

  if (blogGrid) {
    const BLOG_API = 'https://blog.fetz.cc/wp-json/wp/v2/posts?per_page=3&_embed';

    async function loadBlogPosts() {
      try {
        const response = await fetch(BLOG_API);

        if (!response.ok) {
          throw new Error('Blog API nicht erreichbar');
        }

        const posts = await response.json();

        if (posts.length === 0) {
          blogGrid.innerHTML = '<p class="blog__empty">Keine Beiträge gefunden.</p>';
          return;
        }

        blogGrid.innerHTML = posts.map((post, index) => {
          // Featured Image
          const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
            || 'assets/images/blog-placeholder.jpg';

          // Category
          const category = post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Blog';

          // Excerpt (HTML entfernen und kürzen)
          const excerpt = post.excerpt?.rendered
            ? post.excerpt.rendered.replace(/<[^>]+>/g, '').substring(0, 150) + '...'
            : '';

          // Title
          const title = post.title?.rendered || 'Ohne Titel';

          return `
            <article class="blog__post" data-reveal data-reveal-delay="${index}">
              <a href="${post.link}" class="blog__post-image" target="_blank" rel="noopener">
                <img src="${featuredImage}" alt="${title}" loading="lazy">
              </a>
              <div class="blog__post-content">
                <span class="blog__post-category">${category}</span>
                <h3 class="blog__post-title">${title}</h3>
                <p class="blog__post-excerpt">${excerpt}</p>
                <a href="${post.link}" class="blog__post-link" target="_blank" rel="noopener">
                  Weiterlesen
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
                  </svg>
                </a>
              </div>
            </article>
          `;
        }).join('');

        // Reveal-Animationen für dynamisch geladene Elemente aktivieren
        const newPosts = blogGrid.querySelectorAll('[data-reveal]');
        if (revealObserver) {
          newPosts.forEach(el => {
            revealObserver.observe(el);
          });
        } else {
          newPosts.forEach(el => {
            el.classList.add('is-visible');
          });
        }

      } catch (error) {
        console.error('Blog laden fehlgeschlagen:', error);
        blogGrid.innerHTML = `
          <p class="blog__error">
            Blog konnte nicht geladen werden.
            <a href="https://blog.fetz.cc" target="_blank" rel="noopener">Direkt zum Blog</a>
          </p>
        `;
      }
    }

    loadBlogPosts();
  }

  // ========================================================================
  // Lions Slider Scroll Indicator
  // ========================================================================
  const lionsSlider = document.getElementById('lionsSlider');
  const lionsWrapper = document.querySelector('.lions-slider-wrapper');

  if (lionsSlider && lionsWrapper) {
    lionsSlider.addEventListener('scroll', () => {
      const scrollLeft = lionsSlider.scrollLeft;
      const maxScroll = lionsSlider.scrollWidth - lionsSlider.clientWidth;

      // When scrolled close to end, hide the fade gradient
      if (scrollLeft >= maxScroll - 20) {
        lionsWrapper.classList.add('scrolled-end');
      } else {
        lionsWrapper.classList.remove('scrolled-end');
      }
    }, { passive: true });
  }

  // ========================================================================
  // About Section "Mehr lesen" Toggle
  // ========================================================================
  const aboutToggle = document.getElementById('aboutToggle');
  const aboutMore = document.querySelector('.about__more');

  if (aboutToggle && aboutMore) {
    aboutToggle.addEventListener('click', () => {
      const isExpanded = aboutToggle.getAttribute('aria-expanded') === 'true';

      aboutToggle.setAttribute('aria-expanded', !isExpanded);
      aboutMore.classList.toggle('is-expanded', !isExpanded);
    });
  }

  // ========================================================================
  // Contact Modal
  // ========================================================================
  const contactModal = document.getElementById('contactModal');

  if (contactModal) {
    const backdrop = contactModal.querySelector('.contact-modal__backdrop');
    const closeBtn = contactModal.querySelector('.contact-modal__close');
    const successCloseBtn = contactModal.querySelector('.contact-modal__success-close');
    const form = contactModal.querySelector('.contact-form');
    const submitBtn = form?.querySelector('.contact-form__submit');

    // Anti-spam: Set timestamp when form is available
    if (form) {
      const timestampField = form.querySelector('[name="_timestamp"]');
      if (timestampField) {
        timestampField.value = Date.now();
      }
    }

    // Open modal triggers
    document.querySelectorAll('[data-contact-modal]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openContactModal();
      });
    });

    function openContactModal() {
      contactModal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      // Close mobile nav if open
      if (mobileNav && mobileNav.classList.contains('is-open')) {
        closeMobileNav();
      }
      // Focus first input
      const firstInput = form?.querySelector('input:not([type="checkbox"])');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }

    function closeContactModal() {
      contactModal.classList.remove('is-open');
      contactModal.classList.remove('is-success');
      document.body.style.overflow = '';
      // Reset form
      if (form) {
        form.reset();
        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
      }
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }
    }

    // Close handlers
    backdrop?.addEventListener('click', closeContactModal);
    closeBtn?.addEventListener('click', closeContactModal);
    successCloseBtn?.addEventListener('click', closeContactModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && contactModal.classList.contains('is-open')) {
        closeContactModal();
      }
    });

    // Form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset errors
        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        // Gather form data
        const formData = {
          firstName: form.querySelector('[name="firstName"]')?.value.trim() || '',
          lastName: form.querySelector('[name="lastName"]')?.value.trim() || '',
          company: form.querySelector('[name="company"]')?.value.trim() || '',
          email: form.querySelector('[name="email"]')?.value.trim() || '',
          message: form.querySelector('[name="message"]')?.value.trim() || '',
          privacy: form.querySelector('[name="privacy"]')?.checked || false,
          // Anti-spam fields
          website: form.querySelector('[name="website"]')?.value || '',
          _timestamp: form.querySelector('[name="_timestamp"]')?.value || ''
        };

        // Validation
        let isValid = true;

        if (!formData.firstName) {
          showFormError('firstName', 'Bitte geben Sie Ihren Vornamen ein.');
          isValid = false;
        }

        if (!formData.lastName) {
          showFormError('lastName', 'Bitte geben Sie Ihren Nachnamen ein.');
          isValid = false;
        }

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          showFormError('email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
          isValid = false;
        }

        if (!formData.message) {
          showFormError('message', 'Bitte geben Sie eine Nachricht ein.');
          isValid = false;
        }

        if (!formData.privacy) {
          showFormError('privacy', 'Bitte stimmen Sie der Datenschutzerklärung zu.');
          isValid = false;
        }

        if (!isValid) return;

        // Submit
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;

        try {
          const response = await fetch('/api/contact.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          const result = await response.json();

          if (result.success) {
            contactModal.classList.add('is-success');

            // Track successful submission
            if (typeof gtag === 'function') {
              gtag('event', 'generate_lead', {
                event_category: 'Contact',
                event_label: 'Contact Form Submission'
              });
            }
          } else {
            alert(result.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
          }
        } catch (error) {
          console.error('Contact form error:', error);
          alert('Ein Fehler ist aufgetreten. Bitte schreiben Sie direkt an othmar@fetz.cc');
        } finally {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
        }
      });

      function showFormError(fieldName, message) {
        const input = form.querySelector(`[name="${fieldName}"]`);
        const group = input?.closest('.contact-form__group') || input?.closest('.contact-form__privacy');
        const errorEl = group?.querySelector('.contact-form__error');

        if (input && input.type !== 'checkbox') {
          input.classList.add('is-invalid');
        }
        if (group) {
          group.classList.add('has-error');
        }
        if (errorEl) {
          errorEl.textContent = message;
        }
      }
    }
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
