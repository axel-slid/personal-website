<section class="header" id="top">
  <div class="avatar">
    <img alt="Alex Dils headshot" src="headshot.png"/>
  </div>

  <div>
    <h1>Alex Dils</h1>
    <div class="quote"></div>

    <div class="p">
      Hey there! I’m a computer science student at UC Berkeley (B.A. expected May 2029). I build ML systems and do research in
      computer vision and medical AI—especially robustness, bias, augmentation, and segmentation.
    </div>

    <div class="p">
      I’m currently the CTO &amp; Co‑Founder of <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Appraise AI</a>,
      where we’re building a multimodal pricing engine and large‑scale ingestion pipeline for resale marketplaces.
      I’ve also been a research intern with the Stanford Center for Biomedical Informatics Research since 2022, working on bias mitigation
      and physiologically‑informed data augmentation for medical imaging.
    </div>

    <div class="p">
    
    </div>

    <div class="links" id="contact">
      <a href="mailto:dils@berkeley.edu">Email</a> /
      <a href="https://scholar.google.com/citations?user=0Sz8VPoAAAAJ&amp;hl=en&amp;oi=ao" target="_blank" rel="noreferrer">Google Scholar</a> /
      <a href="https://github.com/axel-slid" target="_blank" rel="noreferrer">GitHub</a> /
      <a href="resume.pdf" target="_blank" rel="noreferrer">CV</a> /
      <a href="https://www.linkedin.com/in/alex-dils/" target="_blank" rel="noreferrer">LinkedIn</a>
    </div>
  </div>
</section>

<hr/>

<section id="news">
  <h2>News</h2>
  <div class="p">A few recent updates.</div>
  <div class="list">
    <div class="item"><b>Jan 2026:</b> ICML 2026 submission in progress (“Enhancing Medical AI with Physiologically‑Informed Data Augmentation”).</div>
    <div class="item"><b>Nov 2025:</b> Co‑founded Appraise AI; raised $15K pre‑seed and started early enterprise discussions with marketplaces.</div>
    <div class="item"><b>Apr 2025:</b> Published “Eye For An Eye” in the National High School Journal of Science.</div>
    <div class="item"><b>Oct 2024:</b> Posted arXiv preprint on microplastic identification with segmentation + GAN context generation.</div>
  </div>
</section>

<hr/>

<section id="projects">
  <h2 class="li-section-title">Projects</h2>

  <article class="li-card" id="appraise">
    <div class="li-head">
      <div>
        <div class="li-role">Appraise AI — Multimodal resale pricing engine</div>
        <div class="li-dates">Nov 2025 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Building a multimodal pricing engine (vision + language) for resale marketplaces, plus a scalable ingestion pipeline
      that continuously collects and normalizes listings. I lead technical strategy and engineering execution, from modeling
      to infrastructure, and support early customer discovery and enterprise conversations.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Website</a> /
      <a href="https://github.com/axel-slid" target="_blank" rel="noreferrer">GitHub</a>
    </div>

    <div class="li-skill"><span class="li-skill-icon">◇</span> Python, PyTorch and <span>+4 skills</span></div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/appraise-ui.png" target="_blank" rel="noreferrer"><img alt="Appraise UI" src="assets/appraise-ui.png" loading="lazy"/></a>
      <a class="li-thumb" href="assets/appraise-demo.mov" target="_blank" rel="noreferrer"><video src="assets/appraise-demo.mov" preload="metadata" muted></video></a>
      <a class="li-thumb" href="assets/poster-photo.png" target="_blank" rel="noreferrer"><img alt="Poster / demo photo" src="assets/poster-photo.png" loading="lazy"/></a>
    </div>
  </article>

  <article class="li-card" id="stanford-bmir">
    <div class="li-head">
      <div>
        <div class="li-role">Stanford Center for Biomedical Informatics Research — Medical AI</div>
        <div class="li-dates">Jun 2022 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Developing and evaluating segmentation models for medical imaging with a focus on reducing spurious correlations and
      improving robustness under realistic distribution shift. Recent work includes physiologically‑informed augmentation
      (e.g., breathing‑cycle variation) and bias mitigation experiments for large dermatology datasets.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-skill"><span class="li-skill-icon">◇</span> Python, FEniCS and <span>+6 skills</span></div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/ct-overlay.png" target="_blank" rel="noreferrer"><img alt="CT overlay" src="assets/ct-overlay.png" loading="lazy"/></a>
      <a class="li-thumb" href="assets/lung-metrics.gif" target="_blank" rel="noreferrer"><img alt="Lung metrics" src="assets/lung-metrics.gif" loading="lazy"/></a>
      <a class="li-thumb" href="assets/mammogram-figure.gif" target="_blank" rel="noreferrer"><img alt="Mammogram figure" src="assets/mammogram-figure.gif" loading="lazy"/></a>
      <a class="li-thumb" href="assets/breathing-lungs.svg" target="_blank" rel="noreferrer"><img alt="Breathing lungs" src="assets/breathing-lungs.svg" loading="lazy"/></a>
    </div>
  </article>

  <article class="li-card" id="altair">
    <div class="li-head">
      <div>
        <div class="li-role">Altair Chess Engine</div>
        <div class="li-dates">Aug 2022 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      A superhuman chess engine that reached a 3600+ rating and competed in major online engine leagues. Built core search
      and evaluation improvements, maintained training/testing infrastructure, and iterated quickly through tournament feedback.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-skill"><span class="li-skill-icon">◇</span> C++, Git and <span>+1 skill</span></div>
  </article>
</section>

<hr/>

<section id="research">
  <h2>Publications</h2>

  <div class="proj">
    <div class="proj-title">Enhancing Medical AI with Physiologically‑Informed Data Augmentation</div>
    <div class="proj-meta">ICML 2026 submission (pending) — Expected Jan 2026</div>
    <div class="proj-desc">Physiology‑guided augmentation pipelines for more robust medical segmentation under breathing and scanner variability.</div>
  </div>

  <div class="proj">
    <div class="proj-title">Eye For An Eye: A Deep‑Learning and Analytical Method to Spatializing Stereoscopic Images</div>
    <div class="proj-meta">National High School Journal of Science — Apr 17, 2025</div>
    <div class="proj-desc">Methods for transforming a single view into an offset stereoscopic view using Pix2Pix, depth maps, and a composite approach.</div>
  </div>

  <div class="proj">
    <div class="proj-title">Microplastic Identification Using AI‑Driven Image Segmentation and GAN‑Generated Ecological Context</div>
    <div class="proj-meta">arXiv — Oct 27, 2024</div>
    <div class="proj-desc">Segmentation model for microplastic detection using GAN‑generated context to improve generalization across backgrounds.</div>
  </div>
</section>

<hr/>

<section id="misc-projects">
  <h2>Misc Projects</h2>

  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Course Notes</div>
        <div class="li-dates">Ongoing</div>
      </div>
    </div>
    <div class="li-desc" data-lines="3">
      Notes from courses and self‑study across probability, ML, systems, and cognitive science. I’m working on making them
      public in a clean, searchable format.
    </div>
    <button class="li-see-more" type="button">…see more</button>
    <div class="li-skill"><span class="li-skill-icon">◇</span> Writing, Teaching and <span>+1 skill</span></div>
  </article>

  <article class="li-card">
    <div class="li-head">
      <div>
        <div class="li-role">Media Annotator</div>
        <div class="li-dates">Tooling</div>
      </div>
    </div>
    <div class="li-desc" data-lines="3">
      Python tool to annotate audio/video/live events with timestamped comments via keyboard shortcuts, exporting copy‑pasteable
      notes for reviews and writeups.
    </div>
    <button class="li-see-more" type="button">…see more</button>
    <div class="li-skill"><span class="li-skill-icon">◇</span> Python and <span>+1 skill</span></div>
  </article>

  <div class="p" style="margin-top:18px; opacity:0.8;">Created by Alex Dils. Last updated <span id="lastUpdated"></span></div>
</section>
