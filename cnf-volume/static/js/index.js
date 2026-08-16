/* cNF Volume project page - carousel init, navbar burger, image lightbox.
   Vanilla JS (no jQuery). bulma-carousel / bulma-slider are loaded globally. */

document.addEventListener('DOMContentLoaded', function () {
  /* ---- Results carousel (bulma-carousel) ---- */
  if (window.bulmaCarousel) {
    bulmaCarousel.attach('.carousel', {
      slidesToScroll: 1,
      slidesToShow: 1,
      loop: true,
      infinite: true,
      autoplay: false,
      navigation: true,
      pagination: true
    });
  }

  /* ---- Sliders (bulma-slider), harmless if none present ---- */
  if (window.bulmaSlider) {
    bulmaSlider.attach();
  }

  /* ---- Hero segmentation toggle ---- */
  var segmentButton = document.querySelector('[data-segment-volume]');
  var heroGif = document.getElementById('heroVolumeGif');
  var heroLink = document.getElementById('heroVolumeLink');
  if (segmentButton && heroGif) {
    var originalSrc = heroGif.dataset.originalSrc;
    var segmentedSrc = heroGif.dataset.segmentedSrc;
    var originalAlt = heroGif.getAttribute('alt');
    var segmentedAlt = 'Segmented cNF volume visualization over the Fitzpatrick Depth Pro reconstruction';
    var segmentTimer = null;
    if (segmentedSrc) {
      var preloadSegmented = new Image();
      preloadSegmented.loading = 'eager';
      preloadSegmented.src = segmentedSrc;
    }

    function showOriginalHero() {
      if (!originalSrc) return;
      heroGif.setAttribute('src', originalSrc);
      if (heroLink) heroLink.setAttribute('href', originalSrc);
      segmentButton.classList.remove('is-segmented');
      segmentButton.setAttribute('aria-pressed', 'false');
      heroGif.setAttribute('alt', originalAlt);
    }

    segmentButton.addEventListener('click', function () {
      window.clearTimeout(segmentTimer);
      heroGif.setAttribute('src', segmentedSrc);
      if (heroLink) heroLink.setAttribute('href', segmentedSrc);
      segmentButton.classList.add('is-segmented');
      segmentButton.setAttribute('aria-pressed', 'true');
      heroGif.setAttribute('alt', segmentedAlt);
      segmentTimer = window.setTimeout(showOriginalHero, 5000);
    });
  }

  /* ---- Navbar burger toggle ---- */
  document.querySelectorAll('.navbar-burger').forEach(function (burger) {
    burger.addEventListener('click', function () {
      var target = document.getElementById(burger.dataset.target);
      burger.classList.toggle('is-active');
      if (target) target.classList.toggle('is-active');
    });
  });

  /* Close the mobile menu after following a section link */
  document.querySelectorAll('.navbar-menu .navbar-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var menu = item.closest('.navbar-menu');
      var burger = document.querySelector('.navbar-burger');
      if (menu) menu.classList.remove('is-active');
      if (burger) burger.classList.remove('is-active');
    });
  });

  /* ---- Scroll-spy section tracker ---- */
  var spyLinks = {};
  document.querySelectorAll('.section-tracker a').forEach(function (a) {
    spyLinks[a.getAttribute('href').slice(1)] = a;
  });
  var spySections = document.querySelectorAll('section[data-spy]');
  if (spySections.length && Object.keys(spyLinks).length) {
    var spySectionList = Array.prototype.slice.call(spySections);

    function setActiveSpy(id) {
      Object.keys(spyLinks).forEach(function (key) {
        spyLinks[key].classList.toggle('is-active', key === id);
      });
    }

    function updateSpy() {
      var marker = window.scrollY + Math.max(120, window.innerHeight * 0.32);
      var active = spySectionList[0].id;
      spySectionList.forEach(function (section) {
        if (section.offsetTop <= marker) active = section.id;
      });
      setActiveSpy(active);
    }

    document.querySelectorAll('.section-tracker a').forEach(function (a) {
      a.addEventListener('click', function () {
        setActiveSpy(a.getAttribute('href').slice(1));
      });
    });

    updateSpy();
    window.addEventListener('scroll', updateSpy, { passive: true });
    window.addEventListener('resize', updateSpy);
  }

  initFinetuneChart();

  function initFinetuneChart() {
    var chart = document.querySelector('[data-finetune-chart]');
    if (!chart) return;

    var svg = chart.querySelector('[data-finetune-svg]');
    var metricSelect = chart.querySelector('[data-finetune-metric]');
    var tooltip = chart.querySelector('[data-finetune-tooltip]');
    if (!svg) return;

    var selectedIndex = null;
    var data = [
      { experiment: 'all_parts', value: 52.6, parts: 'front,back,face,arms,hands,legs,feet' },
      { experiment: 'torso_face', value: 47.8, parts: 'front,back,face' },
      { experiment: 'limbs', value: 44.1, parts: 'arms,hands,legs,feet' },
      { experiment: 'front_back', value: 26.6, parts: 'front,back' },
      { experiment: 'legs_feet', value: 26.6, parts: 'legs,feet' },
      { experiment: 'hands_feet', value: 26.4, parts: 'hands,feet' },
      { experiment: 'arms_hands', value: 26.4, parts: 'arms,hands' },
      { experiment: 'single_feet', value: 8.7, parts: 'feet' },
      { experiment: 'single_front', value: 8.7, parts: 'front' },
      { experiment: 'single_hands', value: 8.6, parts: 'hands' },
      { experiment: 'single_arms', value: 8.6, parts: 'arms' },
      { experiment: 'single_back', value: 8.6, parts: 'back' },
      { experiment: 'single_legs', value: 8.5, parts: 'legs' },
      { experiment: 'single_face', value: 8.5, parts: 'face' }
    ];
    var plot = getPlot();

    draw();
    if (metricSelect) metricSelect.addEventListener('change', draw);
    window.addEventListener('resize', function () {
      selectedIndex = null;
      hideTooltip();
      draw();
    });

    function draw() {
      plot = getPlot();
      svg.setAttribute('viewBox', '0 0 ' + plot.width + ' ' + plot.height);
      var x0 = plot.left;
      var x1 = plot.width - plot.right;
      var axisY = plot.height - plot.bottom;
      var rowStep = plot.barHeight + plot.gap;
      var pieces = [];

      pieces.push('<rect class="finetune-plot-bg" x="0" y="0" width="' + plot.width + '" height="' + plot.height + '"></rect>');

      [0, 10, 20, 30, 40, 50].forEach(function (tick) {
        var x = xScale(tick);
        pieces.push('<line class="finetune-grid" x1="' + x + '" x2="' + x + '" y1="' + plot.top + '" y2="' + axisY + '"></line>');
        pieces.push('<text class="finetune-tick" x="' + x + '" y="' + (axisY + 24) + '" text-anchor="middle">' + tick + '</text>');
      });

      pieces.push('<line class="finetune-axis" x1="' + x0 + '" x2="' + x1 + '" y1="' + axisY + '" y2="' + axisY + '"></line>');
      pieces.push('<line class="finetune-axis" x1="' + x0 + '" x2="' + x0 + '" y1="' + plot.top + '" y2="' + axisY + '"></line>');
      pieces.push('<text class="finetune-axis-label" x="' + ((x0 + x1) / 2) + '" y="' + (plot.height - 18) + '" text-anchor="middle">Positive is better than baseline</text>');
      if (!plot.compact) {
        pieces.push('<text class="finetune-axis-label" x="' + plot.yLabelX + '" y="' + ((plot.top + axisY) / 2) + '" text-anchor="middle" transform="rotate(-90 ' + plot.yLabelX + ' ' + ((plot.top + axisY) / 2) + ')">Experiment</text>');
      }

      data.forEach(function (item, index) {
        var y = plot.top + index * rowStep;
        var width = xScale(item.value) - x0;
        var labelX = x0 + width - 6;
        var valueX = x0 + width + 7;
        var textY = y + plot.barHeight * 0.69;
        var selectedClass = selectedIndex === index ? ' is-selected' : '';

        pieces.push('<g class="finetune-bar-group' + selectedClass + '" data-index="' + index + '" role="button" tabindex="0" aria-label="' + escapeHtml(item.experiment + ': ' + item.value.toFixed(1) + '% Abs-rel reduction using ' + item.parts) + '">');
        pieces.push('<rect class="finetune-bar-hit" x="' + x0 + '" y="' + (y - 2) + '" width="' + (x1 - x0) + '" height="' + (plot.barHeight + 4) + '"></rect>');
        pieces.push('<text class="finetune-y-label" x="' + (x0 - 8) + '" y="' + textY.toFixed(1) + '">' + escapeHtml(item.experiment) + '</text>');
        pieces.push('<rect class="finetune-bar" x="' + x0 + '" y="' + y + '" width="' + width.toFixed(1) + '" height="' + plot.barHeight + '"></rect>');
        pieces.push('<text class="finetune-bar-label" x="' + labelX.toFixed(1) + '" y="' + textY.toFixed(1) + '" text-anchor="end">' + escapeHtml(item.parts) + '</text>');
        pieces.push('<text class="finetune-value-label" x="' + valueX.toFixed(1) + '" y="' + textY.toFixed(1) + '">' + item.value.toFixed(1) + '</text>');
        pieces.push('</g>');
      });

      svg.innerHTML = pieces.join('');
      bindBars();
    }

    function getPlot() {
      var width = chart.getBoundingClientRect().width;
      if (width && width < 620) {
        return {
          width: 500,
          height: 470,
          left: 88,
          right: 20,
          top: 38,
          bottom: 58,
          max: 56,
          barHeight: 18,
          gap: 6,
          yLabelX: 0,
          compact: true
        };
      }
      return {
        width: 1040,
        height: 590,
        left: 170,
        right: 50,
        top: 58,
        bottom: 60,
        max: 56,
        barHeight: 26,
        gap: 6,
        yLabelX: 62,
        compact: false
      };
    }

    function bindBars() {
      svg.querySelectorAll('.finetune-bar-group').forEach(function (group) {
        group.addEventListener('pointerenter', function (event) {
          selectedIndex = Number(group.dataset.index);
          svg.querySelectorAll('.finetune-bar-group').forEach(function (barGroup, index) {
            barGroup.classList.toggle('is-selected', index === selectedIndex);
          });
          showTooltip(selectedIndex, event);
        });

        group.addEventListener('pointermove', function (event) {
          if (selectedIndex !== null) showTooltip(selectedIndex, event);
        });

        group.addEventListener('pointerleave', function () {
          selectedIndex = null;
          group.classList.remove('is-selected');
          hideTooltip();
        });

        group.addEventListener('click', function (event) {
          selectedIndex = Number(group.dataset.index);
          showTooltip(selectedIndex, event);
        });

        group.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          selectedIndex = Number(group.dataset.index);
          svg.querySelectorAll('.finetune-bar-group').forEach(function (barGroup, index) {
            barGroup.classList.toggle('is-selected', index === selectedIndex);
          });
          showTooltipAtGroup(selectedIndex, group);
          event.preventDefault();
        });
      });
    }

    function showTooltip(index, event) {
      if (!tooltip || !data[index]) return;
      var item = data[index];
      var rect = chart.querySelector('.finetune-plot-wrap').getBoundingClientRect();
      tooltip.innerHTML = '<strong>' + escapeHtml(item.experiment) + '</strong>' +
        item.value.toFixed(1) + '% Abs-rel reduction<br>' +
        escapeHtml(item.parts);
      tooltip.hidden = false;
      tooltip.style.left = Math.min(Math.max(8, rect.width - 270), Math.max(8, event.clientX - rect.left + 14)) + 'px';
      tooltip.style.top = Math.max(8, event.clientY - rect.top - 18) + 'px';
    }

    function showTooltipAtGroup(index, group) {
      if (!tooltip || !data[index]) return;
      var item = data[index];
      var rect = chart.querySelector('.finetune-plot-wrap').getBoundingClientRect();
      var groupRect = group.getBoundingClientRect();
      tooltip.innerHTML = '<strong>' + escapeHtml(item.experiment) + '</strong>' +
        item.value.toFixed(1) + '% Abs-rel reduction<br>' +
        escapeHtml(item.parts);
      tooltip.hidden = false;
      tooltip.style.left = Math.min(Math.max(8, rect.width - 270), Math.max(8, groupRect.right - rect.left + 12)) + 'px';
      tooltip.style.top = Math.max(8, groupRect.top - rect.top - 10) + 'px';
    }

    function hideTooltip() {
      if (tooltip) tooltip.hidden = true;
      svg.querySelectorAll('.finetune-bar-group').forEach(function (group) {
        group.classList.remove('is-selected');
      });
    }

    function xScale(value) {
      return plot.left + value / plot.max * (plot.width - plot.left - plot.right);
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  /* ---- Lightbox ---- */
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  var lightboxImage = lightbox.querySelector('img');
  var lightboxCaption = lightbox.querySelector('p');
  var closeButton = lightbox.querySelector('.lightbox-close');

  function openLightbox(link) {
    var image = link.querySelector('img');
    lightboxImage.src = link.getAttribute('href');
    lightboxImage.alt = image ? image.alt : '';
    var figure = link.closest('figure');
    var caption = figure ? figure.querySelector('figcaption') : null;
    lightboxCaption.textContent =
      (caption && caption.textContent.trim()) || (image && image.alt) || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.removeAttribute('src');
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      openLightbox(link);
    });
  });

  closeButton.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
});
