# Signal Taxonomy: Interest vs Liking vs Emotional Reaction vs Knowledge in Recommender Systems

Scope note: 22 searches/fetches. Primary sources reached directly: Milli et al. (arXiv HTML v6), X/Twitter `the-algorithm-ml` README (raw GitHub). Most others are via search snippets of primary pages (arXiv abstracts, Google Research pages) or reputable secondary reporting (Washington Post via Nieman Lab / ADN / NBC). Items from background knowledge that I did not re-verify in this session are explicitly flagged "(unverified background)" and kept to Inferences/Gaps.

## Q1. Engagement vs satisfaction / value: what the academic and industry work says

### Takeaway
There is strong, converging evidence that "engagement" (revealed behaviour) and "value/satisfaction" (what users say they want) are different targets that diverge most on emotionally charged and political content; the field's response is (a) separate satisfaction objectives/surveys inside ranking and (b) treating behaviour as noisy evidence of a latent mental state (the "inversion problem"), not as the preference itself.

### Cited Findings
- **Milli et al., "Engagement, User Satisfaction, and the Amplification of Divisive Content on Social Media"** (pre-registered audit, Feb 2023, 806 US users, 1,730 responses; published PNAS Nexus 2025). Compared the top 10 tweets from Twitter's engagement-ranked timeline vs. reverse-chronological timeline of the same followed accounts. — [arXiv html v6](https://arxiv.org/html/2305.16941v6); [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11894805/)
  - Author-expressed emotion, all tweets (engagement vs chrono, SD units): anger +0.47, anxiety +0.23, sadness +0.22, happiness +0.02 (n.s.). — [arXiv](https://arxiv.org/html/2305.16941v6)
  - Reader-felt emotion: anger +0.27, anxiety +0.12, happiness +0.12, sadness +0.09. Political tweets only: author anger +0.75, reader anger +0.37; partisanship +0.24 and out-group animosity +0.24; readers' views of out-group worsened −0.17. — [arXiv](https://arxiv.org/html/2305.16941v6)
  - Stated-preference question: "When you use Twitter, do you want to be shown tweets like [@author]'s tweet?" (No / Indifferent / Yes). Engagement timeline rated only +0.06 SD higher overall, and **−0.18 SD lower for political tweets**. — [arXiv](https://arxiv.org/html/2305.16941v6)
  - An exploratory stated-preference-ranked timeline reduced anger/sadness/anxiety, increased happiness, reduced partisanship and out-group animosity — but partly by showing fewer out-group tweets, so authors warn of reinforcing pro-attitudinal (echo-chamber) content. — [arXiv](https://arxiv.org/html/2305.16941v6)
  - Earlier arXiv versions stated amplification more strongly; later versions hedge ("may amplify"). — [arXiv abs](https://arxiv.org/abs/2305.16941)
- **Kleinberg, Mullainathan & Raghavan, "The Challenge of Understanding What Users Want: Inconsistent Preferences and Engagement Optimization"** (EC'22): users modelled with two conflicting preference sets — an impulsive "in-the-moment" system and a long-horizon planning system; platform observes only engagement, so revealed-preference inference can systematically optimise for the impulsive self. — [arXiv 2202.11776](https://arxiv.org/pdf/2202.11776); [Princeton CITP talk](https://www.princeton.edu/events/2023/citp-distinguished-lecture-series-jon-kleinberg-challenge-understanding-what-users-want)
- **"The Inversion Problem: Why Algorithms Should Infer Mental State and Not Just Predict Behavior"** (Perspectives on Psychological Science, 2023, Chicago Booth CAAI): a recommender predicts clicks but is meant to identify preferences; such mismatches are "inversion problems" where the true goal is a mental state inferred from behaviour. — [Chicago Booth](https://www.chicagobooth.edu/research/center-for-applied-artificial-intelligence/research/our-faculty-research/2023/the-inversion-problem-why-algorithms-should-infer-mental-state-and-not-just-predict-behavior); [APS](https://www.psychologicalscience.org/journals/perspectives/17456916231212138/)
- **Stray et al., "Building Human Values into Recommender Systems: An Interdisciplinary Synthesis"** (21 authors across academia/industry/civil society; ACM TORS vol 2(3) art. 20, June 2024): catalogues values relevant to recommenders and examines them via industry practice, measurement, product design, policy; open problems include values-driven measurement and "recommender controls that people use". — [arXiv 2207.10192](https://arxiv.org/pdf/2207.10192); [Google Research](https://research.google/pubs/building-human-values-into-recommender-systems-an-interdisciplinary-synthesis-and-open-problems/)
- **YouTube MMoE (Zhao et al., RecSys 2019)** explicitly splits ranking objectives into **engagement objectives** (clicks, degree of engagement e.g. watch time) and **satisfaction objectives** (liking a video, leaving a rating). — [Google Research](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/); task split described in [DSelect-k (Google)](https://arxiv.org/pdf/2106.03760): engagement = clicks, bad clicks, engagement time; satisfaction = likes, dislikes; MoE gains "most pronounced on the satisfaction tasks".
- **YouTube satisfaction surveys**: YouTube says it doesn't assume all watch time is valuable and uses surveys to check; satisfaction signals include survey responses, like/dislike, "not interested", retention. — [Search Engine Journal](https://www.searchenginejournal.com/youtube-algorithm-facts/403984/); [Outlier Kit](https://outlierkit.com/resources/which-youtube-metric-matters-most/). Claim that satisfaction has "replaced" watch time as primary signal comes only from a marketing blog — [Outlier Kit 2026](https://outlierkit.com/resources/youtube-viewer-satisfaction-algorithm-2026/) — conflicts with "alongside watch time" framing in [Media Shower](https://www.mediashower.com/blog/?p=25976); treat as unverified.
- **Facebook "worth your time" surveys / MSI**: Jan 2018 re-ranking toward "meaningful social interactions"; Facebook acknowledged people would spend less time — [Daily Maverick](https://www.dailymaverick.co.za/article/2018-01-12-facebook-updates-news-feed-to-make-friends-a-priority.md). MSI assigned point values to likes, comments, RSVPs, reportedly set via a survey of tens of thousands of users — [KTVZ/CNN](https://ktvz.com/?p=714024). May 2019: surveyed which links users found "worthwhile", matched answers to link type/publisher/engagement to up-rank similar posts; separate "closest friends" survey matched to behavioural proxies — [TechCrunch](https://techcrunch.com/2019/05/16/facebook-algorithm-links/amp/).

### Inferences
- The four dimensions in the brief map cleanly onto this literature: INTEREST ≈ "want more like this" (Milli's stated-preference question is literally an interest question); LIKING ≈ YouTube "satisfaction objectives"; EMOTIONAL REACTION is the dimension where engagement and value most diverge; KNOWLEDGE is largely absent from mainstream feed-ranking literature (see Q3/Q6).
- Milli's question wording ("do you want to be shown tweets like this?") is a cheap, validated template for an in-feed interest probe, and is distinct from "did you like this?".
- Facebook's and YouTube's approach — survey a sample, then train a model to predict survey answer from behaviour — is the standard way to calibrate implicit signals to stated value.

### Gaps
- No primary Spotify source found in this session on satisfaction vs engagement (e.g., Mehrotra et al. work on intent-aware satisfaction prediction) — search did not surface it.
- YouTube's exact survey wording and its weight in ranking are not public in any primary source I reached.

## Q2. Implicit signals: what each indicates, and known pitfalls

### Takeaway
Industrial systems weight "deliberate, costly" signals (reply, profile-visit-then-engage, long dwell after click) far above cheap ones (like, partial video playback), and weight explicit negatives (report, "show less") one-to-two orders of magnitude above positives; but high-arousal negative emotion drives sharing/engagement, so un-separated engagement signals amplify anger.

### Cited Findings
- **X/Twitter heavy ranker weights (open-sourced, as of April 5 2023)** — primary README: fav 0.5; retweet 1.0; reply 13.5; good_profile_click 12.0 ("opens the Tweet author profile and Likes or replies to a Tweet"); video_playback50 0.005 ("watch at least half of the video"); reply_engaged_by_author 75.0; good_click 11.0 ("click into the conversation… and reply or Like"); good_click_v2 10.0 ("click into the conversation… and stay there for at least 2 minutes"); negative_feedback_v2 **−74.0** ("show less often" on Tweet or author, etc.); report **−369.0**. — [twitter/the-algorithm-ml README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md)
  - A 2025 blog's figures (report −20,000; "not interested" −1,000) could not be matched to code — [tianpan.co](https://tianpan.co/blog/2025-09-15-twitter-s-recommendation-algorithm); a Sept 2025 update reportedly added Grok/"Phoenix" scorer with no published new weight table — [blckalpaca](https://blckalpaca.at/en/knowledge-base/social-media/social-media-algorithms-distribution/x-twitter-algorithm-open-source).
- **Facebook reaction weighting controversy** (Haugen documents, Washington Post, Oct 26 2021): from 2017 all five reactions (love, haha, wow, sad, angry) counted 5× a Like — [Nieman Lab](https://niemanlab.org/2021/10/more-internal-documents-show-how-facebooks-algorithm-prioritized-anger-and-posts-that-triggered-it); [ADN reprint](https://www.adn.com/nation-world/2021/10/26/five-points-for-anger-one-for-a-like-how-facebooks-formula-fostered-rage-and-misinformation/).
  - By 2019 internal data scientists found angry-reaction posts disproportionately contained misinformation, toxicity, low-quality news; July 2020 internal report: "anger and haha reactions are highly prevalent on misinfo and toxicity" — [NBC News](https://www.nbcnews.com/tech/tech-news/emoji-reactions-cute-addition-facebook-became-headache-rcna3747).
  - By end of 2020 angry weight cut to **zero**, while love/sad kept elevated weights — [Platformer](https://platformer.news/the-facebook-papers-missing-piece); [NBC](https://www.nbcnews.com/tech/tech-news/emoji-reactions-cute-addition-facebook-became-headache-rcna3747).
  - Conflicting accounts of intermediate weights: haha/wow 1.5× and love/sad 2× per [Techdirt](https://www.techdirt.com/?p=308605); Sept 2020 overhaul with wow/sorry/haha = 1, love/care = 2 per [AOL](https://www.aol.com/news/emoji-reactions-were-cute-addition-222935023.html). Techdirt argues WaPo framing over-emphasised anger and buried how quickly Facebook adjusted.
- **Arousal drives sharing (foundational, 2012):** Berger & Milkman analysed ~3 months of NYT articles: high-arousal positive (awe) and negative (anger, anxiety) emotions increase virality; low-arousal sadness decreases it; positive content shared more than negative overall; effects hold controlling for surprise, interest, usefulness; experiments indicate activation/arousal is the mechanism. — [Wharton PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2011/11/Virality.pdf)
- **Skip as signal:** Spotify released ~130M listening sessions for sequential skip prediction, calling skips "an important implicit feedback signal" — [AIcrowd](https://www.aicrowd.com/challenges/spotify-sequential-skip-prediction-challenge-old). Skipping can indicate satisfaction, dissatisfaction, or lack of interest (ambiguous) — [Strathprints](https://strathprints.strath.ac.uk/84247/).
- **Short-video skip modelling (Kuaishou, CIKM'23):** skip is "the most readily collected feedback", reflects implicit preference that is hard to extract, and couples multiple objectives (watch time, skip rate) — [arXiv 2308.13249](https://arxiv.org/html/2308.13249v2).
- **Kuaishou EMER** separates explicit signals (likes, shares, comments) from implicit (watch time, long views); deployed with +1.39% app stay time, +0.196% 7-day lifetime — [arXiv 2508.05093](https://arxiv.org/html/2508.05093v2).

### Inferences
- Signal → dimension mapping suggested by the evidence (my synthesis):
  - **Fast skip (<~1-2s)**: weak negative on *this item / this hook*, not necessarily the topic (see Q5); strongest as "current sub-interest not active".
  - **Completion / long dwell**: attention, not liking — confounded by length, curiosity gaps, and rage ("hate-watching").
  - **Rewatch / loop / seek-back**: strong positive attention + likely "amazement/curiosity/learning" (needed something again) — no primary source found quantifying this.
  - **Like**: cheap liking signal (X weights it 0.5 vs reply 13.5).
  - **Save/bookmark**: future utility — strongest proxy for KNOWLEDGE-seeking/"want to learn" and INTEREST; low emotional valence.
  - **Share**: high-arousal emotion (awe, amusement, anger) per Berger & Milkman — must be disambiguated by emotion, not counted as pure positive.
  - **Comment/reply**: high-intent but valence-ambiguous; must be sentiment/emotion-classified (Facebook's anger lesson).
  - **Profile visit → engage**: creator-level interest (X "good_profile_click" 12.0).
  - **Hide / "show less" / report**: explicit, must dominate positives (X: −74, −369).
- Pitfall summary: any signal that rises with arousal regardless of valence (share, comment, dwell, completion) will amplify outrage unless the emotion behind it is separated and anger/disgust are down-weighted (Facebook went to zero) or verified against stated preference (Milli).

### Gaps
- No primary quantitative source found on hover, pause, or seek-back as recommender signals in short-form video.
- TikTok/Douyin official signal weights are not public; TikTok newsroom posts (unverified background) only list categories (interactions, video info, device/account settings).
- Could not retrieve the 2308.04086 PDF text (binary); its frequency stats for skip vs "not interested" are missing.

## Q3. Multi-dimensional emotional reactions: taxonomies, inference, awe/curiosity

### Takeaway
Fine-grained emotion taxonomies (GoEmotions' 27+neutral) exist and are trainable on comment text, and affective-recsys is a defined subfield (attitude vs emotion vs mood); the decision-relevant split for a feed is arousal × valence × "epistemic" emotions (curiosity, surprise, awe), because arousal predicts spread while valence and epistemic emotions predict value.

### Cited Findings
- **GoEmotions (Google Research/Stanford/Amazon, ACL 2020)**: 58k English Reddit comments, 27 emotion categories + Neutral, multi-label; built because prior datasets were small or limited to Ekman's six basic emotions. Categories include e.g. admiration, grief, remorse (full list in TFDS). — [Google Research blog](https://www.research.google/blog/goemotions-a-dataset-for-fine-grained-emotion-classification/); [TFDS catalog](https://www.tensorflow.org/datasets/catalog/goemotions?hl=en); [arXiv 2005.00547](https://ar5iv.labs.arxiv.org/html/2005.00547)
- **Affective recommender survey (Hasan & Bunescu, arXiv Aug 2025)**: classifies work into attitude-aware, emotion-aware, mood-aware, and hybrid systems using Scherer's typology of affective states; covers signal extraction and architectures; calls for hybrid models and larger affect-labelled datasets. — [arXiv 2508.20289](https://arxiv.org/html/2508.20289v1)
- **Affective video recommender survey (Wang & Zhao, Frontiers in Neuroscience 2022)**: affect-based video content analysis helps cold-start. — [PMC9459336](https://pmc.ncbi.nlm.nih.gov/articles/PMC9459336)
- **Awe/anger/anxiety drive sharing; sadness suppresses it** — [Berger & Milkman](https://faculty.wharton.upenn.edu/wp-content/uploads/2011/11/Virality.pdf).
- **Reaction emoji as emotion signal is contaminated**: Facebook found anger and haha reactions "highly prevalent on misinfo and toxicity" — [NBC](https://www.nbcnews.com/tech/tech-news/emoji-reactions-cute-addition-facebook-became-headache-rcna3747). (Note: "haha" can be mocking, so amusement reactions are not reliably positive.)
- **Milli et al.** measured four emotions separately for author and reader (anger, sadness, anxiety, happiness) and showed engagement ranking raised all four in readers, i.e., emotional intensity is not the same as value — [arXiv](https://arxiv.org/html/2305.16941v6).
- **Curiosity**: information-gap theory — curiosity arises from awareness of a discrepancy between current and desired knowledge, with an inverted-U between gap size and curiosity; Dubey & Griffiths (2020) reconcile information-gap vs novelty accounts (environment structure decides which pattern appears) — [Journal of Cognition](https://journalofcognition.org/articles/10.5334/joc.501). Personal curiosity curves (Wundt-curve "sweet spot") can be fit per user from history and used to recommend curiosity-stimulating items — [arXiv 1907.00119](https://arxiv.org/pdf/1907.00119). Surprise-based health-news recommendations found surprising items "at little cost to satisfaction" — [NSF PAR](https://par.nsf.gov/servlets/purl/10188332) (attribution from search snippet; verify).

### Inferences
- A practical emotion schema for a short-form feed: collapse GoEmotions to ~6-8 recommender-relevant buckets with known ranking implications: **Amused** (positive, high arousal), **Amazed/Awe** (positive, high arousal, shareable), **Curious/Learned** (epistemic), **Moved/Touched** (positive, lower arousal), **Sad** (negative low-arousal; not necessarily bad — "moved" vs "upset"), **Angry/Outraged** and **Disgusted** (negative high-arousal; treat as non-positive for interest even though they drive engagement). This mirrors Facebook's revealed lesson (anger → zero weight) and Milli's evidence.
- Emotion should be inferred two ways: (1) item-side — classify the item/caption and its comment pool with a GoEmotions-style model to give each item an "emotional profile"; (2) user-side — classify the user's own comments/reactions to know which emotion *they* experienced. A comment on an item does not equal endorsement.
- Background (unverified this session): Facebook Reactions launched 2016 with Love/Haha/Wow/Sad/Angry (Care added 2020); LinkedIn reactions are Like/Celebrate/Support/Love/Insightful/Funny (Curious was retired) — LinkedIn's "Insightful" is notable as an explicit KNOWLEDGE-type reaction. Plutchik's wheel (8 primaries) and Ekman's 6 basic emotions are the older foundations GoEmotions extends.

### Gaps
- No primary source found on how any platform uses a "Wow"/awe reaction differently from "Love" in ranking beyond weights.
- No found study validating comment-emotion classification as a per-user ranking feature in a deployed short-video system.

## Q4. Multi-task ranking models and value-model combination

### Takeaway
State of the art is: predict each action/outcome as a separate head (MMoE/PLE), then combine with a weighted "value model"; weights were historically hand-tuned, and recent Kuaishou work learns personalised fusion weights end-to-end — which is exactly the hook for user-controllable dimension weights.

### Cited Findings
- **YouTube MMoE (RecSys 2019)**: multiple competing objectives + implicit selection bias; Multi-gate Mixture-of-Experts for soft parameter sharing with a gate per objective; Wide & Deep "shallow tower" for position/selection bias; system "learn[s] and estimate[s] multiple types of user behaviours and utilities… and subsequently combines these estimations to compute a final utility score". — [Google Research](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/); [KDnuggets](https://www.kdnuggets.com/2019/10/youtube-recommending-next-video.html); [wiki mirror](https://wiki.personaldata.io/wiki/Item:Q2678)
- **PLE (Tencent, RecSys 2020 best long paper)**: identifies the "seesaw phenomenon" (one task improves at another's expense); explicitly separates shared vs task-specific experts with progressive routing; online +2.23% view count, +1.84% watch time vs SOTA MTL on Tencent video. — [Papers with Code](https://www.paperswithcode.com/paper/progressive-layered-extraction-ple-a-novel); [PDF](https://csse.szu.edu.cn/staff/panwk/recommendation/IRT-SupplementaryInformation-MTR/PLE.pdf)
- **DSelect-k (Google)**: production multi-task with engagement tasks (clicks, bad clicks, engagement time) and satisfaction tasks (likes, dislikes). — [arXiv 2106.03760](https://arxiv.org/pdf/2106.03760)
- **Kuaishou Pantheon (2025)**: fused score uses weights (α, β, γ…) over predicted metrics, historically tuned offline by experts; Kuaishou's legacy formula was a "complex, multi-year-iterated" design; proposes personalised ensemble sort via iterative Pareto policy optimisation. — [arXiv 2505.13894](https://arxiv.org/pdf/2505.13894)
- **Kuaishou EMER (2025)**: end-to-end multi-objective ensemble ranking replacing hand-crafted fusion; +1.39% stay time, +0.196% 7-day lifetime. — [arXiv 2508.05093](https://arxiv.org/html/2508.05093v2)
- **X value model**: linear sum of predicted probabilities × weights (see Q2) — [README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md).
- **Facebook MSI**: point values per interaction type, with weights calibrated against surveys — [KTVZ](https://ktvz.com/?p=714024).

### Inferences
- Architectural pattern for the brief's four dimensions: separate heads for p(interest-continue), p(like), p(emotion_k) for each emotion bucket, p(learn/save), p(negative/hide), then `score = Σ w_k · p_k`. Because the combination is a final linear (or learned) layer, user customisation of the feed can be implemented by exposing/adjusting w_k per user (e.g., "more amazing", "less outrage", "more learning") without retraining the towers — the same lever Pantheon/EMER personalise automatically.
- PLE's seesaw finding implies emotion heads and interest heads should have task-specific experts; otherwise optimising outrage-correlated engagement will bleed into the interest head.

### Gaps
- Exact Douyin/TikTok fusion formula and objective list not public in sources found.
- Did not retrieve primary text giving the full list of YouTube MMoE tasks or their combination weights.

## Q5. Negative feedback: explicit vs implicit, item vs topic

### Takeaway
Industry distinguishes explicit negatives ("not interested", "show less", report — rare, high-weight) from passive negatives (fast skips — abundant, noisy, best treated as evidence about the user's *currently active sub-interest*); I found no published work cleanly separating "dislike the item" from "dislike the topic", so a feed must collect that disambiguation explicitly.

### Cited Findings
- **Pan et al., "Understanding and Modeling Passive-Negative Feedback for Short-video Sequential Recommendation"** (Kuaishou/WeChat data): two forms of negative feedback — explicit ("not interested", "reduce similar recommendations") and implicit passive skips; skips carry preference information most recommenders ignore; uses skips as supervision for the user's *current active sub-interest*, alongside random negatives. — [arXiv 2308.04086](https://arxiv.org/pdf/2308.04086); [ar5iv](https://ar5iv.labs.arxiv.org/html/2308.04086)
- **Kuaishou skip modelling (CIKM'23)**: skips are the most readily collected feedback but implicit and multi-objective (watch time vs skip rate). — [arXiv 2308.13249](https://arxiv.org/html/2308.13249v2)
- **X**: "negative_feedback_v2" covers "show less often" on the **Tweet or author** — i.e., X itself distinguishes item- vs source-level negatives in the action, but scores them with one head (−74); report −369. — [README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md)
- **YouTube**: "not interested" treated as a satisfaction signal alongside dislikes — [Search Engine Journal](https://www.searchenginejournal.com/youtube-algorithm-facts/403984/); [HackerNoon (secondary)](https://hackernoon.com/youtubes-recommendation-engine-explained-40j83183).
- **CoNRec (2026)**: context-discerning negative recommendation with an item-level task for negative contexts (snippet only) — [arXiv 2601.15721](https://arxiv.org/html/2601.15721v1).

### Inferences
- Design rule: a fast skip should decay the *session/sub-interest* weight and the specific item/hook, not the long-term topic weight, unless it repeats across several items of the same topic (aggregate evidence). Explicit "not interested" should prompt a one-tap reason: *this video* / *this creator* / *this topic* / *seen it already* (KNOWLEDGE) / *upsetting* (EMOTION) — the "seen it already" reason is the cleanest way to separate "dislike" from "already know".
- Weighting: explicit negatives should outweigh a like by ~100× (X ratio −74/0.5 ≈ 150×), i.e., one "not interested" should cancel many weak positives.

### Gaps
- No published study found quantifying how often "not interested" is topic-level vs item-level, or comparing topic-suppression strategies.
- Frequency of explicit negatives vs skips not retrieved (PDF unreadable).

## Q6. Practical design: reaction set and signal schema for a short-form feed, mapped to interest-profile updates

### Takeaway
The evidence supports a schema that logs cheap implicit signals universally, collects a small explicit reaction set that separates LIKING, EMOTION (with valence/arousal), and KNOWLEDGE, and periodically samples a stated-INTEREST probe ("want more like this?") to calibrate; each dimension updates a different part of the profile and enters ranking via its own weight.

### Cited Findings (grounding for the design)
- Stated-interest probe wording validated in a pre-registered study — [Milli et al.](https://arxiv.org/html/2305.16941v6).
- Survey-calibrated weights are standard practice (Facebook MSI, "worth your time"; YouTube satisfaction surveys) — [TechCrunch](https://techcrunch.com/2019/05/16/facebook-algorithm-links/amp/); [KTVZ](https://ktvz.com/?p=714024); [SEJ](https://www.searchenginejournal.com/youtube-algorithm-facts/403984/).
- Separate engagement vs satisfaction heads with per-task gating — [YouTube MMoE](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/); [PLE](https://www.paperswithcode.com/paper/progressive-layered-extraction-ple-a-novel).
- Anger reaction weight driven to zero after misinformation/toxicity correlation — [NBC](https://www.nbcnews.com/tech/tech-news/emoji-reactions-cute-addition-facebook-became-headache-rcna3747).
- Deliberate-action signals (reply, profile-then-engage, ≥2-min dwell after click) outweigh likes — [X README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md).
- Curiosity is an inverted-U in knowledge gap; personal curiosity curves are learnable — [arXiv 1907.00119](https://arxiv.org/pdf/1907.00119); [Journal of Cognition](https://journalofcognition.org/articles/10.5334/joc.501).

### Inferences (proposed schema — synthesis, not sourced as a whole)
- **Implicit (logged for every impression):** `watch_ms`, `video_ms`, `completion_ratio`, `fast_skip` (<~1.5s), `loops`, `seek_back`, `paused`, `unmuted`, `share`, `save`, `comment` (+ emotion label from classifier), `profile_visit`, `follow`, `hide`, `report`.
- **Explicit reaction set (one tap, optional, mutually non-exclusive):**
  - LIKING: ❤ Like.
  - EMOTION: Funny (amusement), Amazing (awe/wow), Moving (touched), Sad, Angry/Outrage, Gross (disgust). Valence/arousal attached per bucket.
  - KNOWLEDGE: "Learned something" (LinkedIn "Insightful" analogue) and "Already knew this".
  - INTEREST: long-press menu "More of this topic" / "Less of this topic" / "Not this video" / "Not this creator".
- **Profile update mapping:**
  - INTEREST (topic weight, slow EMA): +save, +follow, +"more of this", +repeat completion across items of topic, +stated-probe "yes"; −"less of this topic", −repeated fast skips within topic (aggregate, not single). Single fast skip → session sub-interest decay only.
  - LIKING (item/creator affinity, used for creator & style similarity, not topic breadth): +like, +loop, +profile-visit-engage.
  - EMOTION (per-user emotion preference vector, e.g., likes awe/amusement, avoids outrage): update from explicit reactions and classified comments; outrage/disgust engagement must **not** increase topic interest (Facebook/Milli lesson); expose user-tunable weights ("less outrage", "more wholesome/amazing").
  - KNOWLEDGE (per-topic depth/familiarity state): "already knew" → raise topic familiarity and shift to deeper/novel items within the topic, do *not* lower interest; "learned something" / save → raise interest and familiarity; use inverted-U curiosity to target items one step beyond current depth; dedupe near-duplicate explainers once familiarity is high.
- **Ranking:** multi-head prediction (p_interest, p_like, p_emotion_k, p_learn, p_negative) → `score = Σ w_k·p_k`, with user-level overrides of w_k as the customisation surface; negative head weight ≫ positive; periodically sample "want more like this?" to recalibrate weights against stated preference.

### Gaps
- No A/B evidence found on optimal size of an explicit reaction set or tap-rates for multi-emotion reactions on short-video apps.
- No published source validates "already knew this" as a ranking signal on a consumer feed; this is a design proposal grounded only in curiosity/information-gap research and educational recommenders.
- LinkedIn/Slack reaction-set details and Plutchik/Ekman specifics were not re-verified in this session.
