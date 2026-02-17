<section class="header" id="top">
  <div class="avatar">
    <img alt="Alex Dils headshot" src="headshot.png"/>
  </div>

  <div>
    <h1>Alex Dils</h1>

    <div class="p">
      Hey there! I’m a computer science student at UC Berkeley (B.A. expected May 2029). I build ML systems and do research in
      computer vision and medical AI—especially robustness, bias, augmentation, and segmentation.
    </div>

    <div class="p">
      I’m currently the CTO &amp; Co-Founder of <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Appraise AI</a>,
      where we’re building a multimodal pricing engine and large-scale ingestion pipeline for resale marketplaces.
      I’ve also been a research intern with the Stanford Center for Biomedical Informatics Research since 2022.
    </div>

    <div class="links" id="contact">
      <a href="mailto:dils@berkeley.edu">Email</a> /
      <a href="https://scholar.google.com/citations?user=0Sz8VPoAAAAJ" target="_blank">Google Scholar</a> /
      <a href="https://github.com/axel-slid" target="_blank">GitHub</a> /
      <a href="resume.pdf" target="_blank">CV</a> /
      <a href="https://www.linkedin.com/in/alex-dils/" target="_blank">LinkedIn</a>
    </div>
  </div>
</section>

<hr/>

<!-- NEWS -->
<section id="news">
  <h2>News</h2>
  <div class="list">
    <div class="item"><b>Jan 2026:</b> ICML 2026 submission in progress.</div>
    <div class="item"><b>Nov 2025:</b> Co-founded Appraise AI; raised $15K pre-seed.</div>
    <div class="item"><b>Apr 2025:</b> Published “Eye For An Eye”.</div>
    <div class="item"><b>Oct 2024:</b> Posted arXiv preprint on microplastic segmentation.</div>
  </div>
</section>

<hr/>

<!-- RESEARCH -->
<section id="research">
  <h2>Research</h2>

  <!-- Physio augmentation -->
  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Enhancing Medical AI with Physiologically-Informed Data Augmentation</div>
        <div class="li-dates">ICML 2026 submission (pending)</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Physiology-guided augmentation pipelines that explicitly model breathing motion and anatomical deformation
      to improve robustness of medical segmentation.
    </div>

    <div class="li-links">
      <!-- Paper / Code when public -->
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/breathing-lungs.svg" target="_blank">
        <img src="assets/breathing-lungs.svg" alt="Breathing deformation model"/>
      </a>
      <a class="li-thumb" href="assets/lung-metrics.gif" target="_blank">
        <img src="assets/lung-metrics.gif" alt="Robustness metrics"/>
      </a>
    </div>
  </article>

  <!-- Eye for an Eye -->
  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Eye For An Eye: A Deep-Learning and Analytical Method to Spatializing Stereoscopic Images</div>
        <div class="li-dates">National High School Journal of Science — 2025</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Hybrid analytical + deep-learning approach for generating stereoscopic pairs from a single image.
    </div>

    <div class="li-links">
      <!-- Paper / Code -->
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/stereo-before.png" target="_blank">
        <img src="assets/stereo-before.png" alt="Single view input"/>
      </a>
      <a class="li-thumb" href="assets/stereo-after.png" target="_blank">
        <img src="assets/stereo-after.png" alt="Stereo output"/>
      </a>
    </div>
  </article>

  <!-- Microplastics -->
  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Microplastic Identification Using AI-Driven Image Segmentation and GAN-Generated Context</div>
        <div class="li-dates">arXiv — 2024</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Segmentation model augmented with GAN-generated ecological context to improve cross-background generalization.
    </div>

    <div class="li-links">
      <a href="https://github.com/axel-slid/Microplastic-Segmentation-GAN" target="_blank">Code</a>
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/microplastics-mask.png" target="_blank">
        <img src="assets/microplastics-mask.png" alt="Segmentation mask"/>
      </a>
      <a class="li-thumb" href="assets/microplastics-gan-context.png" target="_blank">
        <img src="assets/microplastics-gan-context.png" alt="GAN context"/>
      </a>
    </div>
  </article>
</section>

<hr/>

<!-- PROJECTS -->
<section id="projects">
  <h2 class="li-section-title">Projects</h2>

  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Appraise AI — Multimodal resale pricing engine</div>
        <div class="li-dates">Nov 2025 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Multimodal pricing engine and ingestion pipeline for resale marketplaces.
    </div>

    <div class="li-links">
      <a href="https://appraiseai.co" target="_blank">Website</a>
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/appraise-ui.png" target="_blank">
        <img src="assets/appraise-ui.png" alt="Appraise UI"/>
      </a>
      <a class="li-thumb" href="assets/appraise-demo.mov" target="_blank">
        <video src="assets/appraise-demo.mov" preload="metadata" muted></video>
      </a>
    </div>
  </article>
</section>

<hr/>

<!-- MISC -->
<section id="misc-projects">
  <h2>Misc Projects</h2>

  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Speed Reader — Web-based rapid reading tool</div>
        <div class="li-dates">Tooling</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      RSVP-style speed reading web app with adjustable pacing and keyboard controls.
    </div>

    <div class="li-links">
      <a href="https://github.com/axel-slid/speed_reader" target="_blank">Code</a>
    </div>

    <div class="li-media" data-max="1">
      <a class="li-thumb" href="assets/speed-reader-ui.png" target="_blank">
        <img src="assets/speed-reader-ui.png" alt="Speed reader UI"/>
      </a>
    </div>
  </article>

  <div class="p" style="opacity:0.8;margin-top:18px;">
    Created by Alex Dils. Last updated <span id="lastUpdated"></span>
  </div>
</section>
