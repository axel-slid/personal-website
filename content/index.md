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
      I’m currently the CTO &amp; Co-Founder of <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Appraise AI</a>,
      where we’re building a multimodal pricing engine and large-scale ingestion pipeline for resale marketplaces.
      I’ve also been a research intern with the Stanford Center for Biomedical Informatics Research since 2022, working on bias mitigation
      and physiologically-informed data augmentation for medical imaging.
    </div>

    <div class="p"></div>

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

<!-- RESEARCH FIRST -->
<section id="research">
  <h2>Research</h2>
  <div class="p">Selected publications and ongoing work.</div>

  <!-- 1) Physio augmentation -->
  <article class="li-card" id="pub-physio-aug">
    <div class="li-head">
      <div>
        <div class="li-role">Enhancing Medical AI with Physiologically-Informed Data Augmentation</div>
        <div class="li-dates">ICML 2026 submission (pending) — Expected Jan 2026</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Physiology-guided augmentation pipelines that model breathing motion and anatomical deformation to improve segmentation
      robustness under realistic distribution shift (patient state, scanner variability, acquisition differences).
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <!-- TODO: add when public -->
      <!-- <a href="PAPER_URL" target="_blank" rel="noreferrer">Paper</a> / -->
      <!-- <a href="CODE_URL" target="_blank" rel="noreferrer">Code</a> -->
    </div>

    <!-- Media: use concrete visuals (augmentation/metrics), keep it to 2 -->
    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/breathing-lungs.svg" target="_blank" rel="noreferrer">
        <img alt="Breathing deformation visualization" src="assets/breathing-lungs.svg" loading="lazy"/>
      </a>
      <a class="li-thumb" href="assets/lung-metrics.gif" target="_blank" rel="noreferrer">
        <img alt="Robustness / segmentation metrics" src="assets/lung-metrics.gif" loading="lazy"/>
      </a>
    </div>
  </article>

  <!-- 2) Eye For An Eye -->
  <article class="li-card" id="pub-eye-for-an-eye">
    <div class="li-head">
      <div>
        <div class="li-role">Eye For An Eye: A Deep-Learning and Analytical Method to Spatializing Stereoscopic Images</div>
        <div class="li-dates">National High School Journal of Science — Apr 17, 2025</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Hybrid analytical + deep learning approach for generating stereoscopic pairs from a single view, combining depth estimation,
      Pix2Pix-style synthesis, and geometric constraints to produce stable parallax without distortion.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <!-- TODO: add links -->
      <!-- <a href="PAPER_URL" target="_blank" rel="noreferrer">Paper</a> / -->
      <!-- <a href="CODE_URL" target="_blank" rel="noreferrer">Code</a> -->
    </div>

    <!-- Media: show before/after or method figure (replace filenames with your actual assets) -->
    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/stereo-before.png" target="_blank" rel="noreferrer">
        <img alt="Single-view input" src="assets/stereo-before.png" loading="lazy"/>
      </a>
      <a class="li-thumb" href="assets/stereo-after.png" target="_blank" rel="noreferrer">
        <img alt="Generated stereoscopic pair" src="assets/stereo-after.png" loading="lazy"/>
      </a>
    </div>
  </article>

  <!-- 3) Microplastics -->
  <article class="li-card" id="pub-microplastics">
    <div class="li-head">
      <div>
        <div class="li-role">Microplastic Identification Using AI-Driven Image Segmentation and GAN-Generated Ecological Context</div>
        <div class="li-dates">arXiv preprint — Oct 27, 2024</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Microplastic segmentation pipeline trained with GAN-generated ecological backgrounds to reduce background shortcuts and
      improve generalization across collection sites, lighting, and substrate variation.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <!-- TODO: add arXiv link -->
      <!-- <a href="ARXIV_URL" target="_blank" rel="noreferrer">Paper</a> / -->
      <a href="https://github.com/axel-slid/Microplastic-Segmentation-GAN" target="_blank" rel="noreferrer">Code</a>
    </div>

    <!-- Media: segmentation mask + GAN context figure (replace filenames with your actual assets) -->
    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/microplastics-mask.png" target="_blank" rel="noreferrer">
        <img alt="Microplastic segmentation output" src="assets/microplastics-mask.png" loading="lazy"/>
      </a>
      <a class="li-thumb" href="assets/microplastics-gan-context.png" target="_blank" rel="noreferrer">
        <img alt="GAN-generated ecological context" src="assets/microplastics-gan-context.png" loading="lazy"/>
      </a>
    </div>
  </article>

  <!-- 4) Skin lesions (in revision) -->
  <article class="li-card" id="pub-skin-lesions">
    <div class="li-head">
      <div>
        <div class="li-role">Addressing Bias and Confounders in AI-based Image Diagnosis — A Study of 117,610 Skin Lesions</div>
        <div class="li-dates">Cell (in revision) — Jan 2, 2025</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Large-scale evaluation of bias and confounding in dermatology image diagnosis, with targeted experiments for spurious correlations,
      subgroup performance, and robustness under dataset shift.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <!-- TODO: add link when available -->
      <!-- <a href="PAPER_URL" target="_blank" rel="noreferrer">Paper</a> / -->
      <!-- <a href="CODE_URL" target="_blank" rel="noreferrer">Code</a> -->
    </div>

    <!-- Media: include only if you have a strong summary figure -->
    <div class="li-media" data-max="1">
      <a class="li-thumb" href="assets/derm-bias-figure.png" target="_blank" rel="noreferrer">
        <img alt="Bias/confounder analysis figure" src="assets/derm-bias-figure.png" loading="lazy"/>
      </a>
    </div>
  </article>

  <!-- 5) Mechanistic knowledge -->
  <article class="li-card" id="pub-mechanistic">
    <div class="li-head">
      <div>
        <div class="li-role">Integrating Mechanistic Knowledge into Deep Learning for Improved Cancer Detection</div>
        <div class="li-dates">FEniCS Conference 2024 Proceedings — Jun 16, 2024</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Combines mechanistic priors (physics / simulation) with deep models to improve detection performance and stability,
      especially when data is limited or acquisition conditions change.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <!-- TODO: add proceedings/paper link if public -->
      <!-- <a href="PAPER_URL" target="_blank" rel="noreferrer">Paper</a> / -->
      <!-- <a href="CODE_URL" target="_blank" rel="noreferrer">Code</a> -->
    </div>

    <!-- Media: mechanistic overlay is a good fit -->
    <div class="li-media" data-max="1">
      <a class="li-thumb" href="assets/ct-overlay.png" target="_blank" rel="noreferrer">
        <img alt="Mechanistic/medical imaging overlay" src="assets/ct-overlay.png" loading="lazy"/>
      </a>
    </div>
  </article>
</section>

<hr/>

<section id="news">
  <h2>News</h2>
  <div class="p">A few recent updates.</div>
  <div class="list">
    <div class="item"><b>Jan 2026:</b> ICML 2026 submission in progress (“Enhancing Medical AI with Physiologically-Informed Data Augmentation”).</div>
    <div class="item"><b>Nov 2025:</b> Co-founded Appraise AI; raised $15K pre-seed and started early enterprise discussions with marketplaces.</div>
    <div class="item"><b>Apr 2025:</b> Published “Eye For An Eye” in the National High School Journal of Science.</div>
    <div class="item"><b>Oct 2024:</b> Posted arXiv preprint on microplastic identification with segmentation + GAN context generation.</div>
  </div>
</section>

<hr/>

<!-- PROJECTS: pinned-repo style -->
<section id="projects">
  <h2 class="li-section-title">Projects</h2>
  <div class="p">A few things I’ve built.</div>

  <div class="pinned-grid">
    <a class="pin" href="https://github.com/axel-slid/Microplastic-Segmentation-GAN" target="_blank" rel="noreferrer">
      <div class="pin-title">Microplastic-Segmentation-GAN <span class="pin-pill">Public</span></div>
      <div class="pin-meta"><span class="dot dot-python"></span> Python</div>
    </a>

    <a class="pin" href="https://github.com/axel-slid/astroai_task" target="_blank" rel="noreferrer">
      <div class="pin-title">astroai_task <span class="pin-pill">Public</span></div>
      <div class="pin-meta"><span class="dot dot-python"></span> Python</div>
    </a>

    <a class="pin" href="https://github.com/axel-slid/personal-website" target="_blank" rel="noreferrer">
      <div class="pin-title">personal-website <span class="pin-pill">Public</span></div>
      <div class="pin-meta"><span class="dot dot-js"></span> JavaScript</div>
    </a>

    <a class="pin" href="https://github.com/axel-slid/speed_reader" target="_blank" rel="noreferrer">
      <div class="pin-title">speed_reader <span class="pin-pill">Public</span></div>
      <div class="pin-meta"><span class="dot dot-js"></span> JavaScript</div>
    </a>

    <a class="pin" href="https://github.com/alekseyvalouev/VLunAr" target="_blank" rel="noreferrer">
      <div class="pin-title">alekseyvalouev/VLunAr <span class="pin-pill">Public</span></div>
      <div class="pin-meta"><span class="dot dot-python"></span> Python</div>
    </a>
  </div>

  <!-- Keep Appraise as a detailed non-GitHub project card -->
  <article class="li-card" id="appraise">
    <div class="li-head">
      <div>
        <div class="li-role">Appraise AI — Multimodal resale pricing engine</div>
        <div class="li-dates">Nov 2025 – Present</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      Building a multimodal pricing engine (vision + language) for resale marketplaces, plus a scalable ingestion pipeline that
      continuously collects and normalizes listings. I lead technical strategy and engineering execution across modeling and infrastructure.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <a href="https://appraiseai.co" target="_blank" rel="noreferrer">Website</a> /
      <a href="https://github.com/axel-slid" target="_blank" rel="noreferrer">GitHub</a>
    </div>

    <div class="li-skill"><span class="li-skill-icon">◇</span> Python, PyTorch and <span>+4 skills</span></div>

    <div class="li-media" data-max="2">
      <a class="li-thumb" href="assets/appraise-ui.png" target="_blank" rel="noreferrer">
        <img alt="Appraise UI" src="assets/appraise-ui.png" loading="lazy"/>
      </a>
      <a class="li-thumb" href="assets/poster-photo.png" target="_blank" rel="noreferrer">
        <img alt="Poster / demo photo" src="assets/poster-photo.png" loading="lazy"/>
      </a>
      <a class="li-thumb" href="assets/appraise-demo.mov" target="_blank" rel="noreferrer">
        <video src="assets/appraise-demo.mov" preload="metadata" muted></video>
      </a>
    </div>
  </article>
</section>

<hr/>

<section id="misc-projects">
  <h2>Misc Projects</h2>

  <article class="li-card" id="speed-reader">
    <div class="li-head">
      <div>
        <div class="li-role">Speed Reader — Web-based rapid reading tool</div>
        <div class="li-dates">Tooling</div>
      </div>
    </div>

    <div class="li-desc" data-lines="3">
      JavaScript speed reading app (RSVP-style) with adjustable pacing, chunking, and keyboard controls for high-throughput reading.
      Built to stay lightweight and fast while supporting a clean, distraction-free flow.
    </div>
    <button class="li-see-more" type="button">…see more</button>

    <div class="li-links">
      <a href="https://github.com/axel-slid/speed_reader" target="_blank" rel="noreferrer">Code</a>
    </div>

    <div class="li-skill"><span class="li-skill-icon">◇</span> JavaScript, UI Design and <span>+1 skill</span></div>

    <div class="li-media" data-max="1">
      <!-- TODO: add a single clean screenshot -->
      <a class="li-thumb" href="assets/speed-reader-ui.png" target="_blank" rel="noreferrer">
        <img alt="Speed Reader interface" src="assets/speed-reader-ui.png" loading="lazy"/>
      </a>
    </div>
  </article>

  <div class="p" style="margin-top:18px; opacity:0.8;">
    Created by Alex Dils. Last updated <span id="lastUpdated"></span>
  </div>
</section>

<!-- Minimal CSS for the pinned grid (drop into your stylesheet if not already present) -->
<style>
  .pinned-grid{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px;
    margin:14px 0 22px;
  }
  @media (max-width: 820px){
    .pinned-grid{ grid-template-columns:1fr; }
  }
  .pin{
    display:block;
    border:1px solid rgba(255,255,255,0.12);
    border-radius:14px;
    padding:14px 14px 12px;
    text-decoration:none;
    background:rgba(255,255,255,0.03);
  }
  .pin:hover{
    border-color: rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.04);
  }
  .pin-title{
    font-weight:650;
    font-size:16px;
    display:flex;
    align-items:center;
    gap:10px;
    line-height:1.2;
  }
  .pin-pill{
    font-size:12px;
    padding:2px 8px;
    border-radius:999px;
    border:1px solid rgba(255,255,255,0.18);
    opacity:0.85;
  }
  .pin-meta{
    margin-top:10px;
    opacity:0.85;
    font-size:13px;
    display:flex;
    align-items:center;
    gap:8px;
  }
  .dot{
    width:10px;
    height:10px;
    border-radius:999px;
    display:inline-block;
    background:#999;
  }
  .dot-python{ background:#4b86ff; }
  .dot-js{ background:#f4d03f; }
</style>
