// Edgy-but-SFW topics for rabbit-hole tests, crawled from the "edgy" queue pool. Deliberately small:
// 3 subtopics × 4 steps × 3 horizontals, capped at 10 images each. Steps run mild → edgy, so depth
// doubles as intensity. NSFW-flagged posts are dropped by the crawler like everywhere else.
const source = `
# Dark Humor & Cursed {dark-humor} > gaming, f1, cs2 @dankmemes @me_irl @2meirl4meirl @cursedimages
## Meme Spiral @me_irl @dankmemes @shitposting
- Relatable @!me_irl ~ me_irl
  Work: work, job, boss | Sleep: sleep, bed, tired | Social: friends, party, text
- Absurd @!dankmemes ~ dank
  Cats: cat | Wojaks: wojak | Surreal: surreal
- Dark humor @dankmemes @shitposting ~ dark, death, funeral, grave, dead
  Death: death, dead | Funerals: funeral | Therapy: therapy, therapist
- Shitposting @!shitposting ~ shitpost
  Low quality: low quality | Crusty: crusty, jpeg | Unhinged: unhinged, insane
## Cursed Images @cursedimages @blursedimages @cursedfood @cursedcomments
- Blursed @!blursedimages ~ blursed
  Animals: cat, dog, animal | Food: food | People: guy, man, grandma
- Cursed food @!cursedfood ~ food
  Pizza: pizza | Sushi: sushi | Desserts: cake, dessert, ice cream
- Cursed objects @!cursedimages ~ cursed
  Toys: toy, doll | Bathrooms: toilet, bathroom | Rooms: room, house
- Cursed comments @!cursedcomments ~ comment
  Reddit: reddit | YouTube: youtube | Tweets: tweet, twitter
## Doom Humor @2meirl4meirl @me_irl
- Existential @!2meirl4meirl ~ 2meirl4meirl
  Loneliness: alone, lonely | Burnout: tired, exhausted | Money: money, rent, broke
- Late capitalism @me_irl @2meirl4meirl ~ rent, salary, landlord, inflation, job market
  Rent: rent, landlord | Salaries: salary, pay | Job hunting: job, interview, applying
- Generations @me_irl @dankmemes ~ gen z, millennial, boomer, adulting
  Gen Z: gen z | Millennials: millennial | Boomers: boomer
- It's so over @2meirl4meirl @shitposting ~ over, cooked, doomed
  Cooked: cooked | Doomed: doomed, doom | Coping: cope, coping

# Horror & Creepy {horror} > photography, architecture-cities, gaming @creepy @LiminalSpace @backrooms
## Liminal Spaces @LiminalSpace @backrooms @dreamcore
- Empty malls & stores @LiminalSpace ~ mall, store, shop, arcade
  Malls: mall | Arcades: arcade | Stores: store, shop
- Pools & hallways @LiminalSpace ~ pool, hallway, corridor, school
  Pools: pool | Hallways: hallway, corridor | Schools: school, classroom
- Backrooms @!backrooms ~ backrooms
  Levels: level | Entities: entity | Yellow rooms: yellow, carpet
- Dreamcore @!dreamcore @LiminalSpace ~ dreamcore, dream, weirdcore
  Dreams: dream | Weirdcore: weirdcore | Nostalgia: nostalgia, childhood
## Creepy Photos @creepy @AnalogHorror
- Old photos @creepy ~ old photo, vintage, found, 1800s, victorian
  Victorian: victorian, 1800s | Found photos: found | Family photos: family
- Dolls & masks @creepy ~ doll, mask, mannequin, puppet
  Dolls: doll | Masks: mask | Mannequins: mannequin
- Unexplained @creepy ~ figure, shadow, unexplained, caught, camera
  Shadow figures: shadow, figure | Trail cams: trail cam, camera | Night shots: night
- Analog horror @!AnalogHorror ~ analog horror, vhs, tape
  VHS: vhs, tape | Broadcasts: broadcast, emergency | Series: series, episode
## Cryptids & Legends @Cryptids @creepy
- Bigfoot @Cryptids ~ bigfoot, sasquatch, yeti
  Footprints: footprint, print | Sightings: sighting, seen | Photos: photo, picture
- Lake monsters @Cryptids ~ nessie, lake monster, sea serpent, loch ness
  Nessie: nessie, loch ness | Sea serpents: sea serpent, serpent | Lakes: lake
- Skinwalkers & wendigos @Cryptids @creepy ~ skinwalker, wendigo, dogman, mothman
  Skinwalkers: skinwalker | Wendigos: wendigo | Mothman: mothman
- Cryptid art @Cryptids ~ art, drawing, sketch, painting
  Drawings: drawing, sketch | Paintings: painting | Digital art: digital

# Urbex & Abandoned {urbex} > architecture-cities, photography, travel @urbanexploration @AbandonedPorn @abandoned
## Abandoned Places @AbandonedPorn @abandoned @urbanexploration
- Abandoned houses @AbandonedPorn @abandoned ~ house, home, mansion, farmhouse
  Mansions: mansion | Farmhouses: farmhouse, farm | Houses: house, home
- Malls & factories @AbandonedPorn @urbanexploration ~ mall, factory, plant, mill, warehouse
  Malls: mall | Factories: factory, plant | Mills: mill, warehouse
- Hospitals & asylums @AbandonedPorn @urbanexploration ~ hospital, asylum, sanatorium
  Hospitals: hospital | Asylums: asylum | Sanatoriums: sanatorium
- Prisons & bunkers @AbandonedPorn @urbanexploration ~ prison, jail, military, bunker, base
  Prisons: prison, jail | Bunkers: bunker | Bases: base, military
## Risky Access @urbanexploration @drains
- Rooftops @urbanexploration ~ rooftop, roof, skyline
  Rooftops: rooftop, roof | Skylines: skyline | Night views: night
- Cranes & towers @urbanexploration ~ crane, tower, antenna
  Cranes: crane | Towers: tower | Antennas: antenna
- Bridges & tunnels @urbanexploration ~ bridge, tunnel, subway, metro
  Bridges: bridge | Tunnels: tunnel | Subways: subway, metro
- Drains @!drains ~ drain
  Storm drains: storm drain, storm | Junctions: junction | Outfalls: outfall
## Decay @AbandonedPorn @abandoned
- Time capsules @AbandonedPorn @abandoned ~ time capsule, left behind, untouched, frozen in time
  Left behind: left behind | Untouched: untouched | Frozen in time: frozen in time, time capsule
- Nature reclaiming @AbandonedPorn @abandoned ~ nature, overgrown, reclaimed, forest
  Overgrown: overgrown | Reclaimed: reclaim, reclaimed | Forests: forest, tree
- Vandalised @abandoned @urbanexploration ~ graffiti, vandalized, vandalised, trashed
  Graffiti: graffiti | Vandalism: vandalized, vandalised | Trashed: trashed, destroyed
- Burned out @abandoned @AbandonedPorn ~ fire, burned, burnt, ruin
  Fires: fire | Burned: burned, burnt | Ruins: ruin

# Rage Bait {rage-bait} > home-improvement, gaming, cars @mildlyinfuriating @facepalm @CrappyDesign
## Everyday Annoyances @mildlyinfuriating @CrappyDesign @assholedesign
- Mildly infuriating @!mildlyinfuriating ~ mildlyinfuriating
  Packaging: package, packaging, box | Parking: parking, parked | Neighbors: neighbor, neighbour
- Bad design @!CrappyDesign ~ design
  Signs: sign | Bathrooms: bathroom, toilet | Apps: app, ui
- Hostile design @HostileArchitecture @assholedesign ~ hostile, bench, spikes, anti-homeless
  Benches: bench | Spikes: spike | Barriers: barrier, fence
- Corporate greed @!assholedesign @mildlyinfuriating ~ subscription, paywall, price, shrinkflation
  Subscriptions: subscription | Shrinkflation: shrinkflation, smaller | Fees: fee, price
## People @ChoosingBeggars @insanepeoplefacebook @facepalm
- Choosing beggars @!ChoosingBeggars ~ choosing beggar
  Marketplace: marketplace, listing | Free stuff: free | Exposure: exposure
- Entitled people @ChoosingBeggars @facepalm ~ entitled, karen, demand
  Karens: karen | Entitled: entitled | Demands: demand
- Facebook insanity @!insanepeoplefacebook ~ facebook
  Boomers: boomer | Conspiracies: conspiracy | Groups: group, mom
- Facepalm moments @!facepalm ~ facepalm
  Screenshots: screenshot, text | Signs: sign | Headlines: news, headline
## Rage Screenshots @facepalm @mildlyinfuriating
- Bad bosses @facepalm @mildlyinfuriating ~ boss, manager, work, job
  Bosses: boss | Managers: manager | Schedules: schedule, shift
- Landlords @mildlyinfuriating @facepalm ~ landlord, rent, lease, apartment
  Landlords: landlord | Rent: rent | Deposits: deposit
- Customer service @mildlyinfuriating @facepalm ~ customer service, refund, support, order
  Refunds: refund | Orders: order | Support chats: support, chat
- Online arguments @facepalm @insanepeoplefacebook ~ argument, comment, reply, twitter
  Comments: comment | Replies: reply | Tweets: tweet, twitter

# Fight Sports {fight-sports} > fitness, running, gaming @MMA @ufc @Boxing
## Fight Night @ufc @MMA @Boxing
- Posters & cards @ufc @MMA ~ poster, card, main event, event
  Posters: poster | Main events: main event | Cards: card
- Highlights @ufc @MMA ~ highlight, win, victory, champion
  Wins: win, victory | Belts: belt, champion | Celebrations: celebration
- Knockouts @ufc @MMA @Boxing ~ knockout, ko, tko, finish
  Knockouts: knockout, ko | Submissions: submission, choke | Stoppages: stoppage, tko
- Aftermath @ufc @MMA ~ aftermath, face, eye, cut, swollen
  Cuts: cut | Swelling: swollen, swelling | Hospital visits: hospital
## Fighters @ufc @MMA
- Weigh-ins @ufc @MMA ~ weigh-in, weigh in, scale, weight
  Weigh-ins: weigh-in, weigh in | Weight cuts: weight cut | Scales: scale
- Face-offs @ufc @MMA ~ face off, faceoff, staredown, press conference
  Face-offs: face off, faceoff | Staredowns: staredown | Pressers: press conference, presser
- Trash talk @ufc @MMA ~ trash talk, callout, beef, said
  Callouts: callout | Beefs: beef | Quotes: said, says
- Rankings @ufc @MMA ~ ranking, p4p, goat
  P4P: p4p, pound for pound | GOATs: goat | Rankings: ranking
## Training @MMA @MuayThai @bjj
- Gyms & camps @MMA @MuayThai ~ gym, camp, training
  Gyms: gym | Camps: camp | Training: training
- Muay Thai @!MuayThai ~ muay thai
  Thailand: thailand | Shins: shin | Fights: fight
- Sparring @MMA @MuayThai @bjj ~ sparring, spar
  Sparring: sparring, spar | Gloves: glove | Headgear: headgear
- Injuries @MMA @bjj @MuayThai ~ injury, broken, cauliflower, torn
  Cauliflower ear: cauliflower | Breaks: broken, break | Tears: torn, tear

# Guns & Tactical {guns-tactical} > camping, hiking, cs2 @guns @ar15 @tacticalgear
## Range & Builds @guns @ar15
- First guns @guns ~ first, new, bought
  First guns: first | Purchases: bought, purchase | Pistols: pistol, glock
- Range days @guns @ar15 ~ range, target, grouping, shooting
  Targets: target | Groupings: grouping, group | Range trips: range
- AR builds @!ar15 ~ build
  Builds: build | Optics: optic, scope, lpvo | Uppers: upper
- Collections @guns ~ collection, safe, inherited
  Collections: collection | Safes: safe | Heirlooms: grandfather, inherited
## Tactical Gear @tacticalgear @NightVision
- EDC & holsters @tacticalgear @guns ~ edc, everyday carry, holster
  EDC: edc | Holsters: holster | Belts: belt
- Plate carriers @!tacticalgear ~ plate carrier, carrier, kit
  Plate carriers: plate carrier | Kits: kit | Pouches: pouch
- Night vision @!NightVision ~ night vision, nods, pvs
  NODs: nods, pvs | Thermal: thermal | Photos: photo, shot
- Full loadouts @tacticalgear @airsoft ~ loadout, full kit, setup
  Loadouts: loadout | Full kits: full kit | Setups: setup
## Airsoft @airsoft
- Airsoft guns @!airsoft ~ airsoft
  Rifles: rifle, m4, ak | Pistols: pistol, gbb | Snipers: sniper
- Airsoft loadouts @airsoft ~ loadout, kit, gear
  Loadouts: loadout | Kits: kit | Helmets: helmet
- Milsim @airsoft ~ milsim, game, event, field
  Milsim: milsim | Events: event | Fields: field
- Tacticool memes @airsoft @guns ~ meme, tacticool
  Tacticool: tacticool | Memes: meme | Fails: fail

# Cannabis Culture {cannabis} > gardening, houseplants, cocktails-mixology @trees @microgrowery
## Sesh @trees
- Strains & buds @trees ~ strain, bud, nug, flower
  Nugs: nug, bud | Strains: strain | Jars: jar, stash
- Setups @trees ~ setup, bong, piece, rig
  Bongs: bong | Pieces: piece, pipe | Setups: setup
- Rolling @trees ~ joint, blunt, roll, rolled
  Joints: joint | Blunts: blunt | Rolling: roll, rolled
- Sesh spots @trees ~ sesh, spot, view, chill
  Views: view | Spots: spot | Nights: night
## Growing @microgrowery
- Seedlings @microgrowery ~ seedling, sprout, germination, first grow
  Seedlings: seedling | Sprouts: sprout | First grows: first grow, first
- Grow tents @microgrowery ~ tent, light, setup
  Tents: tent | Lights: light, led | Setups: setup
- Flowering @microgrowery ~ flower, flowering, week
  Flowering: flower, flowering | Week updates: week | Trichomes: trichome
- Harvests @microgrowery ~ harvest, dry, cure, yield
  Harvests: harvest | Drying: dry, drying | Yields: yield
## Stoner Humor @trees
- Memes @trees ~ meme, high, munchies
  Munchies: munchies, snack | Memes: meme | High thoughts: high
- 420 @trees ~ 420, 4/20
  420: 420 | Celebrations: celebration | Deals: deal
- Stoner art @trees ~ art, drawing, painting, glass
  Drawings: drawing | Paintings: painting | Glass art: glass
- Legalization @trees ~ legal, legalization, law, dispensary
  Dispensaries: dispensary | Legalization: legal, legalization | Laws: law

# Alt Style & Body Mods {alt-style} > fashion, tattoos, makeup-nails @gothstyle @AltFashion @piercing
## Alt Fashion @AltFashion @gothstyle
- Grunge @AltFashion ~ grunge, 90s, flannel
  Grunge: grunge | Flannel: flannel | Boots: boot
- Goth @!gothstyle ~ goth
  Trad goth: trad | Victorian goth: victorian | Goth makeup: makeup
- Punk @AltFashion ~ punk, studs, spikes, patches
  Studs: stud | Patches: patch | Mohawks: mohawk
- Avant-garde @AltFashion @gothstyle ~ avant, outfit, fit
  Avant-garde: avant | Platforms: platform | Corsets: corset
## Piercings @piercing
- First piercings @piercing ~ first, new, fresh
  First piercings: first | Fresh: fresh, new | Lobes: lobe
- Ear curations @piercing ~ curation, ear, helix, conch, daith
  Curations: curation | Helix: helix | Conch: conch
- Facial piercings @piercing ~ septum, nose, lip, eyebrow, bridge
  Septums: septum | Nostrils: nose, nostril | Lips: lip
- Healing @piercing ~ healing, bump, infected, irritated
  Healing: healing | Bumps: bump | Irritation: irritated, irritation
## Body Mods @Stretched @piercing
- Stretched lobes @!Stretched ~ stretched, gauge, mm
  Sizes: mm | Plugs: plug | Tunnels: tunnel
- Stretch progress @Stretched ~ progress, sized up, size, journey
  Progress: progress | Sizing up: sized up, size | Journeys: journey
- Jewelry @Stretched @piercing ~ jewelry, jewellery, plug, ring
  Plugs: plug | Rings: ring | Titanium: titanium
- Heavy mods @piercing @Stretched ~ microdermal, dermal, surface, mod
  Dermals: dermal, microdermal | Surface piercings: surface | Mods: mod

# Gambling & Loss Porn {gambling} > watches, cars, f1 @wallstreetbets @gambling @sportsbook
## Trading @wallstreetbets @CryptoCurrency
- Gains @wallstreetbets ~ gain, gains, profit, green
  Gains: gain | Green days: green | Tendies: tendies
- YOLOs @wallstreetbets ~ yolo, all in, calls, puts
  YOLOs: yolo | Calls: calls, call | Puts: puts, put
- Loss porn @wallstreetbets ~ loss, lost, red, down
  Losses: loss, lost | Red days: red | Margin calls: margin
- Crypto @CryptoCurrency ~ bitcoin, btc, eth, crypto
  Bitcoin: bitcoin, btc | Ethereum: eth, ethereum | Charts: chart
## Betting @sportsbook @gambling
- Parlays @sportsbook @gambling ~ parlay, leg, legs
  Parlays: parlay | Legs: leg | Cashed: hit, cashed
- Bad beats @sportsbook @gambling ~ bad beat, one leg, lost by
  Bad beats: bad beat | One leg: one leg | Close calls: lost by, close
- Casino @gambling ~ casino, slot, blackjack, roulette
  Slots: slot | Blackjack: blackjack | Roulette: roulette
- Jackpots @gambling ~ jackpot, won, win
  Jackpots: jackpot | Wins: won, win | Big hits: hit
## Degen Memes @wallstreetbets @gambling
- WSB memes @wallstreetbets ~ meme, regard, wendy
  Wendy's: wendy | Regards: regard | Memes: meme
- Degen life @gambling @wallstreetbets ~ degen, addiction, broke
  Degens: degen | Broke: broke | Rock bottom: rock bottom, bottom
- Market crashes @wallstreetbets @CryptoCurrency ~ crash, dump, bear, recession
  Crashes: crash | Dumps: dump | Bears: bear
- To the moon @wallstreetbets @CryptoCurrency ~ moon, ath, pump, bull
  Moon: moon | All-time highs: ath, all time high | Pumps: pump

# UFOs & High Strangeness {ufos} > astronomy, spaceflight, starship @UFOs @HighStrangeness @aliens
## Sightings @UFOs
- Lights in the sky @UFOs ~ light, lights, sky
  Lights: light | Formations: formation | Night skies: night, sky
- Orbs @UFOs @HighStrangeness ~ orb, sphere
  Orbs: orb | Spheres: sphere | Glowing: glow
- Tic-tacs & craft @UFOs ~ tic tac, craft, object, uap, triangle
  Tic-tacs: tic tac | Triangles: triangle | UAPs: uap
- Close encounters @UFOs @aliens ~ landed, encounter, abduction, close
  Encounters: encounter | Abductions: abduction | Landings: landed, landing
## Aliens @aliens @UFOs
- Alien art @aliens ~ art, drawing, render
  Art: art | Greys: grey, gray | Renders: render
- Disclosure @UFOs @aliens ~ disclosure, congress, hearing, government
  Hearings: hearing, congress | Disclosure: disclosure | Documents: document, foia
- Ancient aliens @aliens @HighStrangeness ~ ancient, pyramid, egypt, nazca
  Pyramids: pyramid | Nazca: nazca | Egypt: egypt
- Alien memes @aliens @UFOs ~ meme, area 51, probe
  Memes: meme | Area 51: area 51 | Probes: probe
## High Strangeness @HighStrangeness @Paranormal
- Glitches in reality @HighStrangeness ~ glitch, matrix, simulation
  Glitches: glitch | Matrix: matrix | Simulation: simulation
- Ghosts @Paranormal ~ ghost, spirit, haunted
  Ghosts: ghost | Haunted: haunted | Spirits: spirit
- Strange photos @HighStrangeness @Paranormal ~ photo, picture, caught, camera
  Photos: photo | Trail cams: trail cam | Doorbell cams: ring camera, doorbell
- Rabbit holes @HighStrangeness ~ theory, conspiracy, rabbit hole, cover up
  Theories: theory | Cover-ups: cover up, cover-up | Rabbit holes: rabbit hole
`;

export default source;
