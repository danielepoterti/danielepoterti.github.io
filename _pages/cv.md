---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

Education
======
* **Ph.D. in Artificial Intelligence**, University of Milano-Bicocca, 2023–2028 (expected: March 2028)
  * Curriculum: Big Data & Analytics for Business · Supervisor: Fabio Mercorio
  * Visiting PhD student, Nanyang Technological University (NTU) Singapore, May–Dec 2026 (host: Erik Cambria)
* **M.Sc. in Data Science**, University of Milano-Bicocca, 2021–2023
* **B.Sc. in Computer Science**, University of Milano-Bicocca, 2018–2021

Research interests
======
* Mechanistic interpretability: activation steering, role vectors, sparse autoencoders
* Evaluation of LLMs and of interpretability methods
* Deception, fragility and safety of LLMs

Experience
======
* **2023–present**: PhD researcher, University of Milano-Bicocca (CRISP research centre)
* **2019–2023**: Freelance software developer (Go, Java, C++, Python)

Skills
======
* Python, PyTorch, Hugging Face; large-scale experiments on HPC (Leonardo, CINECA/EuroHPC)
* Go, Java, C++
* Languages: Italian (native), English

Publications
======
<p><em>Note: my group lists authors alphabetically on several papers; I am the lead author on most of the papers below.</em></p>
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
