// Outdoors & travel topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Hiking & Backpacking {hiking} > camping, wildlife-nature, travel, photography, climbing @hiking @backpacking @CampingandHiking
## Day Hikes @hiking @hikingwithdogs
- Summits @hiking ~ summit, peak, top, mountain
  Sunrise summits: sunrise | Fourteeners: 14er, fourteener | Snowy summits: snow | Summit selfies: selfie, me | First summits: first
- Waterfalls @hiking @waterfalls ~ waterfall, falls, cascade
  Big falls: huge, tall | Hidden falls: hidden | Frozen falls: frozen | Swimming holes: swim | Forest falls: forest
- Lakes & alpine @hiking ~ lake, alpine, tarn, reflection
  Turquoise lakes: turquoise, blue | Reflections: reflection | Alpine meadows: meadow | Larches: larch | Mountain lakes: mountain
- Trail views @hiking @CampingandHiking ~ trail, view, views, overlook
  Ridgelines: ridge | Canyons: canyon | Forest trails: forest | Coastal trails: coast | Fall colors: fall, autumn
## Backpacking @backpacking @Ultralight @WildernessBackpacking
- Thru-hikes @backpacking @AppalachianTrail @PacificCrestTrail ~ thru hike, pct, at, cdt, appalachian trail
  PCT: pct, pacific crest | Appalachian Trail: appalachian, at | CDT: cdt | Finishes: finished, katahdin, monument | Trail towns: town
- Overnight trips @backpacking @WildernessBackpacking ~ overnight, backpacking trip, night, nights
  First trips: first | Solo trips: solo | Winter trips: winter | Wilderness camps: wilderness | Weekend trips: weekend
- Ultralight gear @!Ultralight @backpacking ~ ultralight, ul, gear list, base weight
  Shelters: shelter, tent | Packs: pack | Quilts: quilt | Gear flat lays: flat lay, gear | Base weights: base weight
- Long trails abroad @backpacking @hiking ~ camino, tmb, gr20, w trek, everest base camp
  Camino: camino | Tour du Mont Blanc: tmb, mont blanc | Patagonia W: torres del paine, w trek | Everest base camp: everest | GR20: gr20
## Mountains & Alpine @Mountaineering @hiking
- Mountaineering @!Mountaineering ~ mountaineering, glacier, climb, ascent
  Glacier travel: glacier | Summit pushes: summit | Ice axes: ice axe | High camps: camp | Expeditions: expedition
- Scrambles & ridges @hiking @Mountaineering ~ scramble, ridge, knife edge, exposure
  Knife edges: knife edge | Class 3: class 3 | Exposed ridges: exposed | Via ferratas: via ferrata | Ridge walks: ridge
- Winter hiking @hiking @winterhiking ~ winter, snow, snowshoe, microspikes
  Snowshoeing: snowshoe | Winter summits: summit | Frozen lakes: frozen | Spikes & crampons: microspikes, crampons | Snowy forests: forest
- Volcanoes @hiking @volcanoes ~ volcano, crater, lava, caldera
  Craters: crater | Active volcanoes: active, lava | Calderas: caldera | Volcanic hikes: hike | Ash fields: ash
## Trails Around the World @hiking @travel
- National parks @NationalPark @hiking ~ national park, np, yosemite, zion, glacier
  Yosemite: yosemite | Zion: zion | Glacier NP: glacier national park | Banff: banff | Yellowstone: yellowstone
- Europe trails @hiking @travel ~ dolomites, alps, scotland, norway, iceland
  Dolomites: dolomites | Swiss Alps: switzerland, swiss | Scotland: scotland | Norway: norway | Iceland: iceland
- Asia & Oceania trails @hiking @travel ~ nepal, japan, new zealand, tasmania
  Nepal: nepal | Japan trails: japan | New Zealand: new zealand | Tasmania: tasmania | Himalaya: himalaya
- Americas trails @hiking @travel ~ patagonia, peru, colorado, utah, washington
  Patagonia: patagonia | Peru: peru, machu picchu | Colorado: colorado | Utah: utah | Pacific Northwest: washington, oregon
## Hiking Gear @hiking @CampingGear @HikingGear
- Boots & shoes @hiking @HikingGear ~ boots, shoes, trail runners
  Worn-out shoes: worn, miles | Trail runners: trail runners | Leather boots: leather | Resoles: resole | New boots: new
- Packs @hiking @backpacking ~ pack, backpack, daypack
  Daypacks: daypack | Frameless packs: frameless | Big packs: 60l, 65l | Pack fits: fit | DIY packs: diy
- Gear layouts @CampingGear @backpacking ~ gear, layout, flat lay, kit
  Flat lays: flat lay | Emergency kits: emergency | Winter kits: winter | First-aid kits: first aid | Cook kits: cook
- Navigation & safety @hiking @backpacking ~ map, compass, gps, rescue
  Maps: map | GPS devices: gps, inreach | Rescues: rescue | Trail markers: blaze, marker | Weather: weather, storm

# Camping {camping} > hiking, overlanding, van-life, bbq-grilling, fishing @camping @CampingandHiking @CampingGear
## Tent Camping @camping @CampingandHiking
- Campsites @camping @CampingandHiking ~ campsite, camp, site, spot
  Lakeside camps: lake | Forest camps: forest | Beach camps: beach | Mountain camps: mountain | Desert camps: desert
- Tents @CampingGear @camping ~ tent, tents, shelter, tarp
  Family tents: family | Tarps: tarp | Ultralight tents: ultralight | Bell tents: bell tent | Hot tents: hot tent
- Car camping @camping @CarCamping ~ car camping, car, suv, hatchback
  SUV setups: suv | Hatchback beds: hatchback | Truck beds: truck bed | Window nets: window | Sleep setups: bed
- Winter camping @camping @winter ~ winter camping, snow, hot tent, cold
  Hot tents: hot tent | Snow camps: snow | Igloos: igloo | Frozen lakes: frozen | Sleeping bags: sleeping bag
## Bushcraft @Bushcraft @Survival
- Shelters @!Bushcraft ~ shelter, lean to, debris hut, build
  Lean-tos: lean to, lean-to | Debris huts: debris | Tarp shelters: tarp | Log shelters: log | Overnight builds: overnight
- Fire craft @Bushcraft @camping ~ fire, ferro rod, fire starting, flint
  Ferro rods: ferro | Flint & steel: flint | Fire lays: fire lay | Feather sticks: feather stick | Bow drills: bow drill
- Knives & tools @Bushcraft @knives ~ knife, axe, saw, tools
  Bushcraft knives: knife | Axes: axe | Folding saws: saw | Handmade tools: handmade | Sharpening: sharpen
- Wild food @foraging @Bushcraft ~ foraging, foraged, wild, mushrooms, berries
  Mushrooms: mushroom | Berries: berry, berries | Wild greens: greens | Fish cooks: fish | Plant IDs: id
## Camp Cooking @camping @campfirecooking
- Campfire meals @campfirecooking @camping ~ campfire, fire, cooked, meal
  Campfire steaks: steak | Foil packs: foil | Skewers: skewer | Bannock & bread: bannock, bread | S'mores: smores, s'mores
- Dutch oven cooking @campfirecooking @castiron ~ dutch oven, cast iron, camp oven
  Cobblers: cobbler | Stews: stew | Breads: bread | Coals: coals | Chili: chili
- Camp breakfasts @camping @campfirecooking ~ breakfast, coffee, eggs, bacon
  Camp coffee: coffee | Bacon & eggs: bacon, eggs | Pancakes: pancakes | Breakfast burritos: burrito | Percolators: percolator
- Backpacking food @backpacking @trailmeals ~ dehydrated, meal, trail food, ramen
  Dehydrated meals: dehydrated | Trail snacks: snacks | Cold soaking: cold soak | Resupply hauls: resupply | Homemade meals: homemade
## Hammocks & Gear @hammockcamping @CampingGear
- Hammock camping @!hammockcamping ~ hammock, hang, tarp
  Bridge hammocks: bridge | Winter hangs: winter | Bug nets: bug net | Underquilts: underquilt | Scenic hangs: view
- Camp chairs & furniture @CampingGear @camping ~ chair, table, furniture, cot
  Camp chairs: chair | Cots: cot | Tables: table | Kitchens: kitchen | Lanterns: lantern
- Lighting @CampingGear @camping ~ lantern, light, headlamp, string lights
  Lanterns: lantern | String lights: string lights | Headlamps: headlamp | Candle lanterns: candle | Night glow: glow
- Gear hauls @CampingGear @camping ~ haul, new gear, gear, setup
  Budget hauls: budget | Thrifted gear: thrift | Vintage gear: vintage | Gifts: gift | Full setups: setup
## Glamping & Cabins @camping @CabinPorn
- Glamping @camping @glamping ~ glamping, bell tent, safari tent
  Bell tents: bell tent | Safari tents: safari | Domes: dome | Treehouses: treehouse | Bubble tents: bubble
- Cabin stays @CabinPorn @cabins ~ cabin, lodge, hut
  Mountain huts: hut | Lake cabins: lake | Snowy cabins: snow | Forest cabins: forest | Fire lookouts: lookout
- Campgrounds & RVs @camping @RVLiving ~ rv, campground, trailer, fifth wheel
  RV sites: rv | Travel trailers: trailer | Vintage campers: vintage, airstream | Campground views: campground | RV interiors: interior
- Family camping @camping @CampingandHiking ~ family, kids, son, daughter
  Kids first trips: first | Family tents: tent | Camp games: games | Dad and kid: dad | Campfire nights: campfire

# Travel {travel} > hiking, world-cuisines, photography, aviation, architecture-cities @travel @TravelPorn @solotravel
## Cities @travel @CityPorn @TravelPorn
- European cities @travel @europe ~ paris, rome, barcelona, amsterdam, prague, london
  Paris: paris | Rome: rome | Barcelona: barcelona | Amsterdam: amsterdam | Prague: prague
- Asian cities @travel @JapanTravel ~ tokyo, kyoto, seoul, bangkok, hong kong, singapore
  Tokyo: tokyo | Kyoto: kyoto | Seoul: seoul | Bangkok: bangkok | Hong Kong: hong kong
- American cities @travel @CityPorn ~ new york, nyc, chicago, san francisco, mexico city
  NYC: new york, nyc | Chicago: chicago | San Francisco: san francisco | Mexico City: mexico city | New Orleans: new orleans
- Hidden towns @travel @TravelPorn ~ village, small town, town, hidden gem
  Mountain villages: mountain village | Coastal towns: coastal | Medieval towns: medieval | Island towns: island | Hidden gems: hidden gem
## Nature Escapes @TravelPorn @travel @EarthPorn
- Beaches & islands @travel @TravelPorn ~ beach, island, islands, lagoon
  Maldives: maldives | Greek islands: santorini, greece | Thai islands: thailand, phi phi | Caribbean: caribbean | Hidden beaches: hidden
- Mountain escapes @travel @TravelPorn ~ mountains, alps, swiss, dolomites, patagonia
  Swiss Alps: swiss, switzerland | Dolomites: dolomites | Patagonia: patagonia | Himalayas: nepal, himalaya | Rockies: rockies, banff
- Deserts @travel @TravelPorn ~ desert, sahara, dunes, wadi
  Sahara: sahara | Wadi Rum: wadi rum | Dune seas: dunes | Desert camps: camp | Atacama: atacama
- Northern lights trips @travel @auroraborealis ~ northern lights, aurora, iceland, norway, lapland
  Iceland: iceland | Norway: norway, tromso | Lapland: lapland, finland | Canada auroras: canada, yukon | Glass igloos: igloo
## Travel Styles @solotravel @travel @backpacking
- Solo travel @!solotravel ~ solo, alone, solo trip, first solo
  First solo trips: first solo | Solo female travel: female, woman | Hostels: hostel | Long-term trips: months | Solo selfies: me
- Backpacking trips @travel @backpacking ~ backpacking, hostel, budget travel, gap year
  Southeast Asia loops: southeast asia | Interrail: interrail, eurail | South America loops: south america | Hostel life: hostel | Budget tips: budget
- Road trips @roadtrip @travel ~ road trip, roadtrip, drive, route
  Route 66: route 66 | Coastal drives: coast, pacific coast | Iceland ring road: ring road | Scotland NC500: nc500 | Desert roads: desert
- Train travel @travel @trains ~ train, rail, sleeper train, railway
  Sleeper trains: sleeper | Scenic railways: scenic | Japan trains: shinkansen | Swiss trains: glacier express, swiss | Train windows: window
## Culture & Landmarks @travel @TravelPorn @history
- Temples & sacred sites @travel @TravelPorn ~ temple, shrine, mosque, cathedral, church
  Japanese shrines: shrine | Temples: temple | Mosques: mosque | Cathedrals: cathedral | Monasteries: monastery
- Ancient wonders @travel @history ~ ruins, ancient, pyramid, machu picchu, petra
  Petra: petra | Machu Picchu: machu picchu | Pyramids: pyramid | Angkor: angkor | Roman ruins: roman, colosseum
- Festivals @travel @festivals ~ festival, carnival, holi, lantern, parade
  Lantern festivals: lantern | Holi: holi | Carnival: carnival | Oktoberfest: oktoberfest | Dia de los Muertos: dia de los muertos
- Museums & art trips @travel @museum ~ museum, gallery, exhibition, louvre
  Louvre: louvre | Art galleries: gallery | Exhibitions: exhibition | Science museums: science | Architecture tours: architecture
## Travel Logistics @travel @onebag @awardtravel
- Packing @onebag @travel ~ packing, pack, carry on, onebag, luggage
  Onebag setups: onebag, one bag | Carry-ons: carry on | Packing cubes: cubes | Suitcases: suitcase | Flat lays: flat lay
- Hotels & stays @travel @hotels ~ hotel, room, view, resort, airbnb
  Hotel views: view | Overwater villas: overwater | Ryokans: ryokan | Treehouse stays: treehouse | Capsule hotels: capsule
- Airports & flights @travel @awardtravel ~ lounge, business class, flight, airport
  Lounges: lounge | Business class: business class | Window seats: window | Long hauls: long haul | Points redemptions: points
- Travel journals @travel @journaling ~ journal, travel journal, scrapbook, map
  Journals: journal | Scrapbooks: scrapbook | Scratch maps: scratch map | Passport stamps: passport | Postcards: postcard

# Fishing {fishing} > camping, aquariums, wildlife-nature, overlanding @Fishing @flyfishing @bassfishing
## Freshwater @Fishing @bassfishing @troutfishing
- Bass fishing @!bassfishing ~ bass, largemouth, smallmouth, pb
  Largemouth: largemouth | Smallmouth: smallmouth | Personal bests: pb, personal best | Topwater: topwater, frog | Kayak bass: kayak
- Trout @troutfishing @flyfishing ~ trout, rainbow, brown trout, brookie
  Rainbows: rainbow | Brown trout: brown | Brook trout: brookie, brook | Cutthroats: cutthroat | Golden trout: golden
- Pike & musky @Fishing @Muskyfishing ~ pike, musky, muskie
  Pike: pike | Musky: musky, muskie | Teeth shots: teeth | Big lures: lure | Ice-out: ice out
- Catfish & carp @catfishing @Carpfishing ~ catfish, carp, flathead, blue cat
  Flatheads: flathead | Blue cats: blue | Carp: carp | Night fishing: night | Giants: giant, huge
## Fly Fishing @flyfishing @flytying
- Fly casting @!flyfishing ~ fly fishing, fly, cast, river
  River shots: river | Streamers: streamer | Dry flies: dry fly | Euro nymphing: nymph | Mountain streams: stream
- Fly tying @!flytying ~ fly, flies, tied, tying, vise
  Dry flies: dry | Streamers: streamer | Nymphs: nymph | Fly boxes: box | Bench setups: bench, vise
- Fly gear @flyfishing @FlyFishingGear ~ rod, reel, waders, net
  Bamboo rods: bamboo | Reels: reel | Nets: net | Waders: waders | Packs: pack
- Saltwater fly @flyfishing @saltwaterfishing ~ bonefish, tarpon, permit, flats
  Bonefish: bonefish | Tarpon: tarpon | Permit: permit | Redfish: redfish | Flats: flats
## Saltwater @saltwaterfishing @Fishing
- Inshore @saltwaterfishing @Fishing ~ redfish, snook, speckled trout, inshore
  Redfish: redfish | Snook: snook | Specks: speckled, speck | Flounder: flounder | Sheepshead: sheepshead
- Offshore @saltwaterfishing @Fishing ~ tuna, mahi, marlin, offshore, wahoo
  Tuna: tuna | Mahi: mahi | Marlin: marlin | Wahoo: wahoo | Swordfish: swordfish
- Surf & pier @surffishing @saltwaterfishing ~ surf, pier, beach, jetty
  Surf fishing: surf | Pier catches: pier | Jetties: jetty | Sharks from shore: shark | Striped bass: striper, striped bass
- Kayak fishing @kayakfishing @Fishing ~ kayak, kayak fishing, yak
  Kayak rigs: rig, setup | Kayak catches: catch | Pedal kayaks: pedal | Ocean kayaking: ocean | Kayak bass: bass
## Ice & Wild Fishing @IceFishing @Fishing
- Ice fishing @!IceFishing ~ ice, ice fishing, hole, auger
  Shacks: shack, shanty | Walleye: walleye | Perch: perch | Lake trout: lake trout | Setups: setup, flasher
- Remote trips @Fishing @flyfishing ~ remote, wilderness, alaska, fly-in, backcountry
  Alaska trips: alaska | Fly-in lakes: fly in | Backcountry lakes: backcountry | Canada trips: canada | Boat trips: trip
- Spearfishing @Spearfishing @saltwaterfishing ~ spearfishing, speargun, freedive
  Spearguns: speargun | Reef catches: reef | Freediving: freedive | Lobster dives: lobster | Hogfish: hogfish
- Bowfishing @Bowfishing @Fishing ~ bowfishing, bow, carp, gar
  Gar: gar | Carp: carp | Night bowfishing: night | Boat rigs: boat | Bows: bow
## Tackle & Boats @FishingGear @Fishing @boating
- Lures & baits @FishingGear @bassfishing ~ lure, lures, bait, swimbait, crankbait
  Swimbaits: swimbait | Crankbaits: crankbait | Handmade lures: handmade, made | Tackle boxes: tackle box | Soft plastics: plastic
- Rods & reels @FishingGear @Fishing ~ rod, reel, combo, baitcaster
  Baitcasters: baitcaster | Spinning reels: spinning | Custom rods: custom | Collections: collection | Vintage reels: vintage
- Boats @boating @Fishing ~ boat, jon boat, bass boat, center console
  Jon boat builds: jon boat | Bass boats: bass boat | Center consoles: center console | Restorations: restored | Boat setups: setup
- Catch & cook @Fishing @Cooking ~ catch and cook, fried, cooked, fillet
  Fish fries: fried | Fillets: fillet | Grilled fish: grilled | Sashimi catches: sashimi | Smoked fish: smoked

# Wildlife & Nature {wildlife-nature} > birds, hiking, photography, cats, dogs @NatureIsFuckingLit @wildlifephotography @natureporn
## Wildlife @wildlifephotography @NatureIsFuckingLit @animals
- Big mammals @wildlifephotography @NatureIsFuckingLit ~ bear, moose, elk, deer, bison
  Bears: bear | Moose: moose | Elk: elk | Deer: deer | Bison: bison
- African safari @wildlifephotography @africa ~ safari, elephant, giraffe, zebra, rhino
  Elephants: elephant | Giraffes: giraffe | Zebras: zebra | Rhinos: rhino | Hippos: hippo
- Small mammals @wildlifephotography @aww ~ fox, squirrel, otter, raccoon, hedgehog
  Foxes: fox | Squirrels: squirrel | Otters: otter | Raccoons: raccoon | Hedgehogs: hedgehog
- Marine life @NatureIsFuckingLit @scuba ~ whale, dolphin, seal, shark, octopus
  Whales: whale | Dolphins: dolphin | Seals: seal | Sharks: shark | Octopus: octopus
## Landscapes @EarthPorn @natureporn @LandscapePhotography
- Mountains & valleys @EarthPorn @natureporn ~ mountain, valley, peak, range
  Valleys: valley | Peaks: peak | Mountain lakes: lake | Glaciers: glacier | Cloud inversions: inversion, clouds
- Coasts & oceans @EarthPorn @natureporn ~ coast, ocean, sea, cliffs, waves
  Sea cliffs: cliff | Stormy seas: storm | Tide pools: tide pool | Sea stacks: sea stack | Black sand: black sand
- Forests @EarthPorn @natureporn ~ forest, woods, trees, redwood
  Redwoods: redwood | Autumn forests: autumn, fall | Mossy forests: moss | Bamboo forests: bamboo | Old growth: old growth
- Weather & skies @weather @EarthPorn ~ storm, lightning, clouds, tornado, rainbow
  Lightning: lightning | Supercells: supercell | Tornadoes: tornado | Rainbows: rainbow | Mammatus clouds: mammatus
## Macro & Small Life @macrophotography @insects @mycology
- Insects @insects @macrophotography ~ insect, bug, bee, butterfly, moth
  Butterflies: butterfly | Moths: moth | Bees: bee | Beetles: beetle | Dragonflies: dragonfly
- Spiders @spiders @macrophotography ~ spider, jumping spider, web, orb weaver
  Jumping spiders: jumping spider | Orb weavers: orb weaver | Webs: web | Wolf spiders: wolf spider | Huntsman: huntsman
- Mushrooms & fungi @mycology @foraging ~ mushroom, fungi, fungus, mycology
  Amanitas: amanita | Chanterelles: chanterelle | Bioluminescent: glow, bioluminescent | Shelf fungi: shelf | Morels: morel
- Wildflowers @wildflowers @natureporn ~ wildflower, wildflowers, bloom, superbloom
  Superblooms: superbloom | Alpine flowers: alpine | Orchids: orchid | Lupines: lupine | Poppies: poppy
## Natural Wonders @EarthPorn @natureporn @geology
- Caves & caverns @caving @EarthPorn ~ cave, cavern, ice cave, grotto
  Ice caves: ice cave | Glowworm caves: glowworm | Sea caves: sea cave | Cenotes: cenote | Stalactites: stalactite
- Geology & rocks @geology @whatsthisrock ~ rock, mineral, crystal, geode, fossil
  Crystals: crystal | Geodes: geode | Fossils: fossil | Minerals: mineral | Rock formations: formation
- Volcanoes & geysers @volcanoes @EarthPorn ~ volcano, lava, eruption, geyser
  Eruptions: eruption | Lava flows: lava | Geysers: geyser | Hot springs: hot spring | Craters: crater
- Ice & snow @EarthPorn @natureporn ~ glacier, iceberg, ice, frozen, snow
  Glaciers: glacier | Icebergs: iceberg | Frozen waterfalls: frozen waterfall | Frost: frost | Snowscapes: snow
## Conservation & Rescue @Animalrescue @conservation @wildlife
- Wildlife rescue @Animalrescue @wildlife ~ rescue, rescued, rehab, release
  Releases: release | Baby animals: baby | Injured wildlife: injured | Sanctuaries: sanctuary | Rehab updates: update
- Trail cams @trailcam @wildlife ~ trail cam, trailcam, camera trap, game camera
  Night captures: night | Predators: cougar, wolf, coyote | Bears on cam: bear | Funny captures: funny | Backyard cams: backyard
- Conservation wins @conservation @wildlife ~ conservation, protected, restored, comeback
  Rewilding: rewilding | Species comebacks: comeback, back | Habitat restoration: restoration, restored | Cleanups: cleanup | Reforestation: planted, trees
- Zoos & aquariums @zoos @Aquariums ~ zoo, aquarium, enclosure
  Zoo babies: baby | Aquarium visits: aquarium | Enrichment: enrichment | Big enclosures: enclosure | Keeper life: keeper

# Space & Astronomy {astronomy} > photography, wildlife-nature, aviation, electronics-diy @astrophotography @space @Astronomy
## Astrophotography @!astrophotography @AskAstrophotography
- Deep sky @astrophotography ~ nebula, galaxy, deep sky, m31, m42, orion
  Nebulae: nebula | Galaxies: galaxy, andromeda, m31 | Orion: orion, m42 | Star clusters: cluster | Mosaics: mosaic
- Planets @astrophotography @Astronomy ~ jupiter, saturn, mars, planetary
  Jupiter: jupiter | Saturn: saturn | Mars: mars | Venus: venus | Planet lineups: planets
- Moon shots @astrophotography @Astronomy ~ moon, lunar, full moon, crescent
  Full moons: full moon | Crescents: crescent | Lunar detail: detail, craters | Moon and planes: plane | Blood moons: blood moon, eclipse
- Sun & eclipses @astrophotography @solar ~ sun, solar, eclipse, sunspot, prominence
  Solar eclipses: eclipse | Sunspots: sunspot | Prominences: prominence | H-alpha: h-alpha, ha | Transits: transit
## Night Sky @astrophotography @Astronomy @auroraborealis
- Milky Way @astrophotography ~ milky way, galactic core, night sky
  Galactic cores: core | Milky Way arches: arch | Dark sky parks: dark sky | Milky Way over water: reflection, lake | Desert skies: desert
- Auroras @auroraborealis @astrophotography ~ aurora, northern lights, southern lights
  Northern lights: northern lights | Aurora coronas: corona | Unexpected auroras: unexpected, south | Red auroras: red | Aurora selfies: me
- Meteors & comets @astrophotography @Astronomy ~ meteor, comet, perseids, shooting star
  Comets: comet | Perseids: perseid | Fireballs: fireball | Geminids: geminid | Meteor showers: shower
- Star trails @astrophotography ~ star trails, startrail, polaris, rotation
  Polaris circles: polaris | Trail stacks: stack | Trails over landscapes: landscape | Trails with trees: tree | Timelapse frames: timelapse
## Telescopes & Gear @telescopes @Astronomy
- Telescopes @!telescopes ~ telescope, scope, dobsonian, refractor
  Dobsonians: dobsonian, dob | Refractors: refractor | Smart scopes: seestar, smart telescope | First scopes: first | Big scopes: big, 16
- Astro rigs @AskAstrophotography @astrophotography ~ rig, setup, mount, guiding
  Mounts: mount | Guide scopes: guide | Astro cameras: camera | Backyard rigs: backyard | Portable rigs: portable
- Observatories @telescopes @Astronomy ~ observatory, dome, roll off roof
  Backyard observatories: backyard | Domes: dome | Roll-off roofs: roll off | Big observatories: observatory | Remote observatories: remote
- Sketching & observing @Astronomy @telescopes ~ sketch, observing, eyepiece, log
  Sketches: sketch | Eyepieces: eyepiece | Observing logs: log | Star parties: star party | Through the eyepiece: through
## Spaceflight @space @SpaceXLounge @spacex
- Rocket launches @spacex @space @SpaceXLounge ~ launch, rocket, falcon, starship
  Starship: starship | Falcon 9: falcon | Launch trails: trail | Night launches: night | Landings: landing, booster
- Space station views @space @ISS ~ iss, space station, from space, orbit
  ISS passes: iss | Earth from orbit: earth | Astronaut photos: astronaut | Night Earth: night | Cupola views: cupola
- Space telescopes @space @jwst ~ jwst, webb, hubble, telescope image
  Webb images: jwst, webb | Hubble images: hubble | Deep fields: deep field | Exoplanets: exoplanet | Nebula releases: nebula
- Space missions @space @nasa ~ mars, rover, artemis, probe, mission
  Mars rovers: rover, perseverance | Artemis: artemis | Probes: probe | Moon landings: moon | Mission patches: patch
## Space Culture @space @spaceporn
- Space art @spaceporn @space ~ art, render, painting, illustration
  Renders: render | Paintings: painting | Retro space art: retro | Planet art: planet | Posters: poster
- Space collectibles @space @lego ~ model, lego, collection, meteorite
  Rocket models: model | Lego space: lego | Meteorites: meteorite | Patches: patch | Signed items: signed
- Museums & centers @space @nasa ~ museum, kennedy, space center, smithsonian
  Kennedy Space Center: kennedy | Space Shuttles: shuttle | Smithsonian: smithsonian | Saturn V: saturn v | Space camps: space camp
- Kids & space @space @Astronomy ~ kid, son, daughter, first time
  First looks: first time | Space rooms: room | School projects: project | Planetarium trips: planetarium | Telescope gifts: gift
`;
export default source;
