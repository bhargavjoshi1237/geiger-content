# Knowledge Depth Estimation & Depth-Aware Recommendation (novice -> intermediate -> expert per topic)

## Knowledge tracing models (BKT, DKT, SAKT/AKT, IRT/Elo) and their transfer to passive content consumption

### Takeaway
Knowledge tracing and Elo/IRT ability models are mature and production-proven (Duolingo Birdbrain, Khan Academy mastery), but all assume a graded observation (right/wrong answer). Simple models (Elo, logistic regression) are often as good as deep ones, which matters for a feed: the transferable piece is the *structure* (a per-user-per-topic latent ability updated against a per-item difficulty), not deep architectures. Tracing from non-assessed activity (video watching) exists but is thin and still leans on some assessed data.

### Cited Findings
- **Duolingo Birdbrain**: estimates both exercise difficulty and learner proficiency, and combines them to predict whether a learner will answer a given exercise correctly; this feeds the Session Generator, which picks exercises "at the right difficulty level for this specific learner" — [Duolingo blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain)
- Birdbrain began personalizing lessons in 2020; roughly 5% of lessons personalized by July and >20% by October 2020. A/B tests showed right-difficulty lessons helped learners learn more and increased engagement (more lessons, more day-over-day returns) — qualitative only, no effect sizes published in the post — [Duolingo blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain)
- Birdbrain updates both estimates after every exercise with one SGD step, described as a generalization of chess Elo: a wrong answer lowers learner ability and raises exercise difficulty, with update size depending on the learner–item gap; goal is a "Goldilocks" difficulty (too hard frustrates, too easy bores); retrained nightly — [IEEE Spectrum](https://spectrum.ieee.org/duolingo)
- A separate tag-based "Blame" process is needed to attribute *why* a learner erred; Birdbrain alone does not distinguish error types — [VentureBeat](https://venturebeat.com/ai/how-duolingo-uses-ai-in-every-part-of-its-app)
- **Elo in education (Pelánek 2016, Computers & Education)**: each answer is treated as a "match" between student and item, giving dynamic estimates of student skill and item difficulty; concludes Elo is simple, robust and effective enough for adaptive learning systems — [Pelánek accepted manuscript](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf); [MUNI record](https://muni.cz/en/research/publications/1376317)
- Pelánek et al. 2017 (UMUAI) propose a modular design separating (1) prior-knowledge estimation, (2) current-knowledge estimation, (3) question construction, with Elo used for learner modeling — [MUNI record](https://www.ics.muni.cz/en/research/publications/1359654)
- **Half-life regression (Settles & Meeder, ACL 2016)**: estimates the "half-life" of a word in long-term memory; reduced recall-prediction error by 45%+ vs baselines — [ACL Anthology](https://preview.aclanthology.org/landing_page/P16-1174)
- Duolingo reports HLR error ~half that of its earlier Leitner system; A/B test: +9.5% retention for practice sessions, +1.7% for lessons, +12% overall activity (company-reported) — [Duolingo blog](https://blog.duolingo.com/how-we-learn-how-you-learn). Code and dataset are open on GitHub (github.com/duolingo/halflife-regression) per same sources.
- **Khan Academy mastery**: five per-skill levels — Not Started, Attempted, Familiar (50 pts), Proficient (80), Mastered (100). Exercise <70% = Attempted, 70–99% = Familiar, 100% = Proficient; mixed-skill quizzes/unit tests can move levels up *or down*; Mastered requires being Proficient and getting all of that skill's questions right on a Unit Test/Course Challenge — [Khan Academy help](https://support.khanacademy.org/hc/en-us/articles/5548760867853). Note: a separate self-paced Mastery article gives Familiar as 70–85%, so thresholds may vary by mode — [Khan Academy help](https://support.khanacademy.org/hc/da/articles/360007253831-What-is-self-paced-Mastery)
- **Deep vs. simple KT**: Gervet et al. (2020, as summarized) found SAKT underperformed DKT on all datasets (contradicting the original SAKT claims), logistic regression better on small datasets, DKT on large ones — [arXiv 2112.15072](https://arxiv.org/pdf/2112.15072)
- A review/empirical evaluation found deep KT models generally beat non-deep ones but differences among deep models are subtle and dataset-dependent; naive mean-prediction can beat sophisticated KT models on accuracy — [arXiv 2112.15072](https://arxiv.org/pdf/2112.15072)
- **AKT** (context-aware attentive KT): positions SAKT as a special case without context-aware question/response representations and monotonic (time-decayed) attention — [arXiv 2007.12324](https://arxiv.org/pdf/2007.12324); simpleKT, a deliberately simple baseline, is "tough-to-beat," with AKT at/near the top on several benchmarks — [arXiv 2302.06881](https://arxiv.org/pdf/2302.06881)
- A 2025 EDM industry paper found LSTM and SAKT models at scale struggle with cold-start (new students), detecting incorrect responses, and staying consistent regardless of question order — [EDM 2025](https://educationaldatamining.org/edm2025/proceedings/2025.EDM.industry-papers.46/2025.EDM.industry-papers.46.pdf)
- BKT is described as interpretable (Bayesian network) but unable to capture nonlinear performance changes — [Journal of Computer Applications 2024](https://www.joca.cn/CN/Y2024/V44/I6/1683)
- **Tracing from non-assessed activity**: most KT methods are not fit for learning from non-assessed activities (e.g., ungraded video lectures). DMKT (EDM 2021) models knowledge transitions across assessed and non-assessed activities (including videos) and better predicts future assessed performance — [EDM 2021 poster](https://educationaldatamining.org/EDM2021/virtual/poster_paper233.html). Earlier, BKT was extended with video-watching as extra observation nodes to estimate how likely a video is to teach a concept, enabling video evaluation/recommendation — [Berkeley tech report EECS-2015-98](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2015/EECS-2015-98.pdf); [EDM 2015 short](https://www.educationaldatamining.org/EDM2015/proceedings/short424-427.pdf)
- A KT survey proposes recommendation objectives beyond "assign unmastered items": review vs explore balance, smooth difficulty progression, and engagement — [arXiv 2105.15106](https://arxiv.org/pdf/2105.15106)

### Inferences
- For a short-form feed, an Elo/IRT-style per-(user, topic) ability score θ and per-item difficulty b, updated online from *pseudo-outcomes* (see next section), is the most transferable and robust choice; deep KT adds little where observations are noisy and sparse, and its cold-start/order problems are worse in feeds.
- Pelánek's three-way split (prior knowledge / current knowledge / item selection) maps cleanly onto a feed: prior = onboarding or cross-topic transfer, current = online θ updates, selection = ranker objective with a target difficulty band.
- Video-as-observation BKT suggests a way to also learn item "teaching value" (does watching X raise later success on Y), useful for ordering explainer content.
- HLR-style decay gives a principled "recap injection" schedule: re-surface a concept when predicted recall drops below a threshold.

### Gaps
- No published system found that runs KT purely from passive short-video consumption with zero assessed signals; DMKT/Pareto-TAMKOT still use graded items.
- Birdbrain's actual target correctness rate and quantitative A/B effects are not public.
- Original DKT (Piech et al. 2015) and BKT (Corbett & Anderson 1995) primary sources were not fetched in this pass.

## Implicit signals of expertise (skipping basics, dwell on advanced, vocabulary, quizzes, feedback buttons, speed, rewatching)

### Takeaway
Behavioral signals carry real but noisy information about difficulty/knowledge: slower playback, pauses and rewatching indicate perceived difficulty; vocabulary specificity distinguishes experts from novices in text. Even with LLMs, inferring expertise from language is only moderately accurate (macro-F1 ~0.38 on 3 levels), and self-reported expertise is unreliable — so lightweight explicit probes (polls/quizzes) remain the strongest signal.

### Cited Findings
- EPFL MOOC study (Li, Kidziński, Jermann, Dillenbourg 2015): slower playback rate, more and longer pauses, and fewer seeks, plus rewatching, are associated with higher self-reported video difficulty; rewatch sessions had higher difficulty ratings — [EPFL Infoscience](https://infoscience.epfl.ch/record/207968?ln=en)
- Princeton/Coursera study (Brinton et al. 2015, ~315K and ~416K events): clickstream behaviors (repeated play/pause, skipping back) relate to first-attempt quiz correctness, sometimes unintuitively; position-based clickstream features improved correctness prediction — [arXiv 1503.06489](https://ar5iv.labs.arxiv.org/html/1503.06489)
- **RecQuest (Kostric, Gadiraju, Balog; arXiv 2512.13173)**: introduces estimating user domain knowledge (low/medium/high) from conversation transcripts; most current systems "treat all users as experts," frustrating novices — [arXiv abstract](https://arxiv.org/abs/2512.13173)
  - Ground truth via objective quiz percentiles (novice ≤20th pct, expert ≥80th); **self-assessments were unreliable** — self-identified novices had higher task success than self-identified experts — [arXiv HTML](https://arxiv.org/html/2512.13173v2)
  - Expert cues: technical domain terms (e.g., "autofocus," "brake") vs novice evaluative words ("good," "comfort"); experts mention more specific attributes per conversation (9.01 vs 6.80), longer utterances (17.3 vs 14.0 words); novices ask more clarifying questions — [arXiv HTML](https://arxiv.org/html/2512.13173v2)
  - Best results only moderate: Llama 3.3 zero-shot evidence-based 0.417 acc / 0.382 macro-F1; ModernBERT 0.524 acc / 0.353 macro-F1; dataset 515 dialogues across 5 domains — [arXiv HTML](https://arxiv.org/html/2512.13173v2)
- **Expertise evolves with consumption**: McAuley & Leskovec (WWW 2013) model user experience level in a latent-factor recommender over ~15M beer/wine/food/movie reviews; experienced users' tastes shift, and "the best products are not always the most accessible to newer users" (e.g., *Seven Samurai*); accounting for experience improves recommendations — [arXiv 1303.4402](https://arxiv.org/pdf/1303.4402)
- Duolingo placement tests adapt: harder items after consistent correct answers, easier after mistakes — [IEEE Spectrum](https://spectrum.ieee.org/duolingo)

### Inferences
- Candidate pseudo-outcomes for Elo updates in a feed (to be validated): *skip within first ~2s of a basic item* (weak "knows it" if user engaged with same topic recently), *full watch + rewatch of an advanced item* (ambiguous: interest or struggle — combine with pause/scrub patterns per the EPFL findings), *poll/quiz answer* (strong, graded), *"I knew this" / "Learned something" button* (explicit, near-graded), *search/comment vocabulary specificity* (RecQuest-style cue).
- Rewatching is ambiguous: it indicates difficulty (struggle) not necessarily expertise; it should push θ *down* or flag the item as hard, not mark the user as expert.
- Because self-reports are unreliable, onboarding "rate your level" should be a weak prior, quickly overridden by quiz/behavior evidence.
- McAuley & Leskovec support modeling θ as time-evolving with cumulative exposure in the topic (experience count is itself a feature).

### Gaps
- No published study found validating "fast skip of basic content" as an expertise indicator in short-form feeds; dwell is confounded by interest and content quality.
- No public data found on "I knew this"/"learned something" button usage or predictive value (no product found exposing exactly these).
- Search-query vocabulary as an expertise signal found only for conversational settings (RecQuest), not search logs.

## Tagging content with difficulty/depth levels (readability, LLM classification, prerequisite graphs, Bloom's taxonomy)

### Takeaway
Item difficulty can be bootstrapped from LLM-extracted features (Bloom level, misconceptions) and then calibrated online from user outcomes (Elo/IRT). Prerequisite graphs can be LLM-extracted with expert review. LLMs label Bloom levels reasonably but are better at raising than lowering cognitive demand, and most evidence is preprints.

### Cited Findings
- LLM-extracted features (Bloom level 1–6, misconception count) used as inputs to IRT difficulty estimation ("synthetic student responses") — [arXiv 2602.00034](https://arxiv.org/pdf/2602.00034)
- In data science courses, LLM-assigned difficulty tracked co-generated Bloom levels (easy=recall, hard=analysis), with stem length rising with difficulty; the paper is about the *limits* of AI-generated difficulty — [arXiv 2609.27063](https://arxiv.org/pdf/2609.27063)
- Smaller language models are viable for question-difficulty estimation (EDM 2024 poster), citing earlier keyword-based Bloom mapping — [EDM 2024](https://educationaldatamining.org/EDM2024/proceedings/2024.EDM-posters.90/2024.EDM-posters.90.pdf)
- LLMs reliably raise cognitive demand on request but struggle to lower it (Bloom-aligned control framework, 2026 preprint) — [alphaXiv 2607.08009](https://www.alphaxiv.org/abs/2607.08009)
- Linear probes decode Bloom levels from LLM activations at ~95% accuracy (self-reported preprint) — [arXiv 2602.17229](https://arxiv.org/html/2602.17229v1)
- LLMs perform better on lower Bloom levels; benchmarks under-cover higher levels (COLING 2025) — [ACL Anthology](https://preview.aclanthology.org/setup/2025.coling-main.350)
- **Prerequisite graphs**: GPT-4 extracted topics and pairwise prerequisite edges from 26 graduate AI lesson PDFs; ambiguous/bidirectional answers discarded, yielding 54 nodes / 47 directed edges, used to detect knowledge gaps from conversational AI interactions — [arXiv 2606.10736](https://arxiv.org/pdf/2606.10736)
- LECDPR uses LLM-generated concept descriptions fused with concept-document embeddings, beating ten baselines on UCD, LectureBank, MOOC datasets — [IJCAI 2026](https://www.ijcai.org/proceedings/2026/0567.pdf)
- ACE (JEDM): embedding-based scoring ranks concept pairs for expert labeling and infers prerequisites transitively, significantly reducing expert effort — [JEDM via distantreader](https://distantreader.org/stacks/journals-ojs/jedm/jedm-737.htm)
- Knowledge-graph-enhanced news recommenders (DKN, KRED, KIM) inject entity knowledge into item representations, but do not model user expertise — [DKN arXiv 1801.08284](https://arxiv.org/pdf/1801.08284); [KRED arXiv 1910.11494](https://arxiv.org/pdf/1910.11494); [survey](https://dx.doi.org/10.3233/SW-222991)

### Inferences
- Practical pipeline: (1) LLM tags each item with topic, concepts, Bloom level, and a 1–5 depth prior; (2) prerequisite edges between concepts via LLM + sampled human review (ACE-style); (3) item difficulty b initialized from the LLM prior, then updated Elo-style from user pseudo-outcomes so labels self-correct.
- "Depth" in short-form media is broader than Bloom: jargon density, assumed prerequisites, and pace matter; prerequisite count (graph depth from root concepts) is a decent structural depth proxy.
- Since LLMs struggle to *lower* demand, generating "basics" versions should be reviewed more carefully than "advanced" versions.

### Gaps
- No found validation of readability formulas or LLM depth labels specifically on short-form video transcripts.
- No published depth taxonomy for social/short-form content (vs. assessment items).

## Zone of proximal development / desirable difficulty; novelty vs familiarity; boredom vs overwhelm

### Takeaway
There is theory and computational support for a target difficulty band (the "85% rule": ~15% error optimal for gradient learners; Duolingo's "Goldilocks") and for an inverted-U (Wundt curve) relation between novelty and enjoyment, personalised per user. Expertise reversal shows content that helps novices can actively hurt experts — the core reason experts reject basic content.

### Cited Findings
- **85% rule** (Wilson, Shenhav, Straccia, Cohen, Nature Communications 2019): for SGD-based learners on binary classification, optimal training error ≈15.87% (~85% accuracy); shown in ANNs and biologically plausible networks; authors flag extension to complex learning as future work — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579)
- Duolingo explicitly targets "Goldilocks" difficulty because too-hard frustrates and too-easy bores — [IEEE Spectrum](https://spectrum.ieee.org/duolingo)
- **Expertise reversal effect** (Kalyuga, Ayres, Chandler, Sweller 2003, Educational Psychologist 38(1):23–31): techniques highly effective for inexperienced learners lose effectiveness and can have negative consequences for experienced learners (cognitive load theory — redundant guidance burdens working memory) — [UNSW](https://unsworks.unsw.edu.au/entities/publication/2222917b-75b2-411f-b259-8a79dff5a22f/full); [Wikipedia overview](https://en.wikipedia.org/wiki/Expertise_reversal_effect)
- **Curiosity/Wundt curve recommenders**: CBRS (Zhao & Lee) builds a Probabilistic Curiosity Model from access history based on Wundt's curve and curiosity-arousal theory, recommending items that are relevant and within each user's novelty appetite — [HKUST](https://cse.hkust.edu.hk/pg/defenses/S16/ericzhao-25-02-2016.html); Abbas & Niu (2019) build personal curiosity curves using item surprise as stimulus, ranking well-rated and likely-to-respond items higher — [Papers with Code](https://paperswithcode.com/paper/one-size-does-not-fit-all-modeling-users); [NSF PAR](https://par.nsf.gov/biblio/10188332)
- "How much novelty is relevant? It depends on your curiosity" (HKUST) — personalising novelty level per user — [HKUST research portal](https://researchportal.hkust.edu.hk/en/publications/how-much-novelty-is-relevant-it-depends-on-your-curiosity-2/)
- MOOC behavioral markers of perceived difficulty (pauses, slow playback, rewatching) — usable as overwhelm signals — [EPFL](https://infoscience.epfl.ch/record/207968?ln=en)

### Inferences
- Operationalise ZPD in a feed as: choose items whose predicted "success" p = σ(θ_user,topic − b_item) falls in a target band (e.g., ~0.7–0.85), where "success" = understood/engaged without overwhelm. The 85% figure is a heuristic, not proven for media consumption.
- Boredom signals: rapid skips of items with b ≪ θ in a liked topic. Overwhelm signals: early exits/pauses/scrub-backs on items with b ≫ θ, followed by topic abandonment. These should shift item selection along difficulty, not reduce topic weight.
- Expertise reversal justifies a hard rule: demote "intro/explainer" items for users with high θ even if topic affinity is high.

### Gaps
- No empirical study found applying the 85% rule or a ZPD band to entertainment/short-form feeds.
- Curiosity-recommender evaluations are mostly offline, by the same groups; no independent replication found.

## Existing products doing depth-aware or learning feeds, and what they expose

### Takeaway
Explicit depth adaptation is well documented only in assessment-centric apps (Duolingo, Khan Academy). Learning-oriented short-form feeds (TikTok STEM) curate for *quality/appropriateness*, not learner depth. Brilliant/Imprint market personalization but publish no mechanism details.

### Cited Findings
- **Duolingo**: Birdbrain difficulty-matched lessons; HLR strength meters for decay/review; adaptive placement test — [Duolingo blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain); [Duolingo blog](https://blog.duolingo.com/how-we-learn-how-you-learn); [IEEE Spectrum](https://spectrum.ieee.org/duolingo)
- **Khan Academy**: user-visible per-skill mastery levels with points (Familiar 50 / Proficient 80 / Mastered 100), levels can drop on later assessments — [Khan Academy help](https://support.khanacademy.org/hc/en-us/articles/5548760867853); course/unit mastery — [Khan Academy help](https://support.khanacademy.org/hc/articles/115002552631-What-are-Course-and-Unit-Mastery-)
- **TikTok STEM feed** (announced 14 Mar 2023): dedicated STEM tab; Common Sense Networks checks appropriateness and Poynter checks reliability; content failing either is ineligible — [TikTok Newsroom](https://newsroom.tiktok.com/take-discovery-to-a-new-level-with-stem-feed?lang=en). Expanded to Europe (UK/Ireland first) in 2024; TikTok said a third of teens visited it weekly — [TechCrunch](https://techcrunch.com/2024/04/01/tiktok-is-bringing-its-dedicated-stem-feed-to-europe). A Civic Science Observer piece misdates the launch to 2024 — [Civic Science Observer](https://civicsciencemedia.org/tiktoks-new-stem-feed-a-tool-for-researchers-and-practitioners-to-engage-with-a-wider-audience/)
- **Brilliant**: store listing claims a "personalized learning system" built by experts from MIT/Harvard; no mechanism published — [AppBrain listing](https://www.appbrain.com/appstore/brilliant-learn-math-coding/ios-913335252)
- **Imprint**: bite-sized visual lessons, daily retention quizzes, a "gamified learning path"; 4M+ learners claimed — [App Store](https://apps.apple.com/app/id1482780647)

### Inferences
- No product found exposes a user-visible per-topic "depth" slider in a social/short-form feed; this is a whitespace opportunity. Khan's mastery levels are the clearest precedent for a user-visible, revisable depth label.
- TikTok STEM shows the pattern of a separate *curated* surface rather than depth adaptation in the main feed.

### Gaps
- Not researched in this pass (no sources gathered): Headway, Blinkist, Quizlet adaptive learning internals, YouTube "Courses"/learning shelves, Medium/Substack expertise signals. Treat any claims about these as unverified.
- No details found on whether TikTok STEM ranks by difficulty or learner level.

## Distinguishing "knows topic" vs "likes topic" vs "interested in topic"

### Takeaway
Interest and knowledge are distinct but co-develop (Hidi & Renninger); recommender research shows experience level changes what users value (McAuley & Leskovec); and expertise reversal explains why experts reject basics. A depth-aware feed must keep at least two separate per-topic state variables: affinity (likes) and ability (knows), plus an optional "curiosity/exploration" state.

### Cited Findings
- Four-phase model of interest (Hidi & Renninger 2006, Educational Psychologist 41(2):111–127): triggered situational → maintained situational → emerging individual → well-developed individual interest — [Swarthmore Works](https://works.swarthmore.edu/fac-education/12); [InformalScience](https://www.informalscience.org/four-phase-model-interest-development)
- Knowledge and value grow alongside interest; early-phase learners may have little knowledge or regard for the subject (secondary summary) — [OISE/U of Toronto](https://www.oise.utoronto.ca/home/about/news/08-05-24-exploring-interest-education-understanding-core-dr-suzanne-hidis-psychological)
- Experienced users' preferences diverge from novices'; modelling experience improves recommendations — [arXiv 1303.4402](https://arxiv.org/pdf/1303.4402)
- Instructional material good for novices can harm experts (expertise reversal) — [UNSW](https://unsworks.unsw.edu.au/entities/publication/2222917b-75b2-411f-b259-8a79dff5a22f/full)
- Systems that treat all users as experts frustrate novices; self-assessed expertise is unreliable — [arXiv 2512.13173](https://arxiv.org/html/2512.13173v2)

### Inferences
- Signature patterns: *Likes + knows* (expert fan): skips basics, completes advanced, high topic affinity → serve high b, demote explainers. *Likes + doesn't know* (enthusiast novice): high affinity, completes explainers, struggles on advanced → serve near-θ items with progression. *Interested (situational)*: sporadic, curiosity-triggered engagement → serve accessible hooks; per Hidi & Renninger, sustain interest before depth. *Knows + dislikes*: high quiz performance but low dwell → low affinity, don't push even "right-depth" content.
- A skip of a basic item in a liked topic must NOT decrease affinity; it should increase θ (or reduce that item's fit). Conventional engagement-only rankers conflate these.

### Gaps
- No recommender paper found that explicitly factorises affinity vs knowledge vs situational interest with empirical validation in a content feed.

## Practical design for operator knobs (target depth, progression speed, mastery thresholds, recap/spaced repetition)

### Takeaway
Production precedents give concrete knob shapes: Khan-style mastery thresholds (70% / 100%, demotable), Elo learning rate as progression speed, Duolingo-style target success band, and HLR recall thresholds for recap injection. Explicit KT-recommendation objectives (review vs explore, smooth difficulty, engagement) map directly to operator weights.

### Cited Findings
- Mastery thresholds precedent: Khan <70% Attempted, 70–99% Familiar, 100% Proficient, Mastered only via all-correct on mixed assessment; levels can be lost — [Khan Academy help](https://support.khanacademy.org/hc/en-us/articles/5548760867853)
- Elo update size depends on the learner–item gap; Birdbrain retrained nightly with online per-exercise updates — [IEEE Spectrum](https://spectrum.ieee.org/duolingo); Elo guidelines for adaptive systems — [Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- Target difficulty: ~85% success optimal for gradient learners — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579); Goldilocks targeting at Duolingo — [IEEE Spectrum](https://spectrum.ieee.org/duolingo)
- Spaced repetition: HLR predicts per-item recall half-life; drove +12% overall activity in Duolingo A/B (company-reported) — [Duolingo blog](https://blog.duolingo.com/how-we-learn-how-you-learn)
- Recommendation objectives: review & explore balance, smoothness of difficulty, engagement — [arXiv 2105.15106](https://arxiv.org/pdf/2105.15106)
- Per-user novelty appetite as a tunable limit in curiosity recommenders — [HKUST CBRS](https://cse.hkust.edu.hk/pg/defenses/S16/ericzhao-25-02-2016.html)

### Inferences (proposed knobs for Geiger feed)
- **Target depth offset**: serve items with b ≈ θ + δ, δ ∈ {−1 (comfort), 0 (match), +0.5 (stretch)}; or equivalently a target predicted-success band (default 0.70–0.85).
- **Progression speed**: Elo K-factor per topic (higher = faster level changes); separate up/down K to make demotion slower than promotion (avoid punishing one bad item).
- **Mastery thresholds**: θ cutoffs mapping to Novice / Intermediate / Expert labels with hysteresis; optional "require a quiz pass to promote to Expert" (Khan-style), demotable on later evidence.
- **Basics suppression**: hard demote items with b < θ − margin for users labelled Expert (expertise reversal), while preserving topic affinity.
- **Recap / spaced-repetition injection rate**: cap e.g. N recap items per session; trigger when HLR-estimated recall < threshold for concepts the user engaged with.
- **Explore vs deepen ratio**: share of slots for new adjacent topics (curiosity) vs deeper items in known topics; per-user novelty appetite.
- **Signal weights**: operator-tunable weights for pseudo-outcomes (quiz answer > "I knew this" button > fast skip of basic > dwell), since behavioral signals are noisy.
- **Cold start prior**: onboarding self-report as weak prior only (self-assessment unreliable per RecQuest); 1–3 calibration polls per topic as stronger prior.

### Gaps
- No public A/B evidence on these knobs in short-form entertainment feeds; numeric defaults above are inferences, not sourced.
- No operator-facing depth-control UI found in any commercial feed product to benchmark against.
