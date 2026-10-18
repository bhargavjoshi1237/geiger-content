# Industry feed-customisation mechanisms and controls (TikTok, YouTube, Meta, X, Pinterest, Spotify, Bluesky)

Scope: shipped mechanisms and user/operator controls, current as of October 2026. Dates are given for each item. Items marked **[OLDER]** predate 2023 or have been superseded. Items marked **[UNVERIFIED]** come from one secondary source or headlines only.

## 1. What user controls exist today?

### Takeaway
Since 2024 every major feed has moved from implicit-only signals and blunt "Not interested" buttons to **explicit, editable interest models**. These come in three layers. First, **category sliders** (TikTok Manage Topics, plus a separate AI-content slider). Second, **AI-summarised, user-editable interest lists and natural-language steering** (Instagram "Your Algorithm" Dec 2025, Threads "Dear Algo" Feb 2026, YouTube "Your Custom Feed" test Nov 2025, Spotify Prompted Playlist Dec 2025). Third, **content-class filters** (GenAI tuners on Pinterest and TikTok, political/sensitive-content controls on Meta, keyword/Hidden Words filters). In the EU, a **non-profiled feed** is legally mandated for very large platforms, and a 2025 court ruled that it must be "sticky".

### Cited Findings

**TikTok**
- **Manage Topics** (US pilot announced 30 Aug 2024, later global): Settings → Content Preferences → Manage Topics, or Share → "Why this video" → "Adjust your For You". Each topic has a **slider for how often related videos appear**. Topics include Sports, Travel, Humor, Creative Arts and Dance. Limits: it **does not remove topics entirely**, **does not affect followed accounts** (For You only), and changes "might take some time" to apply — [TechCrunch](https://techcrunch.com/2024/08/30/tiktoks-new-manage-topics-tool-gives-you-more-control-over-your-for-you-feed-heres-how-to-use-it); [Social Media Today](https://www.socialmediatoday.com/news/tiktok-adds-content-preferences-settings-for-you-feed-controls/749727/). The exact date of the global expansion is not confirmed.
- **AI-generated content (AIGC) slider** (announced 19 Nov 2025, rolled out over the following weeks): added inside Manage Topics, which TikTok said already covered "over 10 categories like Dance, Sports, and Food & Drinks". It **shifts the mix rather than blocking AI videos**, so some AI content still appears. It was paired with **invisible watermarking**, because labels get stripped when videos are re-uploaded — [Storyboard18](https://www.storyboard18.com/digital/tiktok-introduces-controls-to-let-users-adjust-volume-of-ai-generated-content-84502.htm); [eWeek](https://www.eweek.com/news/tiktok-ai-transparency/); [etcentric](https://www.etcentric.org/?p=197453).
- **Refresh your For You feed** (tested Feb 2023, rolled out to all in March 2023): resets the For You feed so it behaves like a new account, then rebuilds it from new interactions. It sits under Settings → Content preferences. It **keeps** existing keyword filters, restricted-content settings and hidden creators — [Yahoo/Engadget](https://autos.yahoo.com/tiktok-for-you-feed-refresh-130028273.html); [Search Engine Journal](https://searchenginejournal.com/tiktok-refresh-for-you-feed/482667); [Stories Out (Mar 2023)](https://www.storiesout.com/en/tiktok-will-soon-allow-you-to-reset-your-feed-for-you/).
- **"Not interested"** taps are a ranking input, listed in TikTok's 2020 disclosure — [Tech Brew (2020)](https://www.techbrew.com/stories/2020/06/22/tiktok-provides-details-recommendation-system). The **keyword filters** carried over by Refresh are mentioned in [SEJ](https://searchenginejournal.com/tiktok-refresh-for-you-feed/482667).

**Instagram / Facebook / Threads (Meta)**
- **Instagram "Your Algorithm"** (launched Dec 2025, US, English-only at first): opened from an icon at the top right of the Reels tab. It shows an **AI-written summary of inferred interests** (e.g. "Lately you've been into creativity, sports hype, fitness motivation, and skateboarding"). Users can **raise or lower individual topics, with immediate effect**, **type in new topics**, and **share the summary to Story**. Expansion to Explore, Search and other surfaces was planned. Unlike TikTok's fixed generic categories, it is **individualised from recent activity** — [Yahoo Tech/TechCrunch](https://tech.yahoo.com/social-media/articles/instagram-algorithm-tool-gives-more-133000943.html); [Search Engine Land](https://searchengineland.com/instagram-your-algorithm-465987); [RouteNote](https://routenote.com/blog/instagram-introduces-your-algorithm-tool/).
  - **[UNVERIFIED]** 2026 headlines say Instagram extended "Your Algorithm" to the main Feed and Explore, and that Threads expanded manual algorithm control. These are headlines only — [Social Media Today tag index](https://www.socialmediatoday.com/tags/algorithm-updates/).
- **Threads "Dear Algo"** (11 Feb 2026; US, UK, Australia and New Zealand): the user writes a **public post** starting "Dear Algo", followed by what they want more or less of. AI parses the request, which **adjusts the feed for 3 days**. Users can **repost someone else's request to apply it to their own feed**. A settings screen lists active and expired requests, with a **maximum of 6 active**, and users can delete the request alone or the request plus the post. The trade-off is that interests become public — [Meta newsroom](https://about.fb.com/news/2026/02/threads-dear-algo/); [Gigazine](https://gigazine.net/gsc_news/en/20260212-meta-threads-dear-aigo); [Jordan News](https://www.jordannews.jo/Section-129/Technology/Threads-Launches-Smart-Feature-Giving-Users-Direct-Control-Over-Their-Feed-Content-48820).
- **Meta Transparency Center control catalogue** (page updated 2 Mar 2026) — [Meta](https://transparency.meta.com/features/user-control-shape-your-experience-on-meta-platforms/):
  - **Interested / Not interested** (FB and IG; Threads has "Not interested" only) on Feed, Reels, Explore and Search. This "informs our recommendation systems".
  - **X-out** (FB) hides a post and trains the system to show fewer similar posts.
  - **Hidden Words for suggested posts** (IG, Threads) filters by words or emojis in captions and hashtags.
  - **Snooze suggested posts for 30 days** (IG).
  - **Sensitive Content Control** (FB, IG, Threads) sets a level for graphic or nude content in recommendations.
  - **Political Content Control** (FB, IG, Threads) sets whether political content is recommended.
  - **Reverse-chronological Following feed** (FB, IG, Threads).
  - **Favorites feed** (FB, IG) shows a chosen subset of followed accounts.
  - **Your Algorithm / Dear Algo** (IG, Threads).
  - **Blend** (IG) is a **shared Reels feed with friends** built from each participant's recommendations.
  - **Friends tab** (FB friends' updates; IG Reels Friends tab showing what friends liked, created, reposted or commented on).
  - **Custom Feeds** (Threads) are feeds of chosen topics or people.
  - Meta notes that available controls vary by region and device.
- **[OLDER]** Facebook's Nov 2021 test let users adjust how much friends and family versus groups and pages appeared, and made Favorites and Snooze easier to find — [SLPI/Nation News coverage (2021)](https://slpi.lk/facebook-gives-users-more-control-over-news-feed/).

**YouTube**
- **"Your Custom Feed"** (experiment, late Nov 2025): signed-in US users on Android, iOS and desktop see "Your Custom Feed" next to Home. They **type a prompt to reshape Home recommendations**. YouTube's stated motivation is that the algorithm can misread intent; its example is that watching a few Disney videos makes the system assume you are a fan — [9to5Google](https://9to5google.com/2025/11/26/youtube-testing-new-home-page-with-more-control-over-suggested-content/); [Betanews](https://betanews.com/2025/11/25/youtube-starts-testing-your-custom-feed-feature/). **[UNVERIFIED]** One outlet reports Gemini as the backend and a cap of 8 active feeds — [Beebom](https://gadgets.beebom.com/news/youtube-testing-custom-feeds-describe-what-you-want-on-homepage). 9to5Google says the backend is not disclosed.
- Users can **pause, edit or delete search and watch history** at any time — [YouTube blog, Sep 2021](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/).

**Pinterest**
- **GenAI "tuner"** (16 Oct 2025): reduces AI-generated image Pins **per category** for categories prone to AI content (architecture, art, beauty, entertainment, men's/women's/children's fashion, health, home decor, sport, plus **food & drink from 12 Dec 2025**). It is reached via Settings → "Refine your recommendations", or from a Pin's three-dot menu, and can be changed at any time — [Pinterest Newsroom](https://newsroom.pinterest.com/news/pinterest-rolls-out-new-tools-to-give-users-more-control-over-gen-ai-content/); [PPC Land](https://ppc.land/pinterest-introduces-new-controls-for-ai-generated-content-in-feeds/). Pinterest cited a stat that GenAI makes up 57% of online material (Pinterest's claim, not verified) — [Pinterest Newsroom](https://newsroom.pinterest.com/news/pinterest-rolls-out-new-tools-to-give-users-more-control-over-gen-ai-content/).

**Spotify**
- **Exclude playlists or tracks from your taste profile**: excluded listening has **less impact on recommendations and taste summaries**, both past and future. The example is a nightly sleep playlist, which then does not shape Discover Weekly or Wrapped. Excluded streams are dropped from taste-based Wrapped stories but still count toward total minutes — [Spotify Support](https://support.spotify.com/ly-en/article/exclude-playlists-or-tracks-from-your-taste-profile/); [FreeYourMusic (Sep 2026)](https://freeyourmusic.com/blog/exclude-from-your-taste-profile).
- **Prompted Playlist** (beta, 11 Dec 2025, Premium users in New Zealand, English): the user writes a prompt from broad to detailed, and the playlist draws on their **entire listening history**. It can **auto-refresh**, prompts are editable at any time, and an **"Ideas" tab offers prebuilt prompts**. It gives a **per-track explanation of why it was picked**. Spotify framed it as letting users "steer the algorithm" — [TechCrunch](https://techcrunch.com/2025/12/10/spotify-tests-more-personalized-ai-powered-prompted-playlists/); [Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-to-let-users-steer-the-algorithm-by-personalizing-playlists-with-ai-prompts); [AlternativeTo](https://alternativeto.net/news/2025/12/spotify-launches-prompted-playlist-in-beta-letting-listeners-influence-algorithmic-choices/).

**EU DSA non-personalised feed**
- **DSA Art. 38** requires very large platforms to offer **at least one recommender option not based on profiling** — [CADE](https://cadeproject.org/updates/amsterdam-court-orders-meta-to-make-no-profiling-feeds-easy-to-choose-and-keep/).
- **Bits of Freedom v Meta** (Amsterdam District Court, 2 Oct 2025, Netherlands only): Meta must let users choose a non-profiled feed and **keep that choice until the user changes it**. **Auto-reverting to a profiled feed is a prohibited dark pattern (Art. 25)**. Meta also breached Art. 27 because the setting was not directly and easily accessible on Android, Instagram Reels, the Facebook homepage and Facebook Reels. The penalty is €100k per day, capped at €5M — [The Record](https://therecord.media/dutch-court-meta-violated-european-law-social-feeds); [CADE](https://cadeproject.org/updates/amsterdam-court-orders-meta-to-make-no-profiling-feeds-easy-to-choose-and-keep/); [Merlin/CoE summary](https://merlin.obs.coe.int/download/10403/pdf).

### Inferences
- The control pattern is converging on: (a) **inferred-interest transparency** ("why this video", AI summary of interests), (b) **graded rather than binary weights** (sliders, more/less), (c) **natural-language steering**, and (d) **scope and expiry** (Dear Algo lasts 3 days and allows 6 active requests; Snooze lasts 30 days). A B2B platform could model user preferences as a list of `{topic, direction/weight, source: inferred|explicit|prompt, expiresAt}` entries.
- **Content-class filters** (AI-generated, political, sensitive) are now a standard axis separate from topical interest. They are typically "reduce, not remove" and scoped per category.
- **Reset** (TikTok Refresh) and **exclusion of context** (Spotify's sleep playlist) are distinct primitives. The first wipes history. The second marks some history as not representing taste.
- The EU ruling means a "non-personalised mode" must be a **persistent, easily reachable** setting on every surface, not a per-session toggle.

### Gaps
- X/Twitter user controls ("Not interested in this post", "Show fewer from", muted words, Following vs For You) and Netflix controls (profiles, thumbs up / double thumbs up, removing from Continue Watching) were not verified in this research pass, so no citations are given here.
- Instagram's "Reset suggested content" (believed to be from late 2024) and YouTube's "Not interested" and "Don't recommend channel" menu items are recalled but **not verified** here. The YouTube 2021 blog post does not mention them.
- Exact 2026 status (GA or test) of YouTube Your Custom Feed, the TikTok AIGC slider rollout, and Instagram Your Algorithm outside the US is unconfirmed.
- How TikTok or the EU non-profiled feeds were implemented outside Meta (e.g. TikTok's EU "non-personalised For You") was not covered by the sources found.

## 2. What signals do these systems publicly say they weight (incl. disclosed weightings)?

### Takeaway
The public disclosures share a common shape: a **weighted sum of predicted engagement probabilities**, with **negative feedback weighted far more heavily than positive**, and a shift from raw engagement and watch time toward **satisfaction ("valued" or survey-predicted) signals**. The hardest numbers come from X's 2023 open-source release and the leaked Facebook reaction weights from 2017–2020.

### Cited Findings
- **X heavy-ranker weights** (open-sourced 5 Apr 2023; the score is a weighted sum of predicted probabilities):

  | Predicted action | Weight |
  |---|---|
  | Like (fav) | 0.5 |
  | Retweet | 1.0 |
  | Reply | 13.5 |
  | Good profile click | 12.0 |
  | Video playback ≥50% | 0.005 |
  | **Reply that the author engages with** | **75.0** |
  | Good click | 11.0 |
  | Good click v2 | 10.0 |
  | **Negative feedback** | **−74.0** |
  | **Report** | **−369.0** |

  The weights were originally set so each action contributed roughly equally on average, then tuned periodically to platform metrics. They live in config, may be outdated, and the open-source version may differ from production — [twitter/the-algorithm-ml README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md).
- **X 2026 release** (20 Jan 2026, `xai-org/x-algorithm`, Apache-2.0, Rust and Python): a **Grok-based transformer** ranks For You posts by **predicting actions (likes, replies…) without hand-engineered features**. Candidates come from in-network posts (followed accounts) and out-of-network posts found by ML retrieval. Musk promised updates every 4 weeks with developer notes, and said "We know the algorithm is dumb and needs massive improvements" — [Decrypt](https://decrypt.co/355108/elon-musks-x-open-sources-grok-powered-algorithm-driving-for-you-feed?amp=1); [AlternativeTo](https://alternativeto.net/software/twitter/news); [SCMP](https://www.scmp.com/business/companies/article/3339479/elon-musk-open-source-x-algorithm-7-days-amid-global-scrutiny). **[UNVERIFIED]** A 15 May 2026 update reportedly added local inference, a downloadable mini model and an ads-blending module; this comes from a single blog — [pasqualepillitteri.it](https://pasqualepillitteri.it/de/news/2597/x-algorithmus-open-source-mai-2026).
- **[OLDER] Facebook reaction weights** (internal documents reported by the Washington Post, Oct 2021):
  - **2017:** all emoji reactions (love, haha, wow, sad, angry) were weighted **5× a like**.
  - **2018:** "angry" was cut to 4×.
  - **Sept 2020:** "angry" was cut to **0**, while the other reactions were reduced but still weighted above a like.

  Critics note it was not anger alone that was boosted, since all reactions started at 5× — [Boston.com/WaPo syndication](https://www.boston.com/news/technology/2021/10/26/five-points-for-anger-one-for-a-like-how-facebooks-formula-fostered-rage-and-misinformation/); [Techdirt](https://www.techdirt.com/tag/reactions/); [Cato](https://www.cato.org/blog/washington-post-facebook-promotes-outrage-isnt-outrageous).
- **YouTube** (Cristos Goodrow, 15 Sep 2021):
  - Ranking went from **clicks (until 2011)** to **watch time (2012)**, which cut views by 20%, and then added **satisfaction surveys**. Viewers rate videos 1–5 stars, and only **4–5 stars count as "valued watchtime"**. An **ML model predicts survey answers** for viewers who do not respond.
  - Shares and likes indicate satisfaction, and dislikes indicate a poor fit. **Signal weights are personalised per viewer**: if someone shares everything, their shares count for less — [YouTube blog](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/).
  - Third-party reports say viewers see about 1–2 surveys a month, and quote YouTube saying "We no longer consider all Watch Time on YouTube to be equal" — [vidIQ](https://vidiq.com/blog/post/how-youtube-algorithm-recommends-videos/).
- **TikTok** (newsroom disclosure, June 2020): For You ranking combines **user interactions** (likes, shares, follows, comments, content created), **video information** (captions, sounds, hashtags) and **device/account settings** (language, country, device type). Device and account settings get lower weight because users do not actively express them. **Follower count and a creator's past high-engagement videos are not direct factors.** "Not interested" is an input — [TikTok Newsroom](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/); [Tech Brew](https://www.techbrew.com/stories/2020/06/22/tiktok-provides-details-recommendation-system). Commonly quoted example from that page: finishing a longer video is a strong signal that outweighs a weak one such as sharing a country with the creator. **I could not retrieve the full page (HTTP 503) to verify the exact wording.** Secondary guides list watch time, completion rate, replays, likes, comments, shares and follows as the strongest signals; this is unverified against the primary source — [FirstPageDigital](https://www.firstpagedigital.sg/resources/social/tiktok-fyp-algorithm/).
- **Meta (2026)**: Interested / Not interested feedback and X-outs explicitly train recommendations. "Your Algorithm" adds **direct topic input** as a signal — [Meta Transparency Center](https://transparency.meta.com/features/user-control-shape-your-experience-on-meta-platforms/).
- **Spotify Prompted Playlist** combines the prompt with the **entire listening history**, and exclusions down-weight specific listening contexts — [TechCrunch](https://techcrunch.com/2025/12/10/spotify-tests-more-personalized-ai-powered-prompted-playlists/); [Spotify Support](https://support.spotify.com/ly-en/article/exclude-playlists-or-tracks-from-your-taste-profile/).

### Inferences
- In X's weights, a report (−369) cancels about 740 likes, and negative feedback (−74) cancels about 148 likes. **Asymmetric, heavy negative weights** are the norm, and a B2B platform could expose them as an operator "penalty strength" knob.
- **Conversation depth** (a reply the author engages with, 75) outweighs passive approval by about 150×. This favours dialogue-heavy content.
- A per-user **normalisation of signal weight** (YouTube's "if you share everything, shares count less") is a cheap but meaningful mechanism to mirror.
- A trend from 2021 to 2026 is the move away from **hand-tuned weights** (X 2023, FB 2017–20) toward **end-to-end learned models** (X Grok 2026), with **user-stated intent** layered on top (Your Algorithm, Dear Algo, Custom Feed, Prompted Playlist).

### Gaps
- No current (2024–2026) numeric weights were found for Meta, TikTok or YouTube. Pinterest, Netflix and Bluesky signal weights were not researched.
- Meta's satisfaction surveys ("worth your time") and Meta system cards were not retrieved in this pass.
- Whether X's 2026 code publishes explicit action weights the way the 2023 README did was not verified on GitHub.

## 3. How do they handle exploration, diversity, rabbit holes and wellbeing?

### Takeaway
Platforms use **repetition caps on sensitive "harmless-once, harmful-in-bulk" themes** (TikTok dispersal; YouTube teen limits on body-image, fitness-idealisation and social-aggression content), **demotion of borderline content**, **authority boosts** for news and health, **full-history reset**, and **break/bedtime nudges** for minors. Topic sliders and the AI-content tuners double as user-driven diversity levers.

### Cited Findings
- **TikTok dispersal**: when its systems detect **repetition of sensitive themes (e.g. sadness, extreme dieting) within a set of videos, some are swapped for videos on other topics**. This was announced alongside Refresh as a separate change, after reports that teen feeds were flooded with weight-loss and eating-disorder videos (WSJ 2021) — [Search Engine Journal](https://searchenginejournal.com/tiktok-refresh-for-you-feed/482667); [Yahoo/Engadget](https://autos.yahoo.com/tiktok-for-you-feed-refresh-130028273.html).
- **TikTok Refresh** (2023) is a user-triggered exploration reset, motivated by complaints about repetitive content — [Lindsey Gamble](https://www.lindseygamble.com/blog/tiktok-introduces-new-feature-for-refreshing-the-for-you-feed).
- **YouTube teen repetition limits** (from 2 Nov 2023, US first, with other countries planned for 2024): **limits repeated recommendations** to minors of content that **compares physical features and idealises some types over others, idealises specific fitness levels or body weights, or shows social aggression** (non-contact fights, intimidation). The categories were chosen with the Youth & Families Advisory Committee as content that is "innocuous as a single video, but could be problematic for some teens if viewed in repetition". The same update made **take-a-break and bedtime reminders** more prominent and more frequent for under-18s — [TechXplore/AFP](https://techxplore.com/news/2023-11-youtube-aim-teens-binging-body.amp); [Giga Law](https://giga.law/daily-news/2023/11/2/youtube-limits-recommendations-to-teenagers-for-sensitive-topics).
- **YouTube borderline demotion** (2019 onward): demotion caused a **70% drop in watch time of non-subscribed recommended borderline content in the US**. Consumption from recommendations is "significantly below 1%", with a target of under 0.5% of views. Demoting salacious or tabloid content *increased* watch time by 0.5% over 2.5 months. **Authoritative sources** are boosted for news and information, as judged by human raters and certified experts for health topics — [YouTube blog, Sep 2021](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/).
- **Meta**: Sensitive Content and Political Content controls work as user-set exposure caps. Snooze removes all recommendations for 30 days. **Blend** and the **Friends tab** steer feeds toward social, non-algorithmic discovery — [Meta Transparency Center](https://transparency.meta.com/features/user-control-shape-your-experience-on-meta-platforms/).
- **Pinterest and TikTok GenAI controls** reduce the share of AI-generated content without removing it, which keeps diversity managed rather than banned — [Pinterest Newsroom](https://newsroom.pinterest.com/news/pinterest-rolls-out-new-tools-to-give-users-more-control-over-gen-ai-content/); [Storyboard18](https://www.storyboard18.com/digital/tiktok-introduces-controls-to-let-users-adjust-volume-of-ai-generated-content-84502.htm).
- **Spotify** taste-profile exclusion stops functional listening (sleep, kids) from distorting discovery — [Spotify Support](https://support.spotify.com/ly-en/article/exclude-playlists-or-tracks-from-your-taste-profile/).

### Inferences
- A reusable primitive is a **"sensitive-theme frequency cap"**: a maximum share of N consecutive items from a tagged theme, applied per audience segment (stricter for minors). It is distinct from topic preference.
- **Author and sound de-duplication** (no two in a row) is widely cited as TikTok practice but was not verified here. It is still a low-cost diversity rule worth offering as an operator setting.
- YouTube's finding that demoting low-quality content raised watch time is a useful argument that quality and diversity constraints need not hurt engagement.

### Gaps
- TikTok's specific "no consecutive videos from the same creator or sound" rule and its exploration rate were not verified (the newsroom page was unavailable).
- Status of YouTube's teen limits outside the US after 2024 is unconfirmed. No 2025–2026 sources on Instagram teen accounts or PG-13 content defaults were gathered.
- No quantitative exploration/exploitation ratios were disclosed by any platform in the sources found.

## 4. Operator-side knobs that a B2B content platform could mirror

### Takeaway
**Bluesky's feed generators** are the clearest operator model. Any operator runs a service that returns a ranked skeleton of post IDs, the host app hydrates and displays it, and the feed can opt into "show more / show less" feedback from users. **Threads Custom Feeds, Spotify Prompted Playlist, YouTube Custom Feed and Instagram Blend** show the "feed as a saved, named, promptable object" pattern. **Exposed ranking weights** (X) and **category-scoped content-class tuners** (Pinterest) suggest configurable ranking policies.

### Cited Findings
- **Bluesky feed generators**: custom feeds built by users or organisations. The feed service answers **`getFeedSkeleton`** requests (feed reference, plus `limit` and `cursor`) with a **list of post URIs** (optionally with metadata such as a repost reason). The user's PDS or app view **hydrates** them into full posts. Most generators also consume the relay **firehose** to index posts — [Bluesky docs](https://docs.bsky.app/docs/tutorials/viewing-feeds); [bluesky-feeds-rb template](https://tangled.org/mackuba.eu/bluesky-feeds-rb/blob/0.4/README.md?code=true).
- **Bluesky feed interactions**: the generator record has an optional **`acceptsInteractions`** boolean. It opts the feed into **`app.bsky.feed.sendInteractions`** calls, which carry "show more like this" and "show less like this" feedback. Bluesky's own Discover feed uses this — [adaptlypost (3rd party)](https://adaptlypost.com/blog/bluesky-feed-generator); [willdot Go demo](https://tangled.org/willdot.net/feed-demo-go); [fenarinarsa](https://www.fenarinarsa.com/?p=3320). **[UNVERIFIED against the official lexicon]**
- **Threads Custom Feeds** let users or operators build a feed from selected topics or people — [Meta Transparency Center](https://transparency.meta.com/features/user-control-shape-your-experience-on-meta-platforms/).
- **Instagram Blend** merges several users' recommendation streams into one shared Reels feed — [Meta Transparency Center](https://transparency.meta.com/features/user-control-shape-your-experience-on-meta-platforms/).
- **Spotify Prompted Playlist**: a named feed defined by a prompt, which auto-refreshes, can be edited, and comes with **per-item explanations** and an **"Ideas" gallery of starter prompts** — [Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-to-let-users-steer-the-algorithm-by-personalizing-playlists-with-ai-prompts); [AlternativeTo](https://alternativeto.net/news/2025/12/spotify-launches-prompted-playlist-in-beta-letting-listeners-influence-algorithmic-choices/).
- **YouTube Your Custom Feed**: a prompt-defined Home feed placed beside the default Home — [9to5Google](https://9to5google.com/2025/11/26/youtube-testing-new-home-page-with-more-control-over-suggested-content/).
- **X weights as config**: engagement weights live in a config file that can be changed at any time and are tuned to platform metrics. This is effectively an operator knob set — [the-algorithm-ml README](https://raw.githubusercontent.com/twitter/the-algorithm-ml/main/projects/home/recap/README.md). Candidate sourcing is split between in-network and out-of-network — [Decrypt](https://decrypt.co/355108/elon-musks-x-open-sources-grok-powered-algorithm-driving-for-you-feed?amp=1).
- **Pinterest tuner**: content-class (GenAI) reduction **scoped per content category**, managed centrally and per item — [Pinterest Newsroom](https://newsroom.pinterest.com/news/pinterest-rolls-out-new-tools-to-give-users-more-control-over-gen-ai-content/).
- **Threads Dear Algo**: steering requests are **shareable objects**. Reposting one applies it to your own feed, with a time limit (3 days) and a cap on active requests (6) — [Meta newsroom](https://about.fb.com/news/2026/02/threads-dear-algo/).

### Inferences
Candidate "feed behaviour customisation" offerings for a B2B content platform, mapped to these precedents:
1. **Feed definitions as objects**: a name, sources (in-network or out-of-network split), a topic filter, a prompt, and auto-refresh. Precedents: Bluesky generators, Threads Custom Feeds, Prompted Playlist, YouTube Custom Feed.
2. **Signal weight table** (like, share, save, comment, completion, dwell, negative feedback, report), with **asymmetric negative penalties** and **per-user normalisation**. Precedents: X 2023 weights, YouTube.
3. **End-user topic sliders plus an editable inferred-interest summary**, offering both a fixed taxonomy (TikTok) and individualised AI-summarised topics (Instagram).
4. **Time-boxed steering requests** with an expiry and a cap on active requests, optionally shareable (Dear Algo).
5. **Content-class tuners** (AI-generated, political, sensitive), set per category and as "reduce, not remove" (Pinterest, TikTok AIGC, Meta).
6. **Wellbeing rules**: sensitive-theme frequency caps per audience segment, plus borderline demotion and authority boost (TikTok dispersal, YouTube).
7. **Reset and exclude**: a full history reset (TikTok Refresh) and context exclusion (Spotify).
8. **Compliance mode**: a persistent non-profiled feed reachable on every surface (DSA Art. 38 and the Amsterdam ruling).
9. **Explainability**: "Why this item" (TikTok's entry point into Manage Topics) and per-item reasons (Spotify).
10. **Pluggable external ranker** (Bluesky skeleton contract): the operator returns IDs and the platform hydrates them, with an interaction-feedback callback.

### Gaps
- Bluesky's official numbers (count of custom feeds, usage share) were not found.
- Spotify DJ voice requests and any Spotify taste-profile editing beyond exclusion (e.g. removing artists) were not verified.
- Netflix operator-side mechanisms (row personalisation, artwork personalisation) were not researched in this pass.
- No B2B recommender vendor benchmarks (e.g. AWS Personalize, Algolia Recommend knobs) were in scope or gathered.
