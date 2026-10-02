// Personal-interest topics, crawled from the "personal" queue pool (separate from the 60 core topics).
const source = `
# Formula 1 {f1} > cars, motorcycles, gaming, photography @formula1 @F1Porn @F1Technical
## Race Weekends @formula1 @F1Porn
- Race highlights @formula1 @F1Porn ~ race, grand prix, gp
  Starts: start, lights out | Overtakes: overtake, pass | Crashes: crash, incident | Podiums: podium | Wet races: rain, wet
- Qualifying & poles @formula1 @F1Porn ~ qualifying, quali, pole
  Pole laps: pole | Q3: q3 | Grids: grid | Front rows: front row | Sprints: sprint
- Circuits @formula1 @F1Porn ~ circuit, track, monaco, monza, spa, silverstone, suzuka
  Monaco: monaco | Monza: monza | Spa: spa | Silverstone: silverstone | Suzuka: suzuka
- Strategy & pit stops @formula1 @F1Technical ~ pit stop, strategy, tyre, tire, undercut, safety car
  Pit stops: pit stop | Tyres: tyre, tire | Undercuts: undercut | Safety cars: safety car | Penalties: penalty
## Teams & Drivers @formula1 @scuderiaferrari @McLarenFormula1 @RedBullRacing
- Ferrari @!scuderiaferrari @formula1 ~ ferrari, leclerc, hamilton
  Leclerc: leclerc | Hamilton: hamilton | SF cars: sf-25, sf-26, car | Tifosi: tifosi, fans | Monza: monza
- McLaren @!McLarenFormula1 @formula1 ~ mclaren, norris, piastri
  Norris: norris, lando | Piastri: piastri, oscar | Papaya: papaya | Wins: win, victory | MCL cars: mcl, car
- Red Bull @!RedBullRacing @formula1 ~ red bull, verstappen
  Verstappen: verstappen, max | Tsunoda: tsunoda, yuki | RB cars: rb, car | Wins: win | Liveries: livery
- Rookies & new teams @formula1 @F1Porn ~ rookie, antonelli, bearman, hadjar, bortoleto, cadillac, audi
  Antonelli: antonelli, kimi | Bearman: bearman | Hadjar: hadjar | Cadillac: cadillac | Audi: audi, sauber
## F1 Photography @F1Porn @formula1
- Car close-ups @!F1Porn ~ car, close up, detail
  Front wings: front wing | Cockpits: cockpit, halo | Sparks: sparks | Liveries: livery | Garages: garage
- Driver portraits @!F1Porn ~ portrait, helmet, driver
  Verstappen: verstappen | Leclerc: leclerc | Hamilton: hamilton | Norris: norris | Piastri: piastri
- Track action @!F1Porn ~ corner, apex, onboard, action
  Panning shots: panning, pan | Night races: night | Corners: corner | Battles: battle, wheel to wheel | Onboards: onboard
- Atmosphere @!F1Porn ~ paddock, fans, grandstand, crowd
  Paddock: paddock | Fans: fans, fan | Grandstands: grandstand | Celebrations: celebration, champagne | Sunsets: sunset
## Cars & Tech @F1Technical @formula1
- Aero & wings @F1Technical @formula1 ~ wing, aero, floor, diffuser, sidepod
  Front wings: front wing | Rear wings: rear wing, drs | Floors: floor | Sidepods: sidepod | Diffusers: diffuser
- Power units @F1Technical @formula1 ~ engine, power unit, hybrid, ers
  Engines: engine | Power units: power unit | Exhausts: exhaust | Batteries: battery, ers | Fuel: fuel
- 2026 regulations @F1Technical @formula1 ~ 2026, regulations, new rules, active aero
  Active aero: active aero | 2026 cars: 2026 car | Concepts: concept | Renders: render | Rules: rule, regulation
- Launches & liveries @formula1 @F1Porn ~ launch, livery, unveil, reveal
  Liveries: livery | Launches: launch | Special liveries: special livery, one-off | Testing: testing, test | Show cars: show car
## Games, Sim & Memes @F1Game @simracing @formuladank
- F1 game @!F1Game ~ f1 25, career, my team
  Liveries: livery | My Team: my team | Careers: career | Crashes: crash | Setups: setup
- Sim racing rigs @simracing ~ f1, formula, wheel, rig, cockpit
  Rigs: rig | Wheels: wheel | Pedals: pedal | Cockpits: cockpit | Triple screens: triple
- Memes @!formuladank ~ meme
  Max memes: max, verstappen | Ferrari memes: ferrari | Stroll: stroll | Hamilton memes: hamilton | Strategy memes: strategy
- Models & merch @formula1 @F1Porn ~ model, diecast, die-cast, merch, lego, cap
  Models: model | Die-casts: diecast, die-cast | LEGO: lego | Caps: cap | Helmets: helmet

# Counter-Strike 2 {cs2} > gaming, pc-building, desk-setups @GlobalOffensive @cs2
## Skins @GlobalOffensive @cs2
- Knife skins @GlobalOffensive @cs2 ~ knife, karambit, butterfly, bayonet, m9
  Karambits: karambit | Butterflies: butterfly | M9s: m9 | Talons: talon | Dopplers: doppler
- Gloves @GlobalOffensive @cs2 ~ glove
  Sport gloves: sport glove | Driver gloves: driver glove | Moto gloves: moto | Specialist gloves: specialist | Hand wraps: hand wrap
- Rifle skins @GlobalOffensive @cs2 ~ ak, ak-47, m4, awp, skin
  AK-47s: ak, ak-47 | AWPs: awp | M4s: m4a4, m4a1, m4 | Deagles: deagle | Crafts: craft
- Cases & unboxings @GlobalOffensive @cs2 ~ case, unbox, opening, drop, pulled
  Knife pulls: knife | Case openings: case | Souvenirs: souvenir | Rare patterns: pattern, blue gem | Stickers: sticker
## Maps @GlobalOffensive @cs2 @csmapmakers
- Map callouts @GlobalOffensive @cs2 ~ map, callout, mirage, inferno, dust2, nuke, ancient, anubis, train
  Mirage: mirage | Inferno: inferno | Dust2: dust2, dust 2 | Nuke: nuke | Ancient: ancient
- Smokes & lineups @GlobalOffensive @cs2 ~ smoke, lineup, molly, flash, nade
  Smokes: smoke | Mollies: molly, molotov | Flashes: flash | One-ways: one way, one-way | Executes: execute
- Community maps @!csmapmakers @GlobalOffensive ~ workshop, custom map
  Workshop maps: workshop | Remakes: remake | Aim maps: aim | Surf: surf | Lighting: lighting
- Map updates @GlobalOffensive @cs2 ~ update, new map, rework, changes
  Reworks: rework | New maps: new map | Updates: update | Map pool: map pool | Bugs: bug
## Pro Scene @GlobalOffensive @cs2
- Majors @GlobalOffensive @cs2 ~ major, austin, budapest, cologne
  Majors: major | Trophies: trophy | Sticker capsules: sticker | Crowds: crowd, stage | MVPs: mvp
- Teams @GlobalOffensive @cs2 ~ vitality, navi, faze, spirit, mouz, g2, falcons
  Vitality: vitality | NAVI: navi | Spirit: spirit | MOUZ: mouz | FaZe: faze
- Players @GlobalOffensive @cs2 ~ zywoo, donk, s1mple, m0nesy, niko, ropz
  ZywOo: zywoo | donk: donk | s1mple: s1mple | m0NESY: m0nesy | ropz: ropz
- Rankings & stats @GlobalOffensive @cs2 ~ hltv, rating, stats, ranking
  Rankings: ranking | Ratings: rating | Stats: stat | Top 20: top 20 | Records: record
## Setups & Settings @GlobalOffensive @cs2
- Crosshairs @GlobalOffensive @cs2 ~ crosshair
  Dot crosshairs: dot | Classic: classic | Pro crosshairs: pro | Codes: code | Colors: color, green, cyan
- Gaming setups @GlobalOffensive @cs2 ~ setup, desk, battlestation
  Setups: setup | Monitors: monitor, 360hz, 540hz | Mice: mouse, mice | Mousepads: mousepad, pad | Keyboards: keyboard
- Graphics & resolution @GlobalOffensive @cs2 ~ resolution, stretched, 4:3, graphics, settings
  Stretched: stretched | 4:3: 4:3 | Native: native, 16:9 | Graphics: graphics | FPS: fps
- Premier & ranks @GlobalOffensive @cs2 ~ premier, rank, elo, faceit, rating
  Premier: premier | FACEIT: faceit | Ranks: rank | Level 10: level 10 | Milestones: milestone, finally
## Moments & Memes @GlobalOffensive @cs2
- Aces & clutches @GlobalOffensive @cs2 ~ ace, clutch, 1v5, 1v4
  Aces: ace | Clutches: clutch | 1v5s: 1v5 | 1v4s: 1v4 | Collaterals: collateral
- Bugs & glitches @GlobalOffensive @cs2 ~ bug, glitch, broken, subtick
  Bugs: bug | Glitches: glitch | Subtick: subtick | Hitboxes: hitbox | Lag: lag
- Memes @GlobalOffensive @cs2 ~ meme, valve, when
  Valve memes: valve | Cheaters: cheater, hacker | Teammates: teammate | Russians: russian | Silver: silver
- Fan art @GlobalOffensive @cs2 ~ art, fan art, drawing, render, wallpaper
  Fan art: fan art | Drawings: drawing | Renders: render | Wallpapers: wallpaper | Cosplay: cosplay

# Grand Theft Auto {gta} > gaming, cars, collectibles-toys @GTA6 @GTA @gtaonline @GTAV
## GTA 6 @GTA6 @GTA
- Trailers & screenshots @GTA6 @GTA ~ trailer, screenshot, leak
  Trailer 1: trailer 1 | Trailer 2: trailer 2 | Screenshots: screenshot | Leaks: leak | Comparisons: comparison
- Leonida map @GTA6 ~ map, leonida, vice city, mapping
  Map: map | Vice City: vice city | Keys: keys | Port Gellhorn: port gellhorn | Ambrosia: ambrosia
- Characters @GTA6 ~ lucia, jason, character
  Lucia: lucia | Jason: jason | NPCs: npc | Outfits: outfit | Fan art: fan art, art
- Release & hype @GTA6 @GTA ~ release, delay, preorder, pre-order, countdown, 2026
  Release date: release | Delays: delay | Pre-orders: preorder, pre-order | Countdown: countdown | Memes: meme
## GTA Online @gtaonline @gtavcustoms
- Cars & customs @gtaonline @gtavcustoms ~ car, custom, build, livery
  Supercars: super | Muscle cars: muscle | JDM: jdm | Liveries: livery | Lowriders: lowrider
- Properties & businesses @gtaonline ~ property, business, office, nightclub, agency, garage
  Garages: garage | Nightclubs: nightclub | Offices: office | Bunkers: bunker | Agencies: agency
- Outfits @gtaonline ~ outfit, fit, drip, clothing
  Outfits: outfit | Tryhards: tryhard | Female fits: female | Masks: mask | Crew colors: crew
- Heists & money @gtaonline ~ heist, cayo, money, grind, payout
  Cayo Perico: cayo | Heists: heist | Payouts: payout | Money: money, million | Grinding: grind
## Story Mode & Classics @GTAV @GTA @GTAIV @vicecity @sanandreas
- GTA V story @GTAV @GTA ~ trevor, michael, franklin, story
  Trevor: trevor | Michael: michael | Franklin: franklin | Missions: mission | Easter eggs: easter egg
- GTA IV @!GTAIV @GTA ~ gta iv, gta 4, liberty city
  Niko: niko | Liberty City: liberty city | Roman: roman | Cars: car | Graphics: graphics, mod
- San Andreas & Vice City @!sanandreas @!vicecity @GTA ~ san andreas, vice city
  CJ: cj | Grove Street: grove | Tommy: tommy | Definitive Edition: definitive | Nostalgia: nostalgia, childhood
- Remasters & mods @GTA @GTAV ~ mod, remaster, reshade, naturalvision
  Graphics mods: graphics, reshade, naturalvision | Remasters: remaster | Car mods: car mod | Map mods: map | Comparisons: comparison
## Photography & Views @GTAV @gtaonline @GTA
- Snapmatic photography @GTAV @gtaonline ~ snapmatic, photo, photography, screenshot
  Sunsets: sunset | Night shots: night | Rain: rain | Portraits: portrait | Cinematic: cinematic
- Los Santos views @GTAV @gtaonline @GTA ~ los santos, city, view, skyline
  Skylines: skyline | Beaches: beach | Mount Chiliad: chiliad, mountain | Downtown: downtown | Vinewood: vinewood
- Car photography @gtaonline @gtavcustoms ~ car photo, car shoot, car meet, meet
  Car meets: meet | Rollers: roller | Drifts: drift | Garage shots: garage | Night drives: night
- Wallpapers & art @GTA @GTA6 ~ wallpaper, art, fan art, poster, loading screen
  Wallpapers: wallpaper | Fan art: fan art | Posters: poster | Loading screens: loading screen | Pixel art: pixel
## Memes & Collections @GTA @gtaonline @GTA6
- Memes @GTA @gtaonline @GTA6 ~ meme, when, me
  GTA 6 wait: gta 6, gta vi | Griefers: griefer, oppressor | NPCs: npc | Cops: cop, police, wanted | Lester: lester
- Glitches @GTA @gtaonline @GTAV ~ glitch, bug
  Glitches: glitch | Bugs: bug | Physics: physics | Floating: floating | Clipping: clip
- Collections & merch @GTA @GTA6 ~ collection, merch, poster, steelbook, physical
  Collections: collection | Steelbooks: steelbook | Maps: map | Merch: merch | Posters: poster
- Gaming setups @GTA @GTA6 ~ setup, ps5, xbox, pc, monitor
  PS5: ps5 | Xbox: xbox | PC: pc | TV setups: tv | Controllers: controller

# ASMR & Satisfying {asmr} > makeup-nails, mechanical-keyboards, interior-design @oddlysatisfying @PowerWashingPorn
## Restorations & Detailing @RestorationPorn @AutoDetailing @oddlysatisfying
- Tool restorations @RestorationPorn @oddlysatisfying ~ restoration, restored, tool, rust
  Axes: axe | Knives: knife | Hand planes: plane | Wrenches: wrench | Vises: vise
- Furniture refinishing @RestorationPorn @oddlysatisfying ~ refinish, furniture, table, dresser, chair
  Tables: table | Dressers: dresser | Chairs: chair | Stripping: strip | Staining: stain
- Car detailing @AutoDetailing @PowerWashingPorn ~ detail, detailing, paint correction, ceramic, foam
  Paint correction: paint correction | Ceramic coatings: ceramic | Foam baths: foam | Interiors: interior | Headlights: headlight
- Shoe cleaning @RestorationPorn @oddlysatisfying ~ shoe, sneaker, boot
  Sneakers: sneaker | Boots: boot | Leather: leather | Soles: sole | Laces: lace
## Oddly Satisfying @oddlysatisfying @mildlysatisfying
- Perfect fits @oddlysatisfying @mildlysatisfying ~ fit, perfectly, fits
  Perfect fits: perfect fit, fits perfectly | Alignment: align | Symmetry: symmetry, symmetrical | Patterns: pattern | Stacks: stack
- Cleaning & restoration @PowerWashingPorn @oddlysatisfying ~ clean, cleaning, wash, before and after, restored
  Pressure washing: pressure wash, power wash | Before & after: before and after, before & after | Rust: rust | Deep cleans: deep clean | Rugs: carpet, rug
- Cutting & crushing @oddlysatisfying @mildlysatisfying ~ cut, cutting, slice, crush, peel
  Soap: soap | Peels: peel | Slices: slice | Crushing: crush | Sand: sand
- Sorting & order @oddlysatisfying @mildlysatisfying ~ sorted, organized, organised, rainbow, collection
  Organized: organized, organised | Sorted: sorted | Rainbows: rainbow | Gradients: gradient | Rows: row
## Slime & Sensory Play @Slime @fidgettoys @oddlysatisfying
- Slime @!Slime ~ slime
  Butter slime: butter | Clear slime: clear | Glossy slime: glossy | Cloud slime: cloud | Crunchy slime: crunchy, floam
- Kinetic sand @oddlysatisfying @mildlysatisfying ~ kinetic sand, sand
  Cuts: cut | Colors: color, colour | Sculptures: sculpt | Trays: tray | Sets: set
- Fidget toys @!fidgettoys ~ fidget
  Spinners: spinner | Clickers: click | Pop-its: pop it | Sliders: slider | Collections: collection
- Squishies @fidgettoys @oddlysatisfying ~ squishy, squish
  Slow rise: slow rise | Food squishies: food | Animal squishies: animal | Handmade: handmade | Hauls: haul
## Keyboard & Sound Gear @MechanicalKeyboards @headphones @audiophile
- Thocky keyboards @MechanicalKeyboards ~ thock, thocky, creamy, keyboard sound
  Thock: thock | Creamy: creamy | Clacky: clack | Sound tests: sound test | Switches: switch
- Headphones for ASMR @headphones @audiophile ~ asmr, sleep, comfort, earbud
  Sleep buds: sleep | Comfort: comfort | Earbuds: earbud | Over-ears: over-ear, over ear | Open backs: open back
- Microphones @audiophile @headphones ~ microphone, mic, condenser, xlr
  Condensers: condenser | XLR: xlr | USB mics: usb | Interfaces: interface | Arms: arm
- Desk audio @audiophile @headphones ~ dac, amp, desk, setup
  DACs: dac | Amps: amp | Desk setups: desk | Stands: stand | Cables: cable
## Cozy & Ambience @CozyPlaces @oddlysatisfying
- Rain & window views @CozyPlaces @oddlysatisfying ~ rain, window, storm
  Rainy windows: window | Thunderstorms: storm, thunder | Fog: fog | Snow: snow | Night: night
- Candles & fireplaces @CozyPlaces @oddlysatisfying ~ candle, fireplace, fire
  Candles: candle | Fireplaces: fireplace | Wood stoves: stove | Lanterns: lantern | Fairy lights: fairy light
- Reading nooks @CozyPlaces ~ reading, book, nook
  Nooks: nook | Bookshelves: bookshelf, bookshelves | Window seats: window seat | Armchairs: armchair, chair | Blankets: blanket
- Tea & slow mornings @CozyPlaces @oddlysatisfying ~ tea, coffee, morning, breakfast
  Tea: tea | Coffee: coffee | Mornings: morning | Breakfasts: breakfast | Mugs: mug

# Spaceflight {spaceflight} > astronomy, aviation, starship @spaceflight @nasa @RocketLab @BlueOrigin @ula
## Launches @spaceflight @nasa @RocketLab @BlueOrigin @ula
- Launch photos @spaceflight @nasa ~ launch, liftoff, lift off
  Liftoffs: liftoff, lift off | Night launches: night | Plumes: plume, exhaust | Long exposures: long exposure, streak | Pad shots: pad
- Launch viewing @spaceflight @nasa ~ watched, viewing, view from, cape canaveral, vandenberg
  Viewing spots: view, watched | Schedules: schedule | Cape Canaveral: cape, canaveral, kennedy | Vandenberg: vandenberg | Jellyfish: jellyfish
- Landings & recovery @spaceflight @BlueOrigin @RocketLab ~ landing, booster, recovery, droneship, catch
  Booster landings: landing | Droneships: droneship | Recovery: recovery | Fairings: fairing | Sonic booms: sonic boom
- Failures & scrubs @spaceflight @nasa ~ anomaly, failure, explosion, rud, scrub
  Anomalies: anomaly | Explosions: explosion, rud | Scrubs: scrub | Debris: debris | Investigations: investigation
## Rockets & Companies @RocketLab @BlueOrigin @ula @isro @ChinaSpaceflight
- Rocket Lab @!RocketLab ~ rocket lab, electron, neutron
  Electron: electron | Neutron: neutron | Launches: launch | Factories: factory | Spacecraft: photon, spacecraft
- Blue Origin @!BlueOrigin ~ blue origin, new glenn, new shepard
  New Glenn: new glenn | New Shepard: new shepard | Blue Moon: blue moon | BE-4: be-4, engine | Landings: landing
- ULA & Vulcan @!ula ~ ula, vulcan, atlas
  Vulcan: vulcan | Atlas V: atlas | Kuiper: kuiper | Centaur: centaur | Launches: launch
- ISRO & global launchers @isro @ChinaSpaceflight @spaceflight ~ isro, pslv, gslv, lvm3, gaganyaan, long march, ariane
  ISRO: isro, pslv, gslv, lvm3 | Gaganyaan: gaganyaan | Long March: long march | Ariane 6: ariane | Chandrayaan: chandrayaan
## Missions & Crew @nasa @spaceflight
- Artemis @nasa @spaceflight ~ artemis, sls, orion
  Artemis II: artemis ii, artemis 2 | SLS: sls | Orion: orion | Crews: crew, astronaut | Moon: moon
- Crewed flights @nasa @spaceflight ~ crew, astronaut, dragon, soyuz, starliner
  Crew Dragon: crew dragon, dragon | Starliner: starliner | Soyuz: soyuz | Astronauts: astronaut | Splashdowns: splashdown
- Space stations @nasa @spaceflight ~ iss, tiangong, space station, spacewalk
  ISS: iss | Tiangong: tiangong | Spacewalks: spacewalk, eva | Cupola: cupola | Dockings: docking, dock
- Probes & landers @nasa @spaceflight ~ probe, lander, rover, mars, moon landing
  Mars rovers: rover, perseverance | Moon landers: lander | Europa Clipper: europa | Probes: probe | Sample returns: sample
## Amateur Rocketry @rocketry @HighPowerRocketry
- Model rockets @rocketry ~ model rocket, estes, build
  Estes: estes | Builds: build | First flights: first | Kits: kit | Parachutes: recovery, parachute
- High power rocketry @HighPowerRocketry @rocketry ~ high power, l1, l2, l3, certification
  L1: l1 | L2: l2 | L3: l3 | Motors: motor | Launch days: launch
- Motors & engines @rocketry @HighPowerRocketry ~ motor, engine, static fire, test
  Static fires: static fire | Solid motors: solid | Liquid engines: liquid | Hybrids: hybrid | Test stands: test stand
- Avionics @rocketry @HighPowerRocketry ~ avionics, flight computer, altimeter, telemetry
  Avionics bays: avionics | Flight computers: flight computer | Altimeters: altimeter | Parachutes: parachute | Telemetry: telemetry
## Space Photography & Art @spaceflight @nasa
- Rocket photography @spaceflight @nasa ~ photo, shot, captured, photographed
  Close-ups: close | Remote cameras: remote | Silhouettes: silhouette | Moon transits: moon | Panoramas: panorama
- Earth from orbit @nasa @spaceflight ~ earth, orbit, from space
  Earth: earth | Auroras: aurora | Night side: night | Cities: city | Storms: hurricane, storm
- Patches & posters @nasa @spaceflight ~ patch, poster, art, render
  Patches: patch | Posters: poster | Renders: render | Concept art: concept | Infographics: infographic, chart
- Models & collectibles @spaceflight @rocketry ~ model, lego, scale
  LEGO: lego | Scale models: scale | 3D prints: 3d print, printed | Desk models: desk | Saturn V: saturn v

# Starship {starship} > spaceflight, astronomy, aviation @SpaceXLounge @spacex @SpaceXMasterrace
## Flight Tests @spacex @SpaceXLounge
- Integrated flight tests @spacex @SpaceXLounge ~ flight, ift, test flight, flight 10, flight 11, flight 12
  Flight 10: flight 10 | Flight 11: flight 11 | Flight 12: flight 12 | Liftoffs: liftoff, launch | Reentries: reentry, re-entry, plasma
- Booster catches @spacex @SpaceXLounge ~ catch, chopsticks, mechazilla, booster
  Catches: catch | Chopsticks: chopstick | Mechazilla: mechazilla | Boosters: booster | Splashdowns: splashdown
- Ship reentry @spacex @SpaceXLounge ~ ship, reentry, heat shield, tiles, flaps
  Reentries: reentry | Splashdowns: splashdown | Heat shields: heat shield | Tiles: tile | Flaps: flap
- Anomalies & RUDs @spacex @SpaceXLounge ~ rud, anomaly, explosion, mishap
  RUDs: rud | Explosions: explosion | Anomalies: anomaly | Debris: debris | Mishaps: mishap
## Hardware @spacex @SpaceXLounge
- Raptor engines @spacex @SpaceXLounge ~ raptor
  Raptor 3: raptor 3 | Raptor 2: raptor 2 | Static fires: static fire | Engine bays: engine | Plumbing: plumbing
- Booster & ship builds @spacex @SpaceXLounge ~ booster, ship, v3, block 3, b18, s39
  V3: v3, block 3 | Boosters: booster | Ships: ship | Hot staging: hot staging | Grid fins: grid fin
- Towers & pads @spacex @SpaceXLounge ~ tower, pad, olm, launch mount
  Towers: tower | Pad 2: pad 2, pad b | OLM: olm | Florida pads: 39a, slc-37, florida | Deluge: deluge
- Testing & cryo @spacex @SpaceXLounge ~ cryo, static fire, test stand, massey, rollout
  Cryo tests: cryo | Static fires: static fire | Massey's: massey | Rollouts: rollout | Test stands: test stand
## Starbase @spacex @SpaceXLounge
- Starbase city @spacex @SpaceXLounge ~ starbase, boca chica
  Starbase: starbase | Boca Chica: boca chica | Mega Bays: mega bay, megabay | Highway 4: highway | Sanchez site: sanchez
- Starfactory & production @spacex @SpaceXLounge ~ starfactory, gigabay, factory, production
  Starfactory: starfactory | Gigabay: gigabay | Production: production | Stacking: stack | Welding: weld
- Florida expansion @spacex @SpaceXLounge ~ florida, 39a, slc-37, cape
  LC-39A: 39a | SLC-37: slc-37, slc 37 | Cape: cape | Roberts Road: roberts road | Florida Gigabay: gigabay
- Starbase photography @spacex @SpaceXLounge ~ photo, sunset, sunrise, aerial, night
  Night shots: night | Sunsets: sunset, sunrise | Aerials: aerial, drone | Long exposures: long exposure | Wide shots: wide
## Missions & Mars @SpaceXLounge @spacex
- Mars plans @SpaceXLounge @spacex ~ mars
  Mars: mars | Launch windows: window | Mars cities: city | Optimus: optimus | Landing sites: landing site
- HLS & Artemis @SpaceXLounge @spacex ~ hls, moon, artemis, lunar
  HLS: hls | Moon: moon | Artemis: artemis | Lunar: lunar | Elevators: elevator
- Propellant transfer @SpaceXLounge @spacex ~ propellant, refuel, depot, transfer, tanker
  Transfers: transfer | Depots: depot | Tankers: tanker | Refueling: refuel | Docking: dock
- Starlink V3 @SpaceXLounge @spacex ~ starlink, pez
  Starlink V3: starlink | Pez dispensers: pez | Deploys: deploy | Dummies: dummy | Satellites: satellite
## Fan Art & Memes @SpaceXMasterrace @SpaceXLounge
- Memes @!SpaceXMasterrace ~ meme
  Elon memes: elon | Catch memes: catch | RUD memes: rud | FAA memes: faa | Tim Dodd: tim dodd, everyday astronaut
- Renders & concepts @SpaceXLounge @spacex ~ render, concept, art, cgi
  Renders: render | Concepts: concept | Fan art: fan art | Blender: blender | KSP: ksp, kerbal
- Models & 3D prints @SpaceXLounge @spacex ~ model, 3d print, lego, printed
  3D prints: 3d print, printed | LEGO: lego | Scale models: scale | Desk models: desk | Kits: kit
- Charts & comparisons @SpaceXLounge @spacex ~ chart, graph, infographic, comparison, stats
  Charts: chart, graph | Comparisons: comparison | Infographics: infographic | Timelines: timeline | Size: size

# AI Models {llm} > pc-building, home-lab, digital-art @LocalLLaMA @singularity @OpenAI @ClaudeAI @ChatGPT
## Model Releases @LocalLLaMA @singularity @OpenAI
- Frontier releases @singularity @OpenAI @LocalLLaMA ~ release, released, launch, announced, new model
  OpenAI: openai, gpt | Anthropic: anthropic, claude | Google: google, gemini | xAI: xai, grok | Meta: meta, llama
- Benchmarks @singularity @LocalLLaMA ~ benchmark, leaderboard, arena, swe-bench, arc-agi, score
  Leaderboards: leaderboard, arena | SWE-bench: swe-bench, swe bench | ARC-AGI: arc-agi, arc agi | Humanity's Last Exam: humanity's last exam, hle | Charts: chart
- Open-weight models @LocalLLaMA @LocalLLM ~ qwen, deepseek, kimi, glm, mistral, gemma, gpt-oss
  Qwen: qwen | DeepSeek: deepseek | Kimi: kimi | GLM: glm | Gemma: gemma
- Pricing & limits @OpenAI @ClaudeAI @singularity ~ pricing, price, rate limit, usage limit, plan, subscription
  Pricing: pricing, price | Limits: limit | Plans: plan | Tokens: token | Free tiers: free
## Local AI Rigs @LocalLLaMA @LocalLLM
- GPU rigs @LocalLLaMA @LocalLLM ~ rig, build, gpu, 3090, 4090, 5090
  3090s: 3090 | 5090s: 5090 | Multi-GPU: multi-gpu, gpus | Servers: server | Budget rigs: budget
- Macs & unified memory @LocalLLaMA @LocalLLM ~ mac, m3 ultra, m4, mac studio, unified memory
  Mac Studio: mac studio | M3 Ultra: m3 ultra | M4 Max: m4 max | MacBooks: macbook | Clusters: cluster
- AI mini PCs @LocalLLaMA @LocalLLM ~ dgx spark, strix halo, ai max, mini pc, framework
  DGX Spark: dgx spark, spark | Strix Halo: strix halo, ai max | Framework: framework | Mini PCs: mini pc | Jetson: jetson
- Speeds & quants @LocalLLaMA @LocalLLM ~ tok/s, tokens per second, t/s, speed, benchmark
  Speeds: tok/s, t/s, tokens per second | Quants: quant, gguf | Context: context | VRAM: vram | llama.cpp: llama.cpp
## Chat & Agents @ChatGPT @ClaudeAI @OpenAI @GeminiAI
- Funny conversations @ChatGPT @ClaudeAI @GeminiAI ~ asked, told, said, conversation
  Refusals: refuse, refused | Hallucinations: hallucination | Jokes: joke | Roasts: roast | Arguments: argue, argument
- Coding agents @ClaudeAI @OpenAI @ChatGPT ~ claude code, codex, cursor, agent, vibe coding, coding
  Claude Code: claude code | Codex: codex | Cursor: cursor | Vibe coding: vibe coding | Agents: agent
- Image generation @ChatGPT @GeminiAI @OpenAI ~ image, generated, gpt image, nano banana, imagen
  Nano Banana: nano banana | GPT Image: gpt image, gpt-image | Midjourney: midjourney | Sora: sora | Veo: veo
- Apps & features @ChatGPT @ClaudeAI @GeminiAI ~ app, voice, update, feature, ui
  Voice mode: voice | New features: feature | UI: ui, interface | Memory: memory | Apps: app
## Image & Video Generation @StableDiffusion @midjourney @singularity
- Stable Diffusion & Flux @!StableDiffusion ~ stable diffusion, flux, comfyui
  Flux: flux | SDXL: sdxl | ComfyUI: comfyui, comfy | LoRAs: lora | Wan: wan
- Midjourney @!midjourney ~ midjourney
  V7: v7 | Portraits: portrait | Landscapes: landscape | Sci-fi: sci-fi, scifi | Architecture: architecture
- AI video @StableDiffusion @singularity ~ video, sora, veo, kling, wan
  Sora: sora | Veo: veo | Kling: kling | Wan video: wan | Runway: runway
- Model comparisons @StableDiffusion @midjourney ~ comparison, vs, side by side, same prompt
  Same prompt: same prompt | Model vs model: vs | Side by side: side by side | Before & after: before | Upscales: upscale
## AI News & Memes @singularity @OpenAI @ChatGPT
- AGI & timelines @singularity ~ agi, asi, timeline, singularity
  AGI: agi | ASI: asi | Timelines: timeline | Predictions: prediction, predict | Exponentials: exponential
- Company drama @singularity @OpenAI ~ altman, amodei, musk, zuckerberg, openai, anthropic, xai
  Altman: altman, sam | Amodei: amodei, dario | Musk: musk, elon | Zuckerberg: zuck, zuckerberg | Hassabis: hassabis, demis
- Memes @singularity @ChatGPT @OpenAI ~ meme, when, me
  OpenAI memes: openai | Claude memes: claude | Gemini memes: gemini | Grok memes: grok | Job memes: job
- Data centers & compute @singularity @OpenAI ~ data center, datacenter, stargate, compute, colossus, gpu
  Stargate: stargate | Colossus: colossus | Data centers: data center, datacenter | Nvidia chips: h100, b200, gb200, gb300 | Power plants: power, nuclear
`;

export default source;
