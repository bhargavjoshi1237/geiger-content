// Tech & gaming topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# PC Building {pc-building} > gaming, desk-setups, mechanical-keyboards, home-lab, electronics-diy @buildapc @pcmasterrace @gamingpc
## Cooling @buildapc @pcmasterrace @watercooling
- Air coolers @buildapc @pcmasterrace ~ air cooler, noctua, tower cooler, peerless assassin, phantom spirit, dark rock, cpu cooler
  Noctua builds: noctua, chromax, nh-d15 | Budget towers: peerless assassin, phantom spirit, thermalright, budget | Dual towers: dual tower, nh-d15, dark rock pro, fc140 | Low profile: low profile, nh-l9, nh-l12 | Fan upgrades: fans, fan swap, arctic p12, reverse fans
- AIO liquid coolers @buildapc @pcmasterrace ~ aio, 360mm, 280mm, liquid cooler, lcd cooler, kraken
  360 AIOs: 360, 360mm | Screen AIOs: lcd, screen, display, ryujin | Mounting: front mount, top mount, orientation, radiator placement | Pump issues: pump, noise, gurgling, rattle | AIO builds: build, setup, finished, done
- Custom loops @!watercooling @pcmasterrace ~ custom loop, watercooled, water cooled, water cooling, loop
  First loops: first loop, first custom, first time, first build | Budget loops: budget, cheap, affordable, barrowch, bykski | High-end loops: ekwb, optimus, heatkiller, dual loop, alphacool | Leaks & fails: leak, fail, disaster, oops, dead | Finished loops: flair=build complete, finished, complete, done
- Hardline & exotic cooling @!watercooling @pcmods ~ hardline, hardtube, hard tube, distro plate, chiller, external rad, mora
  Tube bending: hardline, hardtube, bend, bending | Distro plates: distro, distribution plate, distroplate | External radiators: mora, external rad, external radiator | Sub-ambient: chiller, sub ambient, phase change | Coolant colors: coolant, pastel, dye, color
## Cases & Aesthetics @buildapc @pcmasterrace @sffpc @pcmods
- Mid-tower builds @buildapc @pcmasterrace ~ build, case, rig
  White builds: white build, all white, white | Black builds: black build, blacked out, stealth | RGB builds: rgb, argb | Fishtank cases: o11, lancool, fishtank, hyte, y70 | First PCs: first pc, first build, my first
- Small form factor @!sffpc ~ sff, itx, mini itx, small form factor
  Tiny builds: tiny, smallest, liter, 5l, 10l | Gaming SFF: 4090, 5090, 9070, gaming | Custom SFF cases: custom, 3d printed, prototype | Thermals: temps, thermal, airflow | Living-room PCs: htpc, console, living room
- Themed builds @pcmods @pcmasterrace ~ themed, theme, custom, mod
  Anime themes: anime, waifu, miku | Game themes: halo, zelda, cyberpunk, fallout | Retro styled: retro, vintage, wood | Painted cases: paint, painted, airbrush | Art pieces: art, sculpture, diorama
- Case mods & scratch builds @!pcmods ~ case mod, scratch build, custom case, mod, modding
  Scratch builds: scratch, scratch build, from scratch | Wall-mounted: wall, wall mount, wall mounted | Desk PCs: desk pc, desk build, table | Sleeved cables: sleeved, sleeving, cablemod, cables | Lighting mods: led, lighting, light, glow
## GPUs & Performance @nvidia @amd @radeon @buildapc @overclocking
- GPU unboxings @nvidia @radeon @pcmasterrace ~ rtx, 5090, 5080, 5070, 9070, 9070 xt, gpu
  Flagship cards: 5090, 4090, flagship | Midrange cards: 5070, 9060, 5060, 9070 | Unboxings: unboxing, arrived, finally, got | Sag & mounting: sag, vertical mount, riser, support | Upgrade day: upgrade, upgraded, from, to
- Benchmarks & tuning @overclocking @nvidia @amd ~ undervolt, overclock, benchmark, oc, timespy, cinebench
  Undervolting: undervolt, undervolting, curve | CPU overclocks: cpu, 9800x3d, 7800x3d, pbo | Memory tuning: ram, memory, timings, ddr5 | Benchmark scores: timespy, cinebench, score, 3dmark | Temperatures: temps, hotspot, thermal
- Repairs & melted cables @buildapc @pcmasterrace @techsupport ~ melted, burnt, repair, fix, broke, damaged
  Melted connectors: melted, 12vhpwr, connector | Burnt parts: burnt, burned, smoke, fried | Bent pins: bent pins, pins, socket | Repasting: repaste, thermal paste, paste | Rescued PCs: fixed, saved, rescued
- Workstations & servers @homelab @buildapc ~ workstation, threadripper, xeon, epyc, render
  AI rigs: ai, llm, local llm, inference | Render boxes: render, blender, 3d | Multi-GPU: dual gpu, multi gpu, 2x, 4x | Threadripper builds: threadripper, epyc, xeon | Quiet builds: silent, quiet, fanless
## Peripherals & Battlestations @battlestations @pcmasterrace @monitors
- Monitors @monitors @pcmasterrace ~ monitor, oled, ultrawide, 4k, 240hz, 360hz
  OLED monitors: oled, qd-oled, woled | Ultrawides: ultrawide, 34, 49, superwide | High refresh: 240hz, 360hz, 480hz, 500hz | Dual setups: dual, triple, multi monitor | Burn-in & issues: burn, dead pixel, flicker
- Mice & mousepads @MouseReview @pcmasterrace ~ mouse, mice, mousepad, deskmat
  Lightweight mice: lightweight, superlight, ultralight | Glass pads: glass, glass pad | Collections: collection, all my, lineup | Mods: mod, modded, shell | Grips & hands: grip, claw, palm, fingertip
- Battlestation glow-ups @battlestations @pcmasterrace ~ setup, battlestation, desk, station
  Before & after: before, after, glow up, progress | Minimal setups: minimal, clean, simple | Dark setups: dark, night, black | Cozy setups: cozy, warm, plants | Dream setups: dream, endgame, final
- Sim rigs @simracing @hotas ~ sim rig, cockpit, wheel, pedals, simrig, hotas
  Racing cockpits: cockpit, rig, simrig, sim rig | Direct drive: direct drive, dd, moza, fanatec, simucube | Flight sims: hotas, flight sim, msfs, dcs | Triple screens: triple, triples, vr | Budget rigs: budget, cheap, diy
## Builds & Help @buildapc @buildapcforme @pcmasterrace
- First build journeys @buildapc @pcmasterrace ~ first build, first pc, first time
  Part hauls: parts, haul, arrived, all the parts | Build day: build day, assembled, finally | It works: posted, boots, works, it lives | Rate my build: rate, thoughts, opinions | Parents & kids: son, daughter, dad, kid
- Budget builds @buildapc @lowendgaming @pcmasterrace ~ budget, cheap, $500, $700, under
  Used parts: used, marketplace, secondhand, ebay | Office PC flips: optiplex, office pc, sleeper | Sub-$500 rigs: $400, $500, 500 | Upgrades over time: upgrade, upgraded, slowly | Free finds: free, found, dumpster, curb
- Sleeper PCs @sleeperpc @pcmasterrace ~ sleeper, retro case, old case, vintage case
  Retro shells: retro, vintage, 90s, beige | Mac sleepers: g5, power mac, imac, mac pro | Laptop sleepers: laptop, thinkpad | Console sleepers: xbox, playstation, n64 | Appliance sleepers: microwave, toaster, radio
- Upgrade paths @buildapc @pcmasterrace ~ upgrade, upgraded, from, to
  CPU swaps: cpu upgrade, 9800x3d, 7800x3d | GPU swaps: gpu upgrade, new gpu | Storage upgrades: ssd, nvme, storage | Full refreshes: rebuild, full upgrade, new build | Then vs now: then, now, years, evolution

# Video Games {gaming} > pc-building, retro-gaming, anime-manga, collectibles-toys, desk-setups @gaming @Games @pcgaming
## Screenshots & Worlds @gaming @pcgaming @Gamingcirclejerk
- Beautiful screenshots @pcgaming @gaming ~ screenshot, graphics, beautiful, view, scenery
  Landscapes: landscape, sunset, scenery, view | Photo mode: photo mode, photomode | Ray tracing: ray tracing, path tracing, rtx | Night scenes: night, rain, neon | Comparisons: comparison, vs, then and now
- Open worlds @eldenring @Witcher3 @skyrim ~ open world, map, explore, exploring
  Elden Ring: elden ring, erdtree, nightreign | Skyrim: skyrim, modded skyrim | Zelda: zelda, hyrule, tears of the kingdom | Witcher: witcher, geralt | Hidden spots: secret, hidden, found
- Builds & bases @Minecraft @NoMansSkyTheGame @Palworld ~ base, build, built, house, city
  Minecraft builds: minecraft, survival, castle | Space bases: base, outpost, planet | City builders: city, cities skylines, town | Cozy bases: cozy, cottage, farm | Megabuilds: huge, mega, massive
- Photo mode art @VirtualPhotographers @gaming ~ photo mode, virtual photography, vp, shot
  Portraits: portrait, character | Cinematic shots: cinematic, film, movie | Black and white: black and white, monochrome, b&w | Action shots: action, fight, combat | Wallpapers: wallpaper, 4k
## Consoles & Handhelds @SteamDeck @NintendoSwitch @PS5 @XboxSeriesX
- Steam Deck @!SteamDeck ~ steam deck, deck, oled
  Setups & docks: dock, setup, docked | Cases & skins: case, skin, shell | Mods: mod, modded, ssd upgrade | Games on Deck: playing, running, works | Travel gaming: travel, plane, flight, trip
- Nintendo Switch @!NintendoSwitch @Switch ~ switch, switch 2, nintendo
  Switch 2: switch 2 | Collections: collection, physical, carts | Custom joycons: joycon, joy-con, shell | Pokemon: pokemon | Mario & Zelda: mario, zelda, kirby
- PlayStation & Xbox @PS5 @XboxSeriesX @playstation ~ ps5, playstation, xbox, ps5 pro
  Console setups: setup, room, tv | Custom controllers: controller, dualsense, custom | Collections: collection, games, physical | Limited editions: limited, edition, special | Console mods: mod, skin, cover
- Retro handhelds @SBCGaming @RetroHandhelds ~ handheld, anbernic, retroid, miyoo, ayn, odin
  Anbernic: anbernic, rg35xx, rg406 | Retroid: retroid, pocket 5, rp5 | Miyoo: miyoo, mini plus | AYN Odin: odin, ayn, thor | Collections: collection, lineup, all my
## Gaming Rooms & Collections @gamingsetups @GameCollecting @battlestations
- Gaming setups @gamingsetups @battlestations ~ setup, gaming room, room, setups
  Console rooms: console, tv, couch | PC + console: pc and console, all in one | Small rooms: small, apartment, tiny | Themed rooms: theme, themed, decor | Kid setups: son, kid, daughter
- Game collections @!GameCollecting @gamecollecting ~ collection, shelf, haul, physical
  Hauls: haul, finds, pickup, pickups | Full sets: complete, full set, all | Shelves: shelf, shelves, display | Steelbooks: steelbook | Sealed games: sealed, graded, wata
- Gaming merch @gaming @GameCollecting ~ figure, statue, merch, poster, collectors edition
  Collector's editions: collectors edition, collector's edition, ce | Statues: statue, figure | Posters & art: poster, print, art | Plushies: plush, plushie | Apparel: shirt, hoodie, jacket
- Achievement flexes @gaming @Trophies @steam ~ achievement, platinum, trophy, 100%, completed
  Platinums: platinum, plat | 100% runs: 100%, completed, completion | Playtime flexes: hours, playtime | Steam libraries: library, steam library, backlog | Rare unlocks: rare, finally, unlocked
## Game Art & Fan Creations @gaming @fanart @PixelArt
- Fan art @gaming @fanart ~ fan art, fanart, drew, drawing, painted
  Character art: character, portrait | Pixel tributes: pixel, pixel art | Painted art: painting, painted, oil | Sketches: sketch, pencil | Digital art: digital, procreate
- Pixel art @!PixelArt ~ pixel art, pixel, sprite
  Characters: character, sprite | Scenes: scene, landscape, background | Animations: animation, animated, gif | Tilesets: tileset, tiles | Isometric: isometric, iso
- Game crafts @gaming @crafts ~ made, crafted, handmade, crochet, cake
  Gaming cakes: cake | Crochet & knit: crochet, knit, amigurumi | Perler beads: perler, bead | Woodwork: wood, carved | Lego builds: lego
- Indie games @IndieGaming @indiegames @IndieDev ~ indie, my game, our game, devlog
  Devlogs: devlog, progress, before and after | Art styles: art style, style | Cozy indies: cozy, wholesome | Horror indies: horror, scary | Trailers & launches: release, launch, steam page, wishlist
## Esports & Competitive @esports @GlobalOffensive @leagueoflegends @VALORANT
- Esports events @esports @leagueoflegends @GlobalOffensive ~ worlds, major, finals, tournament, event, lan
  Arenas: arena, stage, crowd | LAN events: lan, lan party | Trophies: trophy, champions, won | Fan meetups: meetup, met, signed | Event merch: jersey, merch
- Competitive FPS @GlobalOffensive @VALORANT @Overwatch ~ cs2, valorant, overwatch, rank, ranked
  Rank ups: rank, ranked, radiant, global elite | Skins: skin, knife, gloves | Crosshairs & settings: crosshair, settings, sens | Clutch moments: clutch, ace | Team photos: team, squad
- MOBA & strategy @leagueoflegends @DotA2 @aoe2 ~ league, dota, aoe, moba, strategy
  Champions & heroes: champion, hero | Cosplay & art: cosplay, art | Skins: skin | Rank flexes: challenger, immortal, rank | Map strategies: map, strategy, guide
- Fighting games @Fighters @StreetFighter @Tekken ~ street fighter, tekken, fightstick, fighting game
  Fight sticks: fightstick, arcade stick, hitbox | Tournament runs: evo, tournament, bracket | Characters: character, main | Arcade cabinets: arcade, cabinet | Custom art: art, custom

# Retro Gaming {retro-gaming} > gaming, collectibles-toys, electronics-diy @retrogaming @gamecollecting
## Consoles & Restorations @retrogaming @consolerepair
- Console finds @retrogaming @gamecollecting ~ found, thrift, garage sale, goodwill, find
  Thrift finds: thrift, goodwill, thrifted | Garage sales: garage sale, yard sale | Flea markets: flea market, market | Lots & bundles: lot, bundle | Lucky finds: lucky, steal, deal
- Restorations @consolerepair @retrobright @retrogaming ~ restore, restored, retrobright, cleaned, repair
  Retrobrite: retrobright, retrobrite, yellowed | Deep cleans: cleaned, cleaning, dirty | Board repairs: recap, capacitor, board | Shell swaps: shell, new shell | Before & after: before, after
- Mods & upgrades @consolemods @retrogaming ~ mod, modded, hdmi, rgb mod, ips
  HDMI mods: hdmi, n64digital, retrotink | IPS screens: ips, backlight, screen mod | Battery mods: battery, usb-c | Custom shells: custom shell, translucent, clear | Region mods: region, modchip
- Portable conversions @portabledev @consolemods ~ portable, portablized, handheld, conversion
  N64 portables: n64 | Wii portables: wii portable, wii | GameCube portables: gamecube | PS2 portables: ps2 | 3D printed shells: 3d printed, printed
## Collections & Shelves @gamecollecting @retrogaming
- Complete-in-box @gamecollecting ~ cib, complete in box, boxed, box
  CIB sets: cib, complete | Big box PC: big box | Manuals: manual, insert | Sealed: sealed, graded | Box protectors: protector, protectors
- Full sets @gamecollecting @retrogaming ~ full set, complete set, every, all
  NES sets: nes | SNES sets: snes, super nintendo | Game Boy sets: game boy, gameboy | Sega sets: genesis, mega drive, saturn | PS1 sets: ps1, playstation 1
- Game rooms @gamecollecting @retrogaming ~ game room, room, shelves, shelf
  CRT walls: crt, crts | Shelving: shelf, shelves, ikea | Lighting: led, lights | Cabinets: cabinet, arcade | Man caves: basement, man cave, den
- Hauls @gamecollecting ~ haul, pickup, pickups, finds
  Weekly hauls: week, weekly | Big lots: lot, huge | Birthday gifts: birthday, gift, christmas | Online finds: ebay, mercari | Japan imports: japan, japanese, import
## CRTs & Displays @crtgaming @retrogaming
- CRT setups @!crtgaming ~ crt, tube tv, trinitron
  PVM monitors: pvm, bvm | Trinitrons: trinitron, sony | Wall setups: setup, wall | Small CRTs: small, 9 inch, portable | Free CRTs: free, curb, found
- Scanlines & shaders @crtgaming @emulation ~ scanlines, shader, crt shader, retroarch
  Shaders: shader, crt-royale | Scanline photos: scanlines, phosphor | Comparison shots: comparison, vs | Upscalers: retrotink, ossc, upscaler | Light guns: light gun, zapper
- Arcade cabinets @cade @arcade ~ arcade, cabinet, cab, mame
  Restorations: restore, restored, restoration | Bartops: bartop, bar top | Cocktail cabs: cocktail | Pinball: pinball | Home arcades: home arcade, game room
- Vintage computers @retrobattlestations @vintagecomputing ~ commodore, amiga, apple ii, 486, dos, c64
  Commodore: commodore, c64, amiga | DOS machines: dos, 486, 386, pentium | Apple vintage: apple ii, macintosh, mac plus | Battlestations: battlestation, setup | Restorations: restore, recap
## Handheld Classics @Gameboy @retrogaming @GameboyAdvance
- Game Boy mods @Gameboy @consolemods ~ game boy, gameboy, gba, gbc, dmg
  IPS mods: ips | Custom shells: shell, custom | Backlights: backlight | Sound mods: speaker, sound | Builds: build, built
- Pokemon carts @Gameboy @pokemon ~ pokemon, cart, cartridge
  Cart collections: collection, carts | Save batteries: battery, save | Fakes vs real: fake, real, bootleg | Shiny hunts: shiny | Labels: label, labels
- Original hardware @retrogaming @Gameboy ~ original, og, 1989, vintage
  Mint condition: mint, condition, pristine | Rare colors: color, limited, edition | Lights & mags: light, magnifier, worm light | Battle scarred: damaged, beat up, survived | Childhood consoles: childhood, my old, kid
- FPGA & clones @fpgagaming @AnaloguePocket ~ analogue pocket, mister, fpga, clone
  Analogue Pocket: analogue pocket, pocket | MiSTer: mister | Clones: clone, retron | Cartridge adapters: adapter | Dock setups: dock
## Retro Culture @retrogaming @nostalgia
- Childhood memories @retrogaming @nostalgia ~ childhood, remember, memories, nostalgia, 90s
  90s kid: 90s | 80s memories: 80s | Old photos: photo, old picture | Christmas mornings: christmas, xmas | Toy catalogs: catalog, ad, magazine
- Magazines & ads @retrogaming @vintageads ~ magazine, ad, advertisement, nintendo power
  Nintendo Power: nintendo power | Print ads: ad, advertisement, print | Strategy guides: guide, strategy guide | Catalogs: catalog | Posters: poster
- Speedruns & records @speedrun @retrogaming ~ speedrun, record, world record, pb
  World records: world record, wr | Personal bests: pb, personal best | Challenge runs: challenge, no hit, hitless | Glitches: glitch, skip | Marathons: gdq, marathon
- Homebrew @homebrew @retrogaming ~ homebrew, new game, new cartridge
  Homebrew carts: cart, cartridge, physical | New releases: new release, released | Dev kits: dev kit, development | Hacks: rom hack, hack | Box art: box art, box

# Desk Setups {desk-setups} > pc-building, mechanical-keyboards, interior-design, gadgets @battlestations @desksetup @workspaces
## Home Office @workspaces @desksetup @HomeOffice
- WFH desks @workspaces @HomeOffice ~ wfh, home office, work from home, office
  Standing desks: standing desk, standing, sit stand | Dual monitors: dual monitor, two monitors | Corner desks: corner, l shaped | Small spaces: small, tiny, closet | Window views: window, view
- Productivity setups @workspaces @desksetup ~ productivity, work, workstation, workspace
  Mac setups: mac, macbook, studio display | Laptop docks: laptop, dock, docked | Ergonomic gear: ergonomic, ergo, vertical mouse | Note & planning: notebook, planner, notes | Clean desks: clean, tidy, organized
- Creative studios @workspaces @musicproduction ~ studio, design, creative, editing
  Music studios: music, daw, monitors, studio | Video editing: editing, editor, video | Design desks: design, designer, tablet | Streaming setups: stream, streaming, camera | Art studios: art, drawing
- Before & after makeovers @battlestations @desksetup ~ before, after, progress, upgrade
  Year evolutions: years, evolution, then and now | Budget makeovers: budget, cheap | Cable rescues: cable, cables, cable management | Lighting makeovers: lighting, light bar | Full redesigns: new, redesign, finally
## Cable Management & Accessories @cablemanagement @battlestations
- Cable management @!cablemanagement ~ cable, cables, cable management
  Under-desk trays: tray, under desk, underside | Velcro & ties: velcro, zip ties, ties | Hidden cables: hidden, invisible | Before & after: before, after | Disasters: mess, nightmare, spaghetti
- Desk accessories @desksetup @battlestations ~ desk mat, deskmat, light bar, stand, shelf
  Desk mats: desk mat, deskmat | Light bars: light bar, monitor light | Monitor arms: monitor arm, arm, vesa | Shelves & risers: shelf, riser | Headphone stands: headphone stand, stand
- Lighting & ambience @battlestations @desksetup ~ led, lights, lighting, rgb, ambient
  LED strips: led strip, strip | Nanoleaf & panels: nanoleaf, panels, hexagon | Lamps: lamp | Neon signs: neon | Night shots: night, dark
- Speakers & audio @audiophile @headphones @desksetup ~ speakers, headphones, dac, amp, audio
  Desktop speakers: speakers, bookshelf speakers | Headphones: headphones, hd600, sundara | DAC & amps: dac, amp | Turntables: turntable, vinyl | Studio monitors: studio monitors, monitors
## Gaming Battlestations @battlestations @pcmasterrace
- RGB stations @battlestations @pcmasterrace ~ rgb, argb, color
  Purple vibes: purple | Blue vibes: blue | Rainbow: rainbow | Synced lighting: synced, sync, signalrgb | Minimal RGB: subtle, minimal
- White setups @battlestations @desksetup ~ white, all white
  All-white PCs: white pc, white build | White desks: white desk | Pastel setups: pastel, pink | Snow themes: snow, winter | Clean whites: clean, minimal
- Dark setups @battlestations @desksetup ~ dark, black, blackout, stealth
  Stealth builds: stealth, blacked out | Moody lighting: moody, dim | Night setups: night | Matte black: matte | Red accents: red
- Endgame setups @battlestations @desksetup ~ endgame, dream, final, complete
  Triple monitors: triple, three monitors | Big screens: 49, 57, tv | Sim corners: sim, cockpit | Multi-system: console, pc, mac | Showcase rooms: room, finally done
## Small Spaces @malelivingspace @CozyPlaces @desksetup
- Apartment desks @desksetup @malelivingspace ~ apartment, small, studio, tiny
  Studio apartments: studio apartment, studio | Dorm desks: dorm, college | Bedroom desks: bedroom | Corner nooks: corner, nook | Closet offices: closet, cloffice
- Cozy corners @CozyPlaces @desksetup ~ cozy, warm, plants, comfy
  Plant desks: plants, plant | Rainy days: rain, rainy | Warm lighting: warm, lamp | Bookish desks: books, bookshelf | Window desks: window
- Minimal desks @minimalism @desksetup ~ minimal, minimalist, clean, simple
  Laptop only: laptop | One monitor: one monitor, single monitor | Wood desks: wood, walnut, oak | Japanese style: japandi, japanese | Black and white: black and white, monochrome
- Desk builds DIY @desksetup @woodworking ~ diy desk, built, butcher block, desk build
  Butcher block: butcher block | Live edge: live edge, epoxy | IKEA hacks: ikea, alex, karlby | Wall desks: wall, floating desk | Standing frames: frame, flexispot
## Aesthetic Themes @desksetup @battlestations
- Anime desks @desksetup @battlestations ~ anime, figures, figure, manga
  Figure shelves: figures, figure | Anime posters: poster | Themed keyboards: keyboard, keycaps | Waifu corners: waifu | Studio Ghibli: ghibli, totoro
- Retro desks @desksetup @retrobattlestations ~ retro, vintage, 80s, 90s
  Vintage computers: vintage computer, beige | Retro keyboards: retro keyboard, typewriter | CRT desks: crt | Wood paneling: wood paneling, paneling | Retro lamps: lamp
- Nature desks @desksetup @CozyPlaces ~ plants, nature, green, forest
  Moss walls: moss | Terrariums: terrarium | Window gardens: window, garden | Wooden setups: wooden, wood | Green themes: green
- Pastel & cute @desksetup @battlestations ~ pastel, pink, cute, kawaii
  Pink setups: pink | Sanrio: sanrio, kuromi, hello kitty, cinnamoroll | Lavender: lavender, purple | Plushies: plush, plushies | Cute keyboards: keyboard, keycaps

# Mechanical Keyboards {mechanical-keyboards} > desk-setups, pc-building, electronics-diy @MechanicalKeyboards @CustomKeyboards
## Keyboard Builds @MechanicalKeyboards @CustomKeyboards
- First mechanical @MechanicalKeyboards ~ first, first mechanical, first keyboard, new keyboard
  Prebuilts: keychron, akko, royal kludge, rk | Hot-swap starts: hot swap, hotswap | Budget boards: budget, cheap, aula | Gifts: gift, birthday | Upgrades: upgrade, upgraded
- Custom builds @CustomKeyboards @MechanicalKeyboards ~ custom, build, built, endgame
  Group buys: group buy, gb | Aluminum boards: aluminum, alu, brass | Gasket mounts: gasket | Endgames: endgame | Build streams: build, assembled
- Layouts @MechanicalKeyboards @ErgoMechKeyboards ~ 60%, 65%, 75%, tkl, full size, alice
  60% boards: 60% | 65% boards: 65% | 75% boards: 75% | TKL boards: tkl | Alice layouts: alice, arisu
- Ergonomic & split @!ErgoMechKeyboards ~ split, ergo, corne, lily58, sofle, dactyl
  Corne builds: corne, crkbd | Dactyls: dactyl, manuform | Wireless splits: wireless, zmk | Tenting: tent, tenting | Tiny layouts: 34 key, 36 key, ferris
## Keycaps & Aesthetics @MechanicalKeyboards @keycaps
- Keycap sets @MechanicalKeyboards @CustomKeyboards ~ keycaps, keycap, gmk, pbt, set
  GMK sets: gmk | PBT sets: pbt | Cherry profile: cherry | XDA & round: xda, round, retro | Clone sets: clone, aliexpress
- Artisan keycaps @!artisans @MechanicalKeyboards ~ artisan, artisans, resin
  Resin artisans: resin | Sculpted: sculpt, sculpted | Food artisans: sushi, cake, food | Animal artisans: cat, dog, frog | Collections: collection
- Themed setups @MechanicalKeyboards @CustomKeyboards ~ theme, themed, matching, colorway
  Retro beige: beige, retro, vintage | Pink & pastel: pink, pastel | Dark boards: black, dark | Wood boards: wood, wooden | Matching desks: matching, desk mat, deskmat
- Keyboard photography @MechanicalKeyboards @CustomKeyboards ~ photo, shot, picture, photography
  Macro shots: macro, close up | Outdoor shots: outside, outdoor | Lighting shots: rgb, backlit, glow | Flat lays: flat lay, overhead | Moody shots: moody, dark
## Switches & Sound @MechanicalKeyboards @CustomKeyboards
- Switch types @MechanicalKeyboards ~ switches, switch, linear, tactile, clicky
  Linears: linear | Tactiles: tactile, holy panda | Clicky: clicky, box jade | Magnetic: magnetic, hall effect, rapid trigger | Switch testers: tester, switch tester
- Lubing & mods @MechanicalKeyboards @CustomKeyboards ~ lube, lubed, lubing, mod, tape mod
  Lubing: lube, lubed, krytox | Foam mods: foam, foam mod | Tape mods: tape mod, tape | Stabilizers: stabs, stabilizers | Filming: film, films
- Thocky builds @CustomKeyboards @MechanicalKeyboards ~ thock, thocky, creamy, marbly, sound test
  Thock: thock, thocky | Creamy: creamy | Marbly: marbly, poppy | Clacky: clack, clacky | Quiet boards: silent, quiet
- Switch collections @MechanicalKeyboards ~ switch collection, switches, switch haul
  Switch walls: collection, wall | Rare switches: rare, vintage, alps | Switch hauls: haul | Testers: tester | Custom switches: custom switches, frankenswitch
## DIY & Electronics @olkb @MechanicalKeyboards @ErgoMechKeyboards
- Handwired boards @olkb @ErgoMechKeyboards ~ handwired, hand wired, handwire
  Wiring shots: wiring, wires | Diode matrices: diodes, matrix | First handwires: first handwire, first | Weird layouts: weird, unique | Finished handwires: finished, done
- PCB design @olkb @PrintedCircuitBoard ~ pcb, designed, kicad, my pcb
  KiCad designs: kicad | Prototype PCBs: prototype, proto | Flex PCBs: flex | Manufacturing: jlcpcb, pcbway | Assembled PCBs: assembled, soldered
- 3D printed boards @olkb @3Dprinting ~ 3d printed, printed case, printed
  Printed cases: case, printed case | Printed keycaps: keycaps, printed keycaps | Resin prints: resin | Multi-color prints: multicolor, ams | Tenting stands: stand, tent
- Firmware & macro pads @olkb @MechanicalKeyboards ~ macropad, macro pad, qmk, via, numpad
  Macropads: macropad, macro pad | Knobs & encoders: knob, encoder | OLED screens: oled, screen | Stream decks: stream deck | Numpads: numpad
## Vintage & Typewriters @VintageMechanical @typewriters
- Vintage keyboards @VintageMechanical @MechanicalKeyboards ~ vintage, model m, ibm, alps, buckling spring
  Model M: model m, buckling spring | Alps boards: alps | Apple vintage: apple extended, aek | Cleaning: cleaned, restored | Finds: found, thrift
- Typewriters @!typewriters ~ typewriter, olivetti, smith corona, royal
  Restorations: restored, cleaned | Portable typewriters: portable | Typed letters: typed, letter, poem | Colors: color, red, mint | Collections: collection
- Typewriter-style keyboards @MechanicalKeyboards @typewriters ~ typewriter keyboard, round keys, retro
  Round keycaps: round, typewriter | Brass boards: brass | Steampunk: steampunk | Bluetooth retro: bluetooth, retro | Writer decks: writerdeck, word processor
- Collecting & restoring @MechanicalKeyboards @CustomKeyboards ~ collection, restore, restoration, rare
  Rare boards: rare | Restoration logs: restoration, before, after | Spare parts: parts, keycaps | Retro converters: converter, usb | Collections: collection

# Smartphones & Gadgets {gadgets} > photography, desk-setups, pc-building, home-lab @gadgets @Android @iphone
## Phones @iphone @Android @GooglePixel @samsung
- iPhones @iphone @apple ~ iphone, iphone 17, iphone 16, pro max
  New iPhone days: new, arrived, upgraded | Cases: case, cases | Colors: color, orange, blue, black | Camera shots: shot on iphone, photo | Broken screens: cracked, broken, dropped
- Android flagships @Android @GooglePixel @samsung ~ pixel, galaxy, s25, s26, oneplus
  Pixels: pixel | Galaxy phones: galaxy, s25, s26, ultra | Foldables: fold, flip, foldable | OnePlus & Nothing: oneplus, nothing phone | Home screens: home screen, setup
- Home screens @androidthemes @iOSsetups ~ home screen, homescreen, setup, widgets
  Minimal screens: minimal | Aesthetic themes: aesthetic, theme | Icon packs: icon, icons | Widgets: widget, widgets | Dark themes: dark
- Old phones @RetroTechnology @nokia @gadgets ~ old phone, nokia, blackberry, flip phone
  Nokia: nokia | BlackBerry: blackberry | Flip phones: flip phone | Phone collections: collection | Vintage iPods: ipod
## Wearables @AppleWatch @smartwatch @GalaxyWatch
- Apple Watch @!AppleWatch ~ apple watch, watch, ultra
  Bands: band, bands, strap | Watch faces: face, faces | Ultras: ultra | Fitness rings: rings, closed, streak | Scratches: scratch, damage
- Smartwatches @smartwatch @GalaxyWatch @Garmin ~ smartwatch, galaxy watch, pixel watch, garmin
  Garmin: garmin, fenix, forerunner | Galaxy Watch: galaxy watch | Pixel Watch: pixel watch | Watch faces: watch face | Battery life: battery
- Smart rings & trackers @ouraring @fitbit ~ oura, ring, fitbit, whoop, tracker
  Oura: oura | Whoop: whoop | Fitbit: fitbit | Sleep data: sleep | Comparisons: vs, comparison
- Earbuds & headphones @headphones @airpods ~ airpods, earbuds, headphones, sony, xm5
  AirPods: airpods | Sony: sony, xm5, xm6 | IEMs: iem, iems | Cases & mods: case | Collections: collection
## Tablets & Laptops @ipad @laptops @thinkpad
- iPad setups @!ipad ~ ipad, ipad pro, ipad air, pencil
  Notes setups: notes, notetaking, goodnotes | Art setups: procreate, drawing, art | Keyboard cases: magic keyboard, keyboard | Travel setups: travel | Desk docks: dock, stand
- Laptops @laptops @macbookpro @thinkpad ~ laptop, macbook, thinkpad, notebook
  MacBooks: macbook | ThinkPads: thinkpad | Gaming laptops: gaming laptop, rog, legion | Laptop stickers: stickers | Travel desks: travel, cafe
- E-readers @kindle @ereader ~ kindle, kobo, ereader, e-reader, boox
  Kindles: kindle, paperwhite, scribe | Kobo: kobo | Cases: case | Reading nooks: reading | Covers & skins: cover, skin
- Handheld PCs @ROGAlly @SteamDeck @gpdwin ~ rog ally, legion go, gpd, handheld pc
  ROG Ally: rog ally, ally | Legion Go: legion go | GPD: gpd | Accessories: dock, case, grip | Comparisons: vs, comparison
## Smart Home @smarthome @homeassistant
- Smart home setups @smarthome @homeassistant ~ smart home, setup, automation
  Hubs: hub, home assistant | Smart lights: lights, hue | Voice assistants: alexa, google home, nest | Cameras: camera, doorbell | Wall panels: panel, wall tablet, tablet
- Home Assistant dashboards @!homeassistant ~ dashboard, home assistant, lovelace
  Wall tablets: wall, tablet | Mobile dashboards: mobile, phone | Energy dashboards: energy, solar | Minimal dashboards: minimal | E-ink displays: e-ink, eink
- Robot vacuums @RobotVacuums @Roborock ~ robot vacuum, roborock, roomba, vacuum
  Roborock: roborock | Roomba: roomba | Docks: dock, base | Maps: map | Pet hair: pet, hair
- Smart displays & frames @smarthome @frametv ~ frame tv, display, digital frame, e-ink
  Frame TVs: frame tv, frame | Art modes: art mode, art | E-ink frames: e-ink, eink | Photo frames: photo frame | Calendar displays: calendar
## Tech Unboxings & Hauls @gadgets @apple @Android
- Unboxings @iphone @macsetups @Android ~ unboxing, unboxed, arrived, finally
  Phone unboxings: phone, iphone, pixel | Laptop unboxings: laptop, macbook | Audio unboxings: headphones, earbuds | Camera unboxings: camera | Accessory hauls: accessories, haul
- Tech collections @iphone @macsetups @Android ~ collection, ecosystem, all my, lineup
  Apple ecosystems: ecosystem, apple | Phone collections: phones | Charger hauls: chargers, cables | Retro tech: retro, vintage | Gadget flat lays: flat lay, edc
- EDC tech @EDC @gadgets ~ edc, everyday carry, pocket dump, carry
  Pocket dumps: pocket dump | Flashlights: flashlight, light | Power banks: power bank, battery | Knives & tools: knife, multitool | Wallets: wallet
- Broken & repaired @mobilerepair @gadgets ~ repair, repaired, broken, cracked, fixed
  Screen repairs: screen, cracked | Battery swaps: battery, swollen | Water damage: water, wet | DIY repairs: diy, ifixit | Survivors: survived, still works

# Photography {photography} > travel, wildlife-nature, astronomy, gadgets @photography @itookapicture @photocritique
## Cameras & Gear @cameras @SonyAlpha @fujifilm @canon
- First cameras @cameras @photography ~ first camera, new camera, my first, beginner
  Mirrorless starts: mirrorless, a6400, zv-e10, xt30 | Used bodies: used, secondhand | Kit lenses: kit lens, kit | Camera gifts: gift | Upgrades: upgrade, upgraded
- Mirrorless systems @SonyAlpha @fujifilm @canon @Nikon ~ sony, fuji, fujifilm, canon, nikon, a7
  Sony Alpha: a7, a7iv, sony | Fujifilm: x100, xt5, fuji | Canon R: canon, r5, r6 | Nikon Z: nikon, z6, zf | Leica: leica
- Lenses & glass @photography @SonyAlpha @fujifilm ~ lens, lenses, prime, 50mm, 35mm, telephoto
  Primes: prime, 35mm, 50mm | Telephotos: telephoto, 200-600, 100-400 | Vintage glass: vintage lens, helios, adapted | Macro lenses: macro | Lens collections: collection
- Film cameras @AnalogCommunity @analog @filmphotography ~ film, 35mm, medium format, kodak, portra
  35mm film: 35mm, portra, gold | Medium format: medium format, 120, hasselblad | Half frame: half frame, pentax 17 | Expired film: expired | Darkroom: darkroom, develop
## Landscape & Travel @EarthPorn @LandscapePhotography @itookapicture
- Mountains @LandscapePhotography @EarthPorn ~ mountain, mountains, peak, alps
  Sunrise peaks: sunrise | Alpine lakes: lake, alpine | Snowy peaks: snow | Dolomites: dolomites | Patagonia: patagonia
- Seascapes @LandscapePhotography @itookapicture ~ sea, ocean, coast, beach, waves
  Long exposures: long exposure | Cliffs: cliff, cliffs | Sunset coasts: sunset | Stormy seas: storm, waves | Lighthouses: lighthouse
- Forests & fog @LandscapePhotography @EarthPorn ~ forest, fog, foggy, woods, mist
  Foggy forests: fog, foggy, mist | Autumn forests: autumn, fall | Rainforests: rainforest | Pine woods: pine | Light rays: rays, light
- Astro landscapes @astrophotography @LandscapePhotography ~ milky way, stars, night sky, aurora
  Milky Way: milky way | Auroras: aurora, northern lights | Star trails: star trails | Moonlit scenes: moon | Comets & meteors: comet, meteor
## Street & Urban @streetphotography @CityPorn @itookapicture
- Street candids @streetphotography ~ street, candid, people, city
  Black and white: black and white, b&w, bw | Night streets: night | Rain streets: rain, rainy | Shadows & light: shadow, light | Characters: man, woman, old
- City nights @CityPorn @itookapicture ~ night, city, skyline, neon
  Skylines: skyline | Neon streets: neon | Blue hour: blue hour | Rooftops: rooftop | Traffic trails: light trails, long exposure
- Architecture details @architecture @ArchitecturePorn @itookapicture ~ architecture, building, facade, stairs
  Spiral stairs: spiral, staircase | Facades: facade | Brutalism: brutalist, brutalism | Symmetry: symmetry | Minimal lines: minimal, lines
- Urban exploration @urbanexploration @AbandonedPorn ~ abandoned, urbex, decay, ruins
  Abandoned houses: house, home | Abandoned factories: factory, industrial | Hospitals & asylums: hospital, asylum | Malls: mall | Nature reclaimed: overgrown, nature
## Portraits & People @portraits @analog @itookapicture
- Portraits @portraits @itookapicture ~ portrait, headshot, model
  Natural light: natural light, window light | Studio light: studio, strobe | Golden hour: golden hour | Black and white: black and white, b&w | Environmental: environmental
- Couples & weddings @WeddingPhotography @itookapicture ~ wedding, couple, engagement
  Engagements: engagement, proposal | Ceremonies: ceremony | Elopements: elopement | First looks: first look | Receptions: reception, dance
- Family & kids @itookapicture @analog ~ family, kids, baby, son, daughter
  Newborns: newborn | Siblings: siblings | Grandparents: grandma, grandpa | Playtime: playing | Milestones: birthday, first
- Self portraits @selfportraits @itookapicture ~ self portrait, self-portrait, me
  Creative self: creative, concept | Mirror shots: mirror | Film self: film | Outdoors self: outside, nature | Moody self: moody, dark
## Editing & Techniques @photocritique @postprocessing @photography
- Before & after edits @postprocessing @photocritique ~ before and after, edit, edited, raw
  Raw vs edited: raw | Color grading: color grade, grading, colors | Lightroom edits: lightroom | Composites: composite | Fixes: fixed, saved
- Long exposure @LongExposure @photography ~ long exposure, nd filter, silky, light trails
  Waterfalls: waterfall | Light trails: light trails | Clouds streaks: clouds | City streaks: city | Seas: sea, ocean
- Macro photography @macrophotography @photography ~ macro, close up, insect, extension tubes
  Insects: insect, bug, fly, bee | Spiders: spider, jumping spider | Water drops: drop, droplet | Flowers: flower | Snowflakes: snowflake, frost
- Critique requests @photocritique ~ critique, feedback, cc, thoughts
  Beginner critiques: beginner, new | Composition: composition | Exposure: exposure, underexposed | Portfolio: portfolio | Contest entries: contest, competition

# Home Lab {home-lab} > pc-building, gadgets, electronics-diy @homelab @HomeServer @selfhosted
## Racks & Servers @homelab @HomeDataCenter
- First homelabs @homelab @HomeServer ~ first homelab, first server, starting, my homelab
  Mini PCs: mini pc, nuc, optiplex | Raspberry Pi starts: raspberry pi, pi | Old laptops: laptop | Used servers: r720, r730, dell | Closets: closet
- Rack builds @homelab @HomeDataCenter ~ rack, 42u, 12u, rack build
  Small racks: 6u, 9u, 12u | Full racks: 42u, full rack | Mini racks: mini rack, 10 inch | Rack makeovers: before, after | Cable jobs: cable, patch panel
- Enterprise gear @HomeDataCenter @homelab ~ server, r740, supermicro, hp, enterprise
  Dell PowerEdge: poweredge, r730, r740 | Supermicro: supermicro | HP ProLiant: proliant, dl380 | Blade servers: blade | Free gear: free, ewaste, decommissioned
- Data centers @HomeDataCenter @sysadmin ~ data center, datacenter, server room
  Server rooms: server room | Cooling: cooling, ac | Power setups: ups, power | Cable porn: cable, cabling | Work racks: work, office
## Storage & NAS @DataHoarder @synology @unRAID @truenas
- NAS builds @HomeServer @DataHoarder @unRAID ~ nas, unraid, truenas, nas build
  Unraid boxes: unraid | TrueNAS boxes: truenas | Small NAS: small, mini | DIY cases: jonsbo, fractal, node 304 | Low power: low power, efficient
- Synology & prebuilts @synology @HomeServer ~ synology, qnap, ugreen, ds923
  Synology: synology | UGREEN: ugreen | QNAP: qnap | Upgrades: upgrade | Setups: setup
- Data hoarding @!DataHoarder ~ drives, tb, hard drive, hoard, storage
  Drive stacks: drives, stack | Shucking: shuck, shucked | Tape drives: tape, lto | Optical archives: blu-ray, disc | Big pools: tb, pb, petabyte
- Backups & failures @DataHoarder @HomeServer ~ backup, failed, failure, dead drive
  Dead drives: dead, failed | Backup setups: backup, offsite | Smart errors: smart, errors | Recoveries: recovered, recovery | UPS setups: ups, power
## Networking @HomeNetworking @networking @Ubiquiti
- Home networks @HomeNetworking @Ubiquiti ~ network, networking, router, switch, wifi
  Ubiquiti: ubiquiti, unifi | Mesh WiFi: mesh | Access points: access point, ap | Switches: switch, poe | Network maps: diagram, map
- Wiring jobs @HomeNetworking @electricians ~ ethernet, cat6, wiring, cable, patch panel
  Cat6 runs: cat6, cat 6 | Patch panels: patch panel | Wall plates: wall plate, keystone | Attic runs: attic, crawl | Media panels: panel, closet
- Network racks @Ubiquiti @homelab ~ unifi, rack, udm, switch
  UniFi racks: unifi | Small cabinets: cabinet, wall mount | Patch jobs: patch | Fiber: fiber, sfp | Labels: label, labeled
- Firewalls & routers @PFSENSE @opnsense @HomeNetworking ~ pfsense, opnsense, firewall, router
  pfSense: pfsense | OPNsense: opnsense | Mini routers: mini, n100 | Dashboards: dashboard | VLAN setups: vlan
## Self-Hosting @selfhosted @HomeServer
- Dashboards @selfhosted @homelab ~ dashboard, homepage, homarr, grafana
  Homepage: homepage | Homarr: homarr | Grafana: grafana | Dark dashboards: dark | Minimal dashboards: minimal
- Media servers @PleX @jellyfin @selfhosted ~ plex, jellyfin, media server, emby
  Plex: plex | Jellyfin: jellyfin | Libraries: library | Server builds: server | Remote setups: remote
- Raspberry Pi projects @raspberry_pi @selfhosted ~ raspberry pi, pi 5, pi 4, pi cluster
  Pi clusters: cluster | Pi cases: case | Pi-hole: pi-hole, pihole | Pi displays: display, screen | Pi servers: server
- Smart home servers @homeassistant @selfhosted ~ home assistant, server, proxmox
  Proxmox: proxmox | Docker hosts: docker | Mini servers: mini | Power dashboards: power, energy | Automations: automation
## Mini PCs & Low Power @MiniPCs @homelab
- Mini PC labs @MiniPCs @homelab ~ mini pc, minipc, nuc, n100
  N100 boxes: n100, n150 | Clusters: cluster | Stacks: stack | Upgrades: ram, upgrade | Tiny racks: rack
- Tiny/Mini/Micro @homelab @MiniPCs ~ tiny, micro, optiplex, thinkcentre, elitedesk
  OptiPlex: optiplex | ThinkCentre: thinkcentre | EliteDesk: elitedesk | Stacks: stack | Mods: mod, pcie
- Power usage @homelab @HomeServer ~ power, watts, idle, efficiency, power draw
  Idle power: idle | Watt meters: watts, meter | Solar labs: solar | UPS: ups | Efficiency builds: efficient, low power
- Portable labs @homelab @selfhosted ~ portable, travel, case, briefcase
  Travel routers: travel router | Briefcase labs: briefcase | Battery packs: battery | Car labs: car | Field kits: kit

# 3D Printing {3d-printing} > electronics-diy, miniatures-tabletop, cosplay, collectibles-toys @3Dprinting @BambuLab @prusa3d
## Printers @3Dprinting @BambuLab @prusa3d @ender3
- First printers @3Dprinting @BambuLab ~ first printer, first print, new printer, beginner
  Bambu starts: bambu, a1, p1s | Ender starts: ender | Prusa starts: prusa, mk4 | Benchy prints: benchy | Printer gifts: gift
- Bambu Lab @!BambuLab ~ bambu, x1c, p1s, a1, h2d
  AMS setups: ams | Enclosures: enclosure | Print farms: farm | Upgrades: upgrade | Failures: fail, failed
- Prusa & Voron @prusa3d @VORONDesign ~ prusa, voron, core one, mk4
  Voron builds: voron | Prusa kits: kit | Core One: core one | Mods: mod | Serial numbers: serial
- Printer setups @3Dprinting @BambuLab ~ setup, print room, workshop, enclosure
  Print rooms: room | Shelving: shelf, shelves | Enclosures: enclosure, ikea lack | Filament storage: filament storage, dry box | Garages: garage
## Functional Prints @functionalprint @3Dprinting
- Home fixes @functionalprint ~ replacement, fix, fixed, broken, part
  Replacement parts: replacement | Appliance fixes: dishwasher, fridge, washer | Furniture fixes: furniture, chair | Car parts: car | Clips & brackets: clip, bracket
- Organization prints @functionalprint @3Dprinting ~ organizer, gridfinity, storage, holder
  Gridfinity: gridfinity | Tool holders: tool, holder | Desk organizers: desk | Cable clips: cable | Wall mounts: wall, mount
- Workshop tools @functionalprint @3Dprinting ~ jig, tool, workshop, clamp
  Jigs: jig | Clamps: clamp | Dust collection: dust | Shop organizers: shop | Measuring tools: gauge, measure
- Mechanical designs @functionalprint @3Dprinting ~ gear, gears, mechanism, hinge, print in place
  Gearboxes: gearbox, gear | Print-in-place: print in place | Hinges: hinge | Robots: robot | Compliant mechanisms: compliant, flexure
## Models & Art @3Dprinting @PrintedMinis
- Figures & statues @3Dprinting @PrintedMinis ~ figure, statue, bust, sculpture
  Busts: bust | Statues: statue | Anime figures: anime | Painted figures: painted | Huge prints: huge, giant
- Multicolor prints @BambuLab @3Dprinting ~ multicolor, multi color, ams, color
  AMS showcases: ams | Lithophanes: lithophane | Signs: sign | Toys: toy | Keychains: keychain
- Articulated prints @3Dprinting @BambuLab ~ articulated, flexi, dragon, print in place
  Dragons: dragon | Flexi animals: flexi | Snakes: snake | Fidget toys: fidget | Crystal dragons: crystal
- Cosplay props @3Dprinting @cosplayprops ~ helmet, armor, prop, cosplay
  Helmets: helmet | Armor: armor | Weapons: sword, blaster | Masks: mask | Painted props: painted
## Resin Printing @resinprinting @PrintedMinis @ElegooMars
- Resin printers @resinprinting @ElegooMars ~ resin printer, mars, saturn, resin
  Elegoo: elegoo, mars, saturn | Anycubic: anycubic, photon | Wash & cure: wash, cure | Setups: setup | Ventilation: vent, ventilation
- Resin minis @PrintedMinis @resinprinting ~ mini, minis, miniature
  Warhammer minis: warhammer | DnD minis: dnd, d&d | Supports: supports | Tiny details: detail | Batches: batch
- Resin fails @resinprinting ~ fail, failed, suction, layer shift
  Suction cups: suction | Supports fails: supports | Plate fails: plate | Spaghetti: spaghetti | Cracks: crack, cracked
- Painted resin @PrintedMinis @minipainting ~ painted, paint job, painting
  Display pieces: display | Speed paints: speed paint | NMM: nmm, non metallic | Bases: base | Dioramas: diorama
## Fails & Tuning @3Dprinting @FixMyPrint
- Print fails @FixMyPrint @3Dprinting ~ fail, failed, spaghetti, help
  Spaghetti: spaghetti | Layer shifts: layer shift | Stringing: stringing | Warping: warping, warp | Blobs: blob
- Calibration prints @3Dprinting @FixMyPrint ~ calibration, benchy, cube, tower
  Benchies: benchy | Temp towers: temp tower, temperature | Flow tests: flow | Bridging tests: bridge, bridging | Overhang tests: overhang
- Upgrades & mods @3Dprinting @ender3 ~ upgrade, mod, modded, klipper
  Klipper: klipper | Hotends: hotend | Direct drive: direct drive | Toolheads: toolhead | Enclosures: enclosure
- Filament @3Dprinting @BambuLab ~ filament, pla, petg, silk, spools
  Silk PLA: silk | PETG: petg | TPU: tpu | Spool walls: spools, wall | Drying: dry, dryer

# Electronics & DIY {electronics-diy} > home-lab, 3d-printing, mechanical-keyboards, retro-gaming @electronics @arduino @diyelectronics
## Microcontrollers @arduino @esp32 @raspberry_pi
- Arduino projects @!arduino ~ arduino, uno, nano, project
  First projects: first | Robots: robot | Sensors: sensor | LED projects: led | Displays: display, oled
- ESP32 builds @esp32 @arduino ~ esp32, esp8266, wled
  WLED: wled | Weather stations: weather | E-ink displays: e-ink, eink | Smart switches: switch | Wearables: wearable
- Raspberry Pi builds @raspberry_pi ~ raspberry pi, pi 5, pi zero, pi 4
  Pi cases: case | Pi screens: screen, display | Pi robots: robot | Pi retro: retropie, retro | Pi clusters: cluster
- Robotics @robotics @arduino ~ robot, robotic, arm, rover
  Robot arms: arm | Rovers: rover | Walkers: walker, legged, quadruped | Drones: drone | Combat bots: combat, battlebot
## Soldering & Repair @soldering @electronics @AskElectronics
- Soldering work @!soldering ~ solder, soldering, smd, joint
  SMD work: smd | Through-hole: through hole, tht | Rework: rework | First soldering: first | Kits: kit
- Repairs @electronics @fixit @AskElectronics ~ repair, fixed, broken, dead, capacitor
  Recaps: recap, capacitor | Burnt boards: burnt, burned | Vintage repairs: vintage | Phone repairs: phone | Power supplies: power supply, psu
- Workbenches @electronics @soldering ~ workbench, bench, lab, setup
  Oscilloscopes: oscilloscope, scope | Bench supplies: power supply | Microscopes: microscope | Organization: organized, drawers | Small benches: small
- Kit builds @diyelectronics @electronics ~ kit, kit build, assembled
  Synth kits: synth | Clock kits: clock | Radio kits: radio | Badge kits: badge | Amp kits: amp
## PCBs & Design @PrintedCircuitBoard @electronics
- PCB designs @!PrintedCircuitBoard ~ pcb, layout, board, design
  First PCBs: first pcb, first | Review requests: review | Art PCBs: art, silkscreen | RF boards: rf, antenna | Dense boards: dense, bga
- Assembled boards @PrintedCircuitBoard @electronics ~ assembled, arrived, populated
  JLCPCB orders: jlc, jlcpcb | Hand assembly: hand, soldered | Reflow: reflow | Stencils: stencil | Panels: panel
- Enclosures & finishes @electronics @functionalprint ~ enclosure, case, box
  3D printed cases: 3d printed | Metal cases: aluminum, metal | Wood cases: wood | Front panels: front panel | Labels: label
- Badges & art @electronics @PrintedCircuitBoard ~ badge, art, led, sao
  Conference badges: defcon, badge | LED art: led | Business cards: business card | Ornaments: ornament | Pins: pin
## Audio & Synths @synthdiy @diyaudio @synthesizers
- DIY synths @!synthdiy ~ synth, eurorack, module
  Eurorack modules: eurorack, module | Drum machines: drum | Sequencers: sequencer | Panels: panel | Kits: kit
- DIY audio @diyaudio @audiophile ~ amp, amplifier, speaker, tube
  Tube amps: tube | Speaker builds: speaker | Headphone amps: headphone amp | Turntables: turntable | DACs: dac
- Guitar pedals @diypedals @guitarpedals ~ pedal, pedals, fuzz, overdrive
  Fuzz: fuzz | Overdrive: overdrive | Enclosure art: art, enclosure | Pedalboards: pedalboard | First pedals: first
- Synth setups @synthesizers ~ setup, synth setup, studio, rig
  Eurorack cases: case, rack | Desktop synths: desktop | Vintage synths: vintage | Collections: collection | Live rigs: live
## Lighting & Wearables @WLED @LEDs @electronics
- LED projects @WLED @electronics ~ led, leds, ws2812, strip
  Wall art: wall, art | Matrices: matrix | Holiday lights: christmas, halloween | Room lights: room | Cosplay LEDs: cosplay
- Nixie & clocks @electronics @nixie ~ nixie, clock, vfd
  Nixie clocks: nixie | VFD clocks: vfd | Word clocks: word clock | Binary clocks: binary | Wooden clocks: wood
- Cyberdecks @cyberDeck @electronics ~ cyberdeck, deck, portable computer
  Briefcase decks: briefcase | Handheld decks: handheld | Rugged decks: rugged, pelican | Keyboard decks: keyboard | Writer decks: writer
- Wearable tech @wearables @electronics ~ wearable, cosplay, glow, costume
  LED costumes: costume | Glow jackets: jacket | Smart jewelry: jewelry | Helmets: helmet | Badges: badge
`;
export default source;
