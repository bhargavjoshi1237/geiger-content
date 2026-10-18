# Interest Drift, Interest Funnels / Rabbit Holes, and Exploration in Feed Recommenders

Source note: items marked (verified) had their content checked in this session through a fetch or search snippet. Items marked (abstract-level) are canonical papers cited at their primary URL from prior knowledge. For those, only well-established, abstract-level claims are stated, and their pages were not re-fetched in this session.

## 1. Short-term vs long-term interest modelling

### Takeaway
Production feeds split user state into a slow, long-horizon representation (batch-computed embeddings, or retrieval over lifelong sequences of 10^4 to 10^5 events) and a fast, session or real-time representation (streaming sequence features, minute-level online training). Both are fed to the ranker, so "drift" is handled structurally by the fast path rather than by explicit decay alone. Multi-interest models (MIND, ComiRec) keep several interest vectors per user. That gives a natural unit for tracking per-topic depth and diversity.

### Cited Findings
- **PinnerFormer (Pinterest, KDD 2022):** a transformer user embedding trained to predict positive engagement over a **14-day future window** rather than only the next action (a "dense all-action loss"). It was designed for **daily batch inference** instead of streaming. The objective "nearly halves" the performance gap between daily and realtime inference. Reported production lifts were **+7.5% Repins** and **+6% Close-ups** — [arXiv 2205.04507](https://ar5iv.labs.arxiv.org/html/2205.04507) (verified via search summary); [Semantic Scholar](https://www.semanticscholar.org/paper/PinnerFormer:-Sequence-Modeling-for-User-Pancha-Zhai/a227a31dd69efd64e7840b08e325bb99bc05baa5)
- Pinterest's Homefeed ranker combines **long-term (PinnerFormer)** and **short-term/real-time (TransAct)** user-sequence features. This is the canonical "dual-rate" production pattern. Its predecessor PinnerSage used multiple embeddings per user, which caused storage, training and latency problems — [Rethinking Personalized Ranking at Pinterest, arXiv 2209.08435](https://arxiv.org/pdf/2209.08435); [TransAct, arXiv 2306.00248](https://arxiv.org/abs/2306.00248) (abstract-level)
- **TWIN (Kuaishou, KDD 2023):** lifelong modelling over months or years of behaviour. Earlier two-stage systems (a General Search Unit that filters tens of thousands of behaviours, then an Exact Search Unit that runs target attention) used inconsistent relevance metrics. TWIN's Consistency-Preserved GSU uses the same target-attention metric in both stages and scales target attention from about 10^2 to **10^4–10^5 behaviours**. It does this by pre-computing and caching item-feature projections and compressing user-item cross features into a scalar attention bias — [arXiv 2302.02352](https://arxiv.org/html/2302.02352v2) (verified)
- **SIM (Alibaba, CIKM 2020):** search-based interest modelling. A General Search Unit retrieves the behaviours relevant to the candidate item (by hard category search or soft embedding search) from lifelong sequences, then an Exact Search Unit models them — [arXiv 2006.05639](https://arxiv.org/abs/2006.05639) (abstract-level). **ETA** replaces the offline-built search with end-to-end LSH (SimHash) retrieval — [arXiv 2108.04468](https://arxiv.org/abs/2108.04468) (abstract-level)
- **DIEN (Alibaba, AAAI 2019):** explicitly models *interest evolution* with an interest-extractor GRU plus an attention-gated AUGRU. Only the interest trajectory relevant to the target item evolves, which suppresses "interest drifting" between unrelated topics — [arXiv 1809.03672](https://arxiv.org/abs/1809.03672) (abstract-level)
- **Monolith (ByteDance, 2022):** a real-time training system with a collisionless embedding table (cuckoo hashing, expiring and frequency-filtered IDs) and online training that syncs parameters from training to serving at minute-level intervals. Real-time training lets the model follow fast concept drift in user interest — [arXiv 2209.07663](https://arxiv.org/abs/2209.07663) (abstract-level)
- **Multi-interest models:** MIND (Alibaba/Tmall) uses capsule dynamic routing to extract several interest vectors per user for retrieval — [arXiv 1904.08030](https://arxiv.org/abs/1904.08030). ComiRec (KDD 2020) extracts multiple interests and adds a *controllable aggregation module* with a tunable factor that trades accuracy against diversity — [arXiv 2005.09347](https://arxiv.org/abs/2005.09347) (both abstract-level)
- **Session-based / sequential baselines:** GRU4Rec (session RNN) — [arXiv 1511.06939](https://arxiv.org/abs/1511.06939); SASRec (self-attentive sequential) — [arXiv 1808.09781](https://arxiv.org/abs/1808.09781) (abstract-level)
- **Time-decay foundations:** timeSVD++ models time-changing user biases and factors, separating long-term trends from transient day-specific effects — [Koren, KDD 2009](https://dl.acm.org/doi/10.1145/1557019.1557072). YouTube's DNN recommender adds an "example age" feature so the model can learn the freshness and time-dependence of popularity — [Covington et al. 2016](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/) (abstract-level)

### Inferences
- For a non-hyperscale feed, the closest equivalent is a **two-profile design**. A long-term profile is either an exponentially decayed topic-affinity vector with a half-life of weeks, or a batch embedding. A short-term profile covers the last N interactions or the session, with a half-life of minutes to hours. The ranker sees both, and their blend weight becomes an operator control ("how reactive is the feed").
- Multi-interest representations (one vector or topic cluster per interest) are the right substrate for funnel and depth tracking, because each interest can be aged, capped or diversified independently.

### Gaps
- No public number found for the half-lives production systems actually use. TikTok, Kuaishou and YouTube do not disclose decay constants.
- The Monolith sync interval and SIM sequence lengths are stated from prior knowledge of the abstracts and were not re-fetched.

## 2. Concept-drift detection in user profiles (emerging vs spike vs fading interest)

### Takeaway
Industry rarely publishes explicit drift *detectors* for user profiles. Drift is mostly absorbed by real-time training and dual-rate features. The classical toolbox still applies and suits an operator-facing system: dual exponential moving averages (fast vs slow), Bayesian online change-point detection, and windowed tests. The useful classification is **emerging** (fast > slow and the gap persists across sessions), **spike** (fast >> slow but decays within a session or day), and **fading** (slow > fast for a sustained window).

### Cited Findings
- **Bayesian Online Change-Point Detection** maintains a posterior over "run length" since the last change and updates it online with a hazard rate. That makes it a principled detector for "this user's topic mix changed" — [Adams & MacKay 2007, arXiv 0710.3742](https://arxiv.org/abs/0710.3742) (abstract-level)
- A US patent covers **change-point detection inside a multi-armed bandit recommendation system**, which shows industrial use of change-point detection to reset or adjust bandit arm estimates when reward distributions shift — [USPTO 10878451](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10878451) (title-level only; content not read)
- **Satiation as a dynamical system:** "Rebounding bandits" model each arm's reward as *decreasing with consecutive pulls and recovering when not pulled*. They use a time-invariant linear dynamical system and an Explore-Estimate-Plan algorithm when parameters are unknown. This is the formal model of a "fading because over-served" interest, as opposed to genuine loss of interest — [Leqi et al., NeurIPS 2021, arXiv 2011.06741](https://arxiv.org/abs/2011.06741) (verified)
- Calibration work separates **short-term (last 7 days)** from **long-term (last 90 days)** target interest distributions as the reference against which to calibrate a slate — [Calibrated Recommendations with Contextual Bandits, arXiv 2509.05460](https://arxiv.org/pdf/2509.05460) (verified via search summary)
- DIEN's attention-gated GRU is an implicit learned drift filter: it down-weights historical interests not relevant to the current target — [arXiv 1809.03672](https://arxiv.org/abs/1809.03672) (abstract-level)
- Real-time training (Monolith) is the dominant industrial answer to drift. Models update within minutes, so no explicit detector is needed — [arXiv 2209.07663](https://arxiv.org/abs/2209.07663) (abstract-level)

### Inferences
- Practical detector (derived from the sources above, not published as-is). For each topic t, keep `fast_t` (half-life about 1 day or about 50 items) and `slow_t` (half-life about 30 days).
  - **Emerging:** `fast_t / slow_t > θ_up` on ≥ k distinct sessions or days.
  - **Spike:** the ratio is exceeded in a single session only.
  - **Fading:** `fast_t / slow_t < θ_down` for a sustained window, *and* the topic was not suppressed by a frequency cap. This separates satiation from loss of interest (the rebounding-bandit insight).
- BOCPD on the per-session topic-distribution vector (for example, KL divergence to the long-term profile) gives a Bayesian "regime change" flag. That flag can trigger a partial profile reset or a temporary exploration boost.
- Distinguishing "spike" from "emerging" needs a *persistence* criterion across sessions. Any single-session signal looks the same as a spike.

### Gaps
- No public production paper was found that classifies emerging, spike and fading interests at the topic level with reported thresholds. This is an open design space; thresholds must be tuned empirically.
- Recent ByteDance or Kuaishou work on time-aware interest modelling (for example, "Interest Clock", SIGIR 2024) was not verified in this session.

## 3. Funnels: broad → subtopic → niche, and exploration via bandits

### Takeaway
"Funnel" in industry literature mostly means the *serving* funnel (retrieval → ranking), and Google built a dedicated "multi-funnel" for fresh content. The *user-interest* funnel (broad → niche rabbit hole) shows up empirically in audits. Exploration is implemented as bandits at ranking: Neural Linear Bandit / Thompson-style posterior sampling, dedicated exploration slots, and real-time bandit "online matching". Google's measurements show exploration's value appears in corpus growth and long-term satisfaction that standard short A/B tests miss.

### Cited Findings
- **Long-Term Value of Exploration (Su, Chen et al., Google/DeepMind, WSDM 2024)** (verified):
  - Regular A/B tests on exploration "often measure neutral or even negative engagement metrics while failing to capture its long-term benefits."
  - They define **Discoverable Corpus @X,Y**: the number of items with more than X positive interactions within period Y after exploration.
  - A user-corpus co-diverted design (for example, 5% of users × 5% of corpus) reserved **dedicated slots for fresh and tail content**. Three-month change in Discoverable Corpus: **+119.4% @100, +58.5% @1K, +48.2% @10K, +51.0% @1M, +53.8% @10M**.
  - Randomly *removing* corpus reduced satisfied DAU, and the effect grew over time. The satisfied DAU change was roughly linear in the change of discoverable corpus size.
  - **Neural Linear Bandit at ranking:** posterior sampling over a 128-d last-layer embedding, σ²=10. A six-week, 0.3%-traffic A/B test gave about **+1.4–2.5% fresh positive feedback** and a stable increase in satisfied DAU.
  - Users had positive interactions on **+1.25% more unique topics**, evidence of interest discovery.
  - Model uncertainty correlates with content age (−0.35) and popularity (−0.26), and is roughly independent of user activity (0.02).
  - Source: [arXiv 2305.07764](https://arxiv.org/html/2305.07764v2)
- **Values of Exploration in RS (Chen, Wang, Xu, Le, Sharma, Richardson, Wu, Chi; RecSys 2021):** argues that recommenders have *inherent* needs for exploration and that exploration "can improve user experience even in the more imminent term." It studies exploration through **accuracy, diversity, novelty and serendipity** metrics in an RL recommender. Live experiments on a billions-of-users platform use *user conversion* as the long-term proxy. Serendipity is framed as changing user state and improving long-term experience — [Google Research](https://research.google/pubs/values-of-exploration-in-recommender-systems/) (verified). Note: Google's page lists the title as "Values of Exploration…", but other listings use "Values of *User* Exploration…" — [RecSys](https://recsys.acm.org/?p=16668)
- **Multi-funnel fresh content (Google, KDD 2023):** a dedicated fresh-content stack. A two-tower model provides coverage, and a sequence model updated on near-real-time feedback provides relevance — [arXiv 2306.01720](https://arxiv.org/pdf/2306.01720); [WSDM 2024 tutorial follow-up](https://dl.acm.org/doi/10.1145/3616855.3635749) (verified via search summary)
- **Online Matching (Google, 2023):** a real-time bandit system for large-scale recommendations. Its fresh-content experiment explored videos uploaded in the last X days on about **2% of traffic** with a **fixed on-screen position**, to get unbiased feedback — [arXiv 2307.15893](https://arxiv.org/pdf/2307.15893) (verified via search summary)
- **Top-K off-policy correction for REINFORCE (YouTube, WSDM 2019):** a policy-gradient recommender with an off-policy correction and a Boltzmann-sampled policy that inherently explores — [arXiv 1812.02353](https://arxiv.org/abs/1812.02353) (abstract-level)
- **Contextual bandits:** LinUCB (Yahoo! news) is the canonical UCB-style contextual-bandit recommender — [Li et al. 2010, arXiv 1003.0146](https://arxiv.org/abs/1003.0146) (abstract-level)
- **TikTok exploit/explore audit (WWW 2024):**
  - Items were labelled exploit if any feature matched the user's recent 50 videos, likes, full watches, follows, or top-25 hashtags. Otherwise they were labelled explore.
  - After subtracting about 20% randomized-baseline noise, TikTok **exploits real users' interests in 30–50% of recommended videos**. Simulated bots reached about 31%.
  - The exploit fraction **stabilises after about 100 recommendations**.
  - Likes (top vs bottom quartile 14% vs 3%, p=10⁻⁵) and follows (0.30 vs 0.02, p=10⁻¹⁴) differentiate personalization most. Watch percentage is a medium factor.
  - The paper does **not** measure rabbit-hole narrowing.
  - Source: [Vombatkere et al., arXiv 2403.12410](https://arxiv.org/html/2403.12410v1) (verified)
- **Replication caveat:** a 2025 re-audit reports poor reproducibility and short-term validity of TikTok audit findings. It finds *watching* is a stronger signal than following, contradicting the 2024 paper. It finds random likes produce strong exploration, and that users can be pushed toward niche or extreme content just by watching longer — [arXiv 2504.18140](https://arxiv.org/pdf/2504.18140) (verified via search summary)
- **Interest funnel in practice (TikTok mental-health audit):** Amnesty used 30+ automated accounts posing as 13-year-olds (Kenya, US) plus manual accounts (Kenya, Philippines, US). After about **5–6 hours**, close to **half** of videos shown to mental-health-interested accounts were mental-health related and potentially harmful, about **10×** the volume for accounts without that interest. A follow-up about two years later reported the pattern persisting — [Amnesty UK, Driven into Darkness](https://www.amnesty.org.uk/knowledge-hub/all-resources/report-driven-into-darkness/); [EDRi summary](https://edri.org/our-work/tiktoks-for-you-feed-risks-pushing-children-and-young-people-towards-harmful-mental-health-content/); [Dragged into the Rabbit Hole](https://www.amnesty.org.uk/knowledge-hub/all-resources/dragged-into-the-rabbit-hole-new-evidence-of-tiktoks-risks-to-childrens-mental-health/) (verified via search summaries; the figures come from secondary summaries of Amnesty's report)
- Recent work names "full funnel content exploration" explicitly as a production concern at Pinterest — [PinEqualizer, arXiv 2607.22518](https://arxiv.org/pdf/2607.22518) (title only, not read). It also models *user exploration saturation* — [arXiv 2604.16419](https://www.alphaxiv.org/abs/2604.16419.md) (title only, not read)

### Inferences
- A broad → subtopic → niche funnel can be modelled as a **topic tree with depth**, where each user has a per-node affinity. "Funnel progression" is the movement of the affinity-weighted mean depth over time. The rabbit-hole risk is fast depth increase together with an entropy collapse to one branch.
- Exploration should be allocated in **separate budgets**:
  - (a) *item/corpus exploration*: fresh and tail items, fixed slots, as in Google's design;
  - (b) *user-interest exploration*: adjacent-topic probes, either a sibling or parent node in the tree, or an unrelated topic.
  Google's results suggest (a) pays off in corpus and long-term DAU. Chen 2021 argues (b) improves user experience even short-term.
- Thompson or posterior sampling (NLB) is the most production-proven exploration method in this evidence base. Epsilon-greedy is the simplest operator-exposable control ("x% of slots random-adjacent").
- Exploration effects need long-horizon or corpus-level metrics. A 7-day CTR A/B test will likely understate them.

### Gaps
- The exact exploration slot fraction in Google's treatment arm was not disclosed.
- No source found that publishes a production "funnel depth" model for *user interests* (as opposed to serving funnels). This is a design inference.
- Full numbers from Chen et al. RecSys 2021 are behind ACM DL (DOI 10.1145/3460231.3474236) and were not retrieved.
- I could not verify Amnesty's percentages against the primary PDF.

## 4. Filter bubbles, degenerate feedback loops, rabbit-hole audits, and mitigations

### Takeaway
Theory (DeepMind) shows that feedback loops drive user interest toward degenerate extremes unless there is **continuous random exploration** and a **growing candidate pool**. Empirical audits are mixed. Post-2019 YouTube counterfactual-bot evidence finds the recommender *moderates* partisan consumption, while TikTok mental-health audits find strong narrowing within hours. Spotify finds algorithmic consumption lowers diversity, and diversity predicts retention. Mitigations include interleaving rules (no two consecutive from the same creator or sound), calibration, MMR/DPP re-ranking, satiation-aware bandits, and user topic controls.

### Cited Findings
- **Degenerate feedback loops (Jiang, Chiappa, Lattimore, György, Kohli; DeepMind, AIES 2019):** model user interest as a dynamical system with interest extremes as degeneracy points, and give conditions for degeneracy. Bandit simulations show **continuous random exploration** and a **candidate pool growing at least linearly** are the best ways to slow degeneracy — [arXiv 1902.10730](https://arxiv.org/pdf/1902.10730) (verified)
- **Algorithmic confounding:** simulated feedback loops homogenise user behaviour without improving utility — [Chaney, Stewart, Engelhardt, RecSys 2018, arXiv 1710.11214](https://arxiv.org/abs/1710.11214) (abstract-level). Feedback loops amplify popularity bias and reduce aggregate diversity over iterations — [Mansoury et al., CIKM 2020, arXiv 2007.13019](https://arxiv.org/abs/2007.13019) (abstract-level)
- **YouTube counterfactual bots (Hosseinmardi et al., PNAS 2024)** (verified via search summaries):
  - Bots were built from the watch histories of **87,988 real users** (Oct 2021 – Dec 2022).
  - Bots relying *only* on recommendations consumed **less partisan content** than the real users they mirrored. The gap was larger for heavy partisan consumers.
  - Conclusion: since YouTube's 2019 changes, consumption mostly reflects user preferences, and recommendations play "if anything, a moderating role."
  - Limitation: desktop only, political content only.
  - Sources: [UPenn CSS Lab](https://css.engineering.upenn.edu/5466-2/); [Princeton record](https://collaborate.princeton.edu/en/publications/causally-estimating-the-effect-of-youtubes-recommender-system-usi/)
- **Earlier YouTube audit:** user migration from milder to more extreme channels was observed in comment trails, which was evidence of radicalisation *pathways* before the 2019 changes — [Ribeiro et al., FAT* 2020, arXiv 1908.08313](https://arxiv.org/abs/1908.08313) (abstract-level)
- **Spotify (Anderson, Maystre, Anderson, Mehrotra, Lalmas; WWW 2020)** (verified):
  - A **Generalist-Specialist score** measures how coherent a user's listening is: the average cosine similarity of consumed items to the user's centre of mass.
  - High diversity is strongly associated with conversion and retention.
  - Algorithmic listening is associated with *reduced* diversity. Users who become more diverse do so by shifting toward organic listening.
  - Source: [paper PDF](https://www.cs.utoronto.ca/~ashton/pubs/alg-effects-spotify-www2020.pdf)
- A related Spotify podcast field experiment reports an engagement–diversity trade-off — [Holtz et al., arXiv 2003.08203](https://arxiv.org/abs/2003.08203) (verified via search summary)
- **TikTok production mitigations (Dec 2021 newsroom)** (verified via search; current status unknown):
  - "Our systems won't recommend **two videos in a row made by the same creator or with the same sound**."
  - The system intersperses diverse content with known interests.
  - TikTok was testing avoidance of **series of similar content** (extreme dieting, sadness, breakups) and detection of feeds with a narrow content range (loneliness, weight loss).
  - TikTok was building a tool to let users pick topics to avoid.
  - Sources: [TikTok Newsroom](https://newsroom.tiktok.com/an-update-on-our-work-to-safeguard-and-diversify-recommendations?lang=en); [TechCrunch](https://techcrunch.com/2021/12/16/tiktok-to-diversify-its-for-you-feed-let-users-pick-the-topics-they-want-to-avoid)
- **Calibrated recommendations:** re-rank so the genre or topic distribution of the list matches the user's historical distribution, measured with KL divergence. Steck 2018 is the origin; the target distribution can come from a short (7-day) or long (90-day) window — [Steck, RecSys 2018](https://dl.acm.org/doi/10.1145/3240323.3240372) (abstract-level); [arXiv 2509.05460](https://arxiv.org/pdf/2509.05460) (verified)
- **MMR:** greedy re-ranking maximising λ·relevance − (1−λ)·max-similarity-to-selected — [Carbonell & Goldstein, SIGIR 1998](https://dl.acm.org/doi/10.1145/290941.291025) (abstract-level). **DPP diversification at YouTube:** determinantal point processes for set-level diversity in the home feed — [Wilhelm et al., CIKM 2018](https://dl.acm.org/doi/10.1145/3269206.3272018) (abstract-level)
- **Satiation and boredom:** reward decreases with consecutive exposure and recovers with rest — [Rebounding bandits, NeurIPS 2021](https://proceedings.neurips.cc/paper/2021/hash/2109737282d2c2de4fc5534be26c9bb6-Abstract.html) (verified)
- **User-controllable filter-bubble mitigation:** UCRS lets users adjust controls, for example reducing exposure to a dominant category, at inference time via counterfactual reasoning, without retraining — [Wang et al., SIGIR 2022, arXiv 2204.13844](https://arxiv.org/abs/2204.13844) (abstract-level; not re-fetched)
- **Fresh-start reset:** TikTok's "Refresh your For You feed" (Settings → Content preferences) makes the feed behave as for a new signup and leaves Following, profile and inbox untouched — [TechCrunch](https://techcrunch.com/?p=2501043). New York alleged the effect is only temporary — [Techlicious](https://techlicious.com/blog/new-york-alleges-tiktok-gave-teens-a-placebo-safety-feature) (verified via search summary)

### Inferences
- Evidence is **domain-dependent**. Political content on post-2019 YouTube shows a moderating recommender. Emotionally sticky content (mental health) on short-form autoplay shows rapid narrowing. An operator product should treat sensitive-topic clusters differently, with tighter consecutive caps.
- A reset that keeps long-term interaction history in the training data may re-converge quickly, which is consistent with the New York allegation. A real "fresh start" must also clear or down-weight the long-term profile, not just the short-term state.
- Jiang et al. imply that a diversity *floor* alone is not enough. A persistent, non-zero exploration rate plus a growing candidate pool is the theoretically supported mitigation.

### Gaps
- I could not verify the commonly cited Hosseinmardi "forgetting time" finding (how many moderate videos it takes before sidebar recommendations shift back). It is not stated in the sources fetched.
- Instagram/Meta "reset recommendations" (reportedly 2024) and later TikTok topic-slider controls were not verified in this session.
- I could not confirm that the 2021 TikTok consecutive-creator/sound rule is still in force.

## 5. Measurable metrics for drift and funnel health

### Takeaway
There are well-established list-level metrics (intra-list diversity, novelty, serendipity, calibration KL, coverage) and user-level longitudinal metrics (Generalist-Specialist score, unique topics engaged, Discoverable Corpus). Funnel-specific metrics such as depth-per-topic and topic churn are not standardised in the literature. They have to be defined, and they map naturally onto the cited primitives.

### Cited Findings
- **Discoverable Corpus @X,Y** (corpus-health metric for exploration) and **unique topics with positive interaction** (+1.25% under exploration) — [arXiv 2305.07764](https://arxiv.org/html/2305.07764v2) (verified)
- **Accuracy, diversity, novelty and serendipity** used as the four evaluation axes of exploration, with long-term user conversion as the outcome proxy — [Google Research, RecSys 2021](https://research.google/pubs/values-of-exploration-in-recommender-systems/) (verified)
- **Generalist-Specialist score** (mean cosine similarity of consumed items to the user's centroid) as a per-user diversity and coherence metric, linked to retention — [Anderson et al. WWW 2020](https://www.cs.utoronto.ca/~ashton/pubs/alg-effects-spotify-www2020.pdf); [slides](https://www.cs.toronto.edu/~ashton/slides/anderson-algo-diversity-www2020-slides.pdf) (verified)
- **Exploit fraction / personalization score ρ = 1 − k/m** per feed position, an auditable "how much of the feed is personalized vs exploratory" metric — [arXiv 2403.12410](https://arxiv.org/html/2403.12410v1) (verified)
- **Miscalibration (KL divergence between the list's topic distribution and the user's)** — [Steck 2018](https://dl.acm.org/doi/10.1145/3240323.3240372) (abstract-level)
- **Harmful-topic share over session time** (for example, the share of mental-health videos after N hours, compared with a no-interest control) as a rabbit-hole audit metric — [Amnesty UK](https://www.amnesty.org.uk/knowledge-hub/all-resources/report-driven-into-darkness/) (verified via summary)
- **Partisan share relative to a counterfactual recommendation-only bot** as a causal amplification metric — [Hosseinmardi et al. PNAS 2024, UPenn summary](https://css.engineering.upenn.edu/5466-2/) (verified)

### Inferences
Proposed operator dashboard metrics (definitions derived here, not from a single source):
- **Interest entropy** H(p_topics) over a rolling window (session, 7 days, 30 days), together with the entropy *slope*. A sustained negative slope is a narrowing or rabbit-hole signal.
- **Depth-per-topic:** the affinity-weighted mean taxonomy depth for each top-level branch. Also track the rate of depth increase per session.
- **Topic churn:** the Jaccard distance between top-k topics in consecutive windows. High churn means volatile interests or a spike; near-zero churn means a stagnant profile.
- **Max run-length:** the longest streak of consecutive items from the same topic, creator or sound.
- **Exploration yield:** the share of exploration impressions that convert to positive interaction, and the share of explored topics that become "emerging" (persist across ≥ k sessions).
- **Coverage:** the fraction of the catalogue or creators receiving ≥ X impressions or positive interactions (Discoverable Corpus analogue).
- **Novelty:** the mean −log popularity of served items.
- **Calibration KL** against short and long-term targets.

### Gaps
- No standard published definition of "funnel depth" or "topic churn" for feeds was found.
- No published thresholds or benchmarks were found for what counts as a "healthy" entropy level.

## 6. Configurable parameters an operator could expose

### Takeaway
Every proposed control maps to a mechanism with published precedent:
- decay half-life → time-decay and dual-rate profiles;
- exploration rate → bandit or slot budgets;
- diversity floor → MMR, DPP or calibration;
- max consecutive same-topic → TikTok's interleaving rule;
- funnel depth cap → series-of-similar-content avoidance;
- fresh-start reset → TikTok's refresh.
Published systems expose most of these only *internally*. The user-facing precedents are limited to topic avoidance and feed resets.

### Cited Findings
- **Exploration rate / exploration slots:** fixed exploration positions at about 2% of traffic — [Online Matching, arXiv 2307.15893](https://arxiv.org/pdf/2307.15893). Dedicated slots for fresh and tail content, with posterior-sampling noise σ² as a tunable exploration-strength knob in NLB — [arXiv 2305.07764](https://arxiv.org/html/2305.07764v2) (verified)
- **Continuous random exploration plus a growing candidate pool**, the theoretically justified minimums against degeneracy — [Jiang et al. 2019](https://arxiv.org/pdf/1902.10730) (verified)
- **Max consecutive same-creator or same-sound = 1** (TikTok, 2021). **Series-of-similar-content avoidance** for sensitive clusters. A **user-selected topics-to-avoid** tool — [TikTok Newsroom](https://newsroom.tiktok.com/an-update-on-our-work-to-safeguard-and-diversify-recommendations?lang=en); [TechCrunch](https://techcrunch.com/2021/12/16/tiktok-to-diversify-its-for-you-feed-let-users-pick-the-topics-they-want-to-avoid) (verified)
- **Diversity / accuracy trade-off factor:** ComiRec's controllable aggregation factor — [arXiv 2005.09347](https://arxiv.org/abs/2005.09347). MMR λ — [Carbonell & Goldstein 1998](https://dl.acm.org/doi/10.1145/290941.291025) (abstract-level)
- **Calibration window choice** (7-day short-term vs 90-day long-term target) — [arXiv 2509.05460](https://arxiv.org/pdf/2509.05460) (verified)
- **Fresh-start reset** — [TechCrunch](https://techcrunch.com/?p=2501043). Its durability is contested — [Techlicious](https://techlicious.com/blog/new-york-alleges-tiktok-gave-teens-a-placebo-safety-feature) (verified)
- **User-controllable inference-time adjustments** without retraining — [UCRS, arXiv 2204.13844](https://arxiv.org/abs/2204.13844) (abstract-level)
- **Satiation recovery dynamics** (how fast an over-served topic "rebounds") — [Rebounding bandits](https://arxiv.org/abs/2011.06741) (verified)

### Inferences
Suggested operator parameter set (defaults are illustrative design choices, not published values):

| Parameter | Mechanism | Illustrative range / default | Evidence anchor |
|---|---|---|---|
| Short-term half-life | EMA on session/recent topic affinities | 10 min – 24 h (default ~2 h or ~50 items) | dual-rate PinnerFormer + TransAct |
| Long-term half-life | EMA / batch embedding | 7 – 180 days (default ~30 d) | 7d vs 90d calibration windows; 14d PinnerFormer horizon |
| Short/long blend weight | ranker feature mix | 0–1 (default 0.5) | Pinterest Homefeed |
| Exploration rate (ε / slot share) | ε-greedy slots or Thompson noise scale | 0–20% (default ~5–10%) | Google 2% fixed-slot experiments; Jiang "never zero" |
| Exploration type mix | adjacent-topic vs fresh/tail vs random | split of exploration budget | Google item vs user exploration |
| Diversity floor | MMR λ / min distinct topics per N items / calibration KL bound | e.g. ≥3 topics per 10 items | MMR, DPP, Steck |
| Max consecutive same topic / creator / sound | run-length constraint in re-rank | 1–5 (creator/sound default 1) | TikTok 2021 |
| Funnel depth cap / descent rate | limit taxonomy depth gain per session; stricter for sensitive clusters | e.g. +1 level per session | TikTok series-avoidance; Amnesty audit |
| Sensitive-cluster cap | max share of the feed from flagged clusters | e.g. ≤20% per session | TikTok narrow-range detection |
| Satiation cooldown | per-topic reward decay and recovery | recovery half-life hours to days | rebounding bandits |
| Emerging-interest threshold | fast/slow ratio + persistence across k sessions | ratio > 2, k ≥ 3 | Section 2 inference |
| Fresh-start reset | clear short-term *and* down-weight long-term profile; temporary exploration boost | full / partial (scope: topic or all) | TikTok refresh; NY durability allegation |
| Topic mute / boost | hard filter or prior shift at inference | per topic | TikTok topics-to-avoid; UCRS |

- Expose controls together with **observable metrics** (Section 5), so operators can see entropy, depth and run-length respond to their settings.
- Evaluate exploration-rate changes with long-horizon or corpus metrics. Short-term CTR will likely show neutral or negative results even when long-term value is positive (Su et al.).

### Gaps
- No published production defaults exist for most of these knobs. The ranges above are design proposals.
- Evidence on how *end users* (as opposed to operators) use such controls, and their effect on retention, was not found in this session.
