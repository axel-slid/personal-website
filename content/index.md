<section class="header" id="top">
  <div class="avatar">
    <img alt="Alex Dils headshot" src="headshot.png" />
  </div>

  <div>
    <h1>Alex Dils</h1>

    <div class="p">
      Hey there! I’m a computer science student at UC Berkeley (B.A. expected May 2029). I build ML systems and do research in
      computer vision and medical AI—especially robustness, bias, augmentation, and segmentation.
    </div>

    <div class="p">
      I’m currently the CTO &amp; Co-Founder of
      <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Appraise AI</a>,
      where we’re building a multimodal pricing engine and large-scale ingestion pipeline for resale marketplaces.
      I’ve also been a research intern with the Stanford Center for Biomedical Informatics Research since 2022.
    </div>

    <div class="links" id="contact">
      <a href="mailto:dils@berkeley.edu">Email</a> /
      <a href="https://scholar.google.com/citations?user=0Sz8VPoAAAAJ" target="_blank" rel="noreferrer">Google Scholar</a> /
      <a href="https://github.com/axel-slid" target="_blank" rel="noreferrer">GitHub</a> /
      <a href="resume.pdf" target="_blank" rel="noreferrer">CV</a> /
      <a href="https://www.linkedin.com/in/alex-dils/" target="_blank" rel="noreferrer">LinkedIn</a>
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

  <!-- Physio augmentation (USES: breathing-lungs.svg, ct-overlay.png, Figure2.png, mammogram-figure.gif) -->
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
      <!-- Add Paper / Code links when public -->
    </div>

    <!-- data-max=2 => LinkedIn-style: show 2 thumbs, then +N overlay for the rest -->
    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/breathing-lungs.svg" target="_blank" rel="noreferrer">
        <img src="assets/breathing-lungs.svg" alt="Breathing deformation illustration" />
      </a>

      <a class="li-thumb" href="assets/ct-overlay.png" target="_blank" rel="noreferrer">
        <img src="assets/ct-overlay.png" alt="CT overlay visualization" />
      </a>

      <a class="li-thumb" href="assets/Figure2.png" target="_blank" rel="noreferrer">
        <img src="assets/Figure2.png" alt="Figure 2 result summary" />
      </a>

      <a class="li-thumb" href="assets/mammogram-figure.gif" target="_blank" rel="noreferrer">
        <img src="assets/mammogram-figure.gif" alt="Mammogram augmentation/segmentation figure" />
      </a>
    </div>
  </article>

  <!-- Eye for an Eye (USES: image-2.png, image-5.png, poster-photo.png) -->
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
      <a href="https://nhsjs.com/2025/eye-for-an-eye-a-deep-learning-and-analytical-method-to-spatializing-stereoscopic-images/#google_vignette"
         target="_blank" rel="noreferrer">Paper</a>
      <!-- Add Code link if/when you publish -->
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/image-2.png" target="_blank" rel="noreferrer">
        <img src="assets/image-2.png" alt="Eye For An Eye — result image 1" />
      </a>

      <a class="li-thumb" href="assets/image-5.png" target="_blank" rel="noreferrer">
        <img src="assets/image-5.png" alt="Eye For An Eye — result image 2" />
      </a>

      <a class="li-thumb" href="assets/poster-photo.png" target="_blank" rel="noreferrer">
        <img src="assets/poster-photo.png" alt="Poster photo" />
      </a>
    </div>
  </article>

  <!-- Microplastics (USES: image (3).png) -->
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
      <a href="https://arxiv.org/abs/2410.19604" target="_blank" rel="noreferrer">Paper</a> /
      <a href="https://github.com/axel-slid/Microplastic-Segmentation-GAN" target="_blank" rel="noreferrer">Code</a>
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/image (3).png" target="_blank" rel="noreferrer">
        <img src="assets/image (3).png" alt="Microplastic segmentation results" />
      </a>
    </div>
  </article>
</section>

<hr/>

<!-- PROJECTS -->
<section id="projects">
  <h2 class="li-section-title">Projects</h2>

  <!-- Appraise (USES: appraise-ui.png) -->
  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Appraise AI — Multimodal resale pricing engine</div>
        <div class="li-dates">Nov 2025 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Multimodal pricing engine (vision + NLP) and large-scale ingestion pipeline for resale marketplaces.
    </div>

    <div class="li-links">
      <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Website</a>
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/appraise-ui.png" target="_blank" rel="noreferrer">
        <img src="assets/appraise-ui.png" alt="Appraise UI" />
      </a>
      <!-- If you want a second upload here later, add another <a class="li-thumb">…</a> -->
    </div>
  </article>
</section>

<hr/>

<!-- MISC -->
<section id="misc-projects">
  <h2>Misc Projects</h2>

  <!-- VLUNAR (USES: image.png) -->
  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">VLUNAR — Vision-language experiment</div>
        <div class="li-dates">Project</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      A vision-language project exploring multimodal representations and evaluation workflows.
      <!-- Replace with your exact one-liner when ready -->
    </div>

    <div class="li-links">
      <!-- Add link(s) if public -->
      <!-- <a href="..." target="_blank" rel="noreferrer">Code</a> -->
    </div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/image.png" target="_blank" rel="noreferrer">
        <img src="assets/image.png" alt="VLUNAR media" />
      </a>
    </div>
  </article>

  <div class="p" style="opacity:0.8;margin-top:18px;">
    Created by Alex Dils. Last updated <span id="lastUpdated"></span>
  </div>
</section>
