// Vehicle topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Cars {cars} > motorcycles, overlanding, aviation, photography, collectibles-toys @cars @carporn @Autos
## Car Spotting @spotted @carporn @cars
- Daily spots @spotted @cars ~ spotted, saw, seen, found this, parking lot
  Parking lot finds: parking lot, parked | Rare spots: rare, unicorn | Classics in the wild: classic, old | Exotics spotted: ferrari, lamborghini, mclaren, porsche | Odd cars: weird, strange, odd
- Supercars @spotted @supercars @carporn ~ ferrari, lamborghini, mclaren, bugatti, koenigsegg, pagani, supercar
  Ferrari: ferrari | Lamborghini: lamborghini | McLaren: mclaren | Hypercars: bugatti, koenigsegg, pagani | Supercar meets: meet, gathering
- Car shows @carshow @cars @spotted ~ car show, cars and coffee, meet, show
  Cars and coffee: cars and coffee | Concours: concours, pebble beach | Tuner shows: sema, tuner | Classic shows: classic, vintage | Local meets: local, meet
- Car photography @carporn @Autos ~ photo, shot, shoot, rolling shot
  Rolling shots: rolling, roller | Night shoots: night | Studio shots: studio | Rain shots: rain | Detail shots: detail, details
## JDM & Tuning @JDM @Miata @projectcar
- JDM classics @JDM @cars ~ jdm, supra, skyline, rx7, nsx, silvia, ae86
  Skylines: skyline, gtr, r34, r32 | Supras: supra | RX-7s: rx7, rx-7, fd | Silvias: silvia, s14, s15 | AE86: ae86
- Miata life @!Miata @MX5 ~ miata, mx5, mx-5, na, nd
  NA Miatas: na | NB Miatas: nb | ND Miatas: nd | Track Miatas: track | Pop-up headlights: popup, pop up
- Builds & mods @projectcar @Cartalk @JDM ~ mod, modded, build, project, swap
  Engine swaps: swap, swapped | Wheels: wheels, rims | Stance: stance, lowered, slammed | Body kits: body kit, widebody | Turbo builds: turbo
- Drift & time attack @Drifting @Autocross @Trackdays ~ drift, drifting, time attack, track day, autocross
  Drift cars: drift | Track days: track day, track | Autocross: autocross | Time attack: time attack | Pit shots: pit, paddock
## Classic Cars @classiccars @ClassicCars @projectcar
- Classic finds @classiccars @projectcar ~ barn find, found, classic, vintage
  Barn finds: barn find, barn | Junkyard finds: junkyard | Garage finds: garage | Field finds: field | Estate finds: estate
- Restorations @projectcar @classiccars @Autobody ~ restoration, restored, restore, rust
  Rust repair: rust | Paint jobs: paint | Interiors: interior | Frame-off: frame off, rotisserie | Before & after: before, after
- Muscle cars @musclecar @classiccars ~ mustang, camaro, charger, challenger, corvette, chevelle
  Mustangs: mustang | Camaros: camaro | Mopar: charger, challenger, mopar, cuda | Corvettes: corvette | Chevelles: chevelle
- European classics @classiccars @porsche @BMW ~ porsche 911, e30, beetle, mercedes, alfa
  Porsche 911: 911 | BMW E30: e30 | VW Beetles: beetle, bug | Mercedes classics: mercedes, w123 | Italians: alfa, fiat, lancia
## Detailing & Care @AutoDetailing @Detailing @cars
- Washes @AutoDetailing @Detailing ~ wash, washed, foam, snow foam
  Foam cannons: foam | Two bucket: bucket | Rinseless: rinseless | Winter washes: winter, salt | Satisfying washes: satisfying
- Paint correction @AutoDetailing @Detailing ~ correction, polish, compound, swirls
  50/50 shots: 50/50, half | Swirl removal: swirl, swirls | Ceramic coating: ceramic, coating | Wet sanding: wet sand | Mirror finishes: mirror, gloss
- Interior details @AutoDetailing @Detailing ~ interior, seats, carpet, dirty
  Dirty interiors: dirty, gross, filthy | Leather care: leather | Steam cleaning: steam | Pet hair: pet hair, dog hair | Before & after: before, after
- Wraps & PPF @CarWraps @AutoDetailing ~ wrap, wrapped, ppf, vinyl
  Color wraps: color, wrap | Chrome deletes: chrome delete | Full PPF: ppf | Satin finishes: satin | Livery wraps: livery
## EVs & New Cars @electricvehicles @teslamotors @Rivian
- EV deliveries @electricvehicles @teslamotors @Rivian ~ delivery, picked up, new, finally
  Tesla deliveries: tesla, model y, model 3 | Rivian deliveries: rivian, r1s, r1t, r2 | Other EVs: ioniq, mach-e, ev6 | Delivery day: delivery day | First impressions: first impression
- Charging setups @electricvehicles @teslamotors ~ charger, charging, wall connector, supercharger
  Home chargers: home charger, wall connector | Superchargers: supercharger | Solar charging: solar | Road trips: road trip, trip | Charging fails: fail, broken
- EV interiors & tech @teslamotors @electricvehicles ~ interior, screen, dashboard, cabin
  Screens: screen | Interiors: interior | Accessories: accessory, accessories | Camping mode: camp, camping | Tech features: fsd, autopilot
- New car days @cars @whatcarshouldIbuy ~ new car, just bought, picked up, finally
  First cars: first car | Dream cars: dream car | Dealership pickups: dealership | Family cars: family | Upgrades: upgrade, upgraded

# Motorcycles {motorcycles} > cars, overlanding, travel, cycling @motorcycles @motorcycle @Motorrad
## Bikes & Builds @motorcycles @CafeRacers
- First bikes @motorcycles @SuggestAMotorcycle ~ first bike, first motorcycle, new bike
  Beginner bikes: beginner, rebel, ninja 400, mt-03 | Used finds: used | License days: license, passed | Gear hauls: gear | Garage shots: garage
- Cafe racers @!CafeRacers @caferacer ~ cafe racer, cafe, build
  Builds: build | Tank designs: tank | Seat swaps: seat | Clubman bars: clip ons, clubman | Garage builds: garage
- Customs & choppers @Choppers @Harley @motorcycles ~ chopper, custom, bobber, harley
  Choppers: chopper | Bobbers: bobber | Baggers: bagger | Paint jobs: paint | Harley builds: harley
- Restorations @motorcycles @VintageMotorcycles ~ restoration, restored, vintage, barn find
  Barn finds: barn find | Vintage Hondas: honda, cb750, cb | Engine rebuilds: engine | Paint & chrome: paint, chrome | Before & after: before, after
## Riding & Touring @motorcycles @advrider @MotoUK
- Twisties @motorcycles @Motorrad ~ ride, riding, twisties, road, pass
  Mountain passes: pass, mountain | Coastal roads: coast, coastal | Forest roads: forest | Sunset rides: sunset | Group rides: group
- Touring trips @advrider @motorcycles ~ trip, tour, touring, road trip, miles
  Long-haul trips: miles, km, cross country | Luggage setups: luggage, panniers | Camping by bike: camping, camp | Border crossings: border | Iconic roads: route 66, alps, stelvio
- Adventure bikes @advrider @Adventure ~ adv, adventure, gs, africa twin, tenere
  BMW GS: gs, 1250, 1300 | Africa Twin: africa twin | Tenere: tenere, t7 | Off-road ADV: offroad, off road | Packed for trips: packed
- Commuting @motorcycles @scooters ~ commute, commuting, daily, scooter
  Daily riders: daily | Scooters: scooter, vespa | Rain rides: rain | Winter riding: winter, cold | City parking: parking
## Sport & Track @motorcycles @trackdays @sportbikes
- Sportbikes @motorcycles @sportbikes ~ r1, r6, cbr, gsxr, ninja, panigale, sportbike
  Yamaha R: r1, r6, r7 | Honda CBR: cbr | Kawasaki Ninja: ninja, zx | Ducati Panigale: panigale | Suzuki GSX-R: gsxr, gsx-r
- Track days @trackdays @motorcycles ~ track day, track, knee down, circuit
  Knee down: knee down | Track prep: prep | Race bikes: race | Pit lanes: pit | Lap times: lap
- MotoGP & racing @motogp @motorcycles ~ motogp, racing, race, superbike
  MotoGP: motogp | Superbikes: wsbk, superbike | Race paddocks: paddock | Race liveries: livery | Fan days: fan
- Naked & streetfighters @motorcycles @nakedbikes ~ naked, streetfighter, mt-09, street triple, duke
  MT-09: mt-09, mt09 | Street Triple: street triple | KTM Duke: duke | Streetfighters: streetfighter | Z900: z900
## Dirt & Off-road @Dirtbikes @motocross @enduro
- Dirt bikes @!Dirtbikes ~ dirt bike, dirtbike, crf, yz, kx
  First dirt bikes: first | Trail riding: trail | Pit bikes: pit bike | Mud days: mud | Garage builds: build
- Motocross @!motocross @Dirtbikes ~ motocross, mx, track, jump
  Jumps: jump, air | Races: race | Track days: track | Whips: whip | Crashes: crash
- Enduro @enduro @Dirtbikes ~ enduro, hard enduro, single track
  Hard enduro: hard enduro | Rock gardens: rocks | Hill climbs: hill climb | Water crossings: water | Forest trails: forest
- Trials & minis @Dirtbikes @motorcycles ~ trials, mini, grom, monkey
  Groms: grom | Honda Monkey: monkey | Trials bikes: trials | Kid bikes: kid, son, daughter | Pit bikes: pit bike
## Gear & Garage @motorcycles @motorcyclegear
- Helmets @motorcycles @motorcyclegear ~ helmet, helmets, shoei, arai, agv
  Shoei: shoei | Arai: arai | AGV: agv | Custom paint: custom, paint | Crash damage: crash, damage
- Riding gear @motorcycles @motorcyclegear ~ jacket, gear, leathers, boots, gloves
  Leather jackets: leather | Race suits: suit, leathers | Boots: boots | Gloves: gloves | ATGATT: atgatt, all the gear
- Garages @motorcycles @Garages ~ garage, workshop, shop, collection
  Bike collections: collection | Garage setups: setup | Lifts & stands: lift, stand | Tools: tools | Small garages: small, shed
- Crashes & lessons @motorcycles @SafeMotorcycling ~ crash, crashed, down, accident, survived
  Gear saved me: saved, gear | Bike damage: damage | Lowsides: lowside | Road rash: road rash | Back riding: back, recovered

# Cycling {cycling} > running, hiking, travel, motorcycles @bicycling @cycling @bikecommuting
## Road Cycling @bicycling @cycling @Velo
- Road bikes @bicycling @cycling ~ road bike, carbon, canyon, specialized, trek
  First road bikes: first | Carbon builds: carbon | Aero bikes: aero | Steel frames: steel | Bike checks: bike check, nbd, new bike day
- Group rides & events @cycling @bicycling ~ group ride, gran fondo, race, sportive, crit
  Gran fondos: gran fondo, fondo | Crits: crit | Club rides: club | Charity rides: charity | Race photos: race
- Climbs & views @cycling @bicycling ~ climb, climbing, col, mountain, view
  Alpine cols: col, alps | Summit selfies: summit, top | Switchbacks: switchback | Coastal rides: coast | Sunrise rides: sunrise
- Pro racing @peloton @Velo ~ tour de france, giro, vuelta, peloton
  Tour de France: tour de france, tdf | Giro: giro | Classics: roubaix, flanders | Pro bikes: pro bike | Fan moments: fan
## Mountain Biking @MTB @mountainbiking
- Trail riding @MTB @mountainbiking ~ trail, trails, ride, single track
  Forest trails: forest | Desert trails: desert | Bike park days: bike park | Muddy rides: mud, muddy | Golden hour: sunset, golden
- MTB builds @MTB ~ build, bike check, new bike, enduro, trail bike
  Enduro bikes: enduro | Downhill bikes: downhill, dh | Hardtails: hardtail | eMTB: ebike, emtb | Dream builds: dream
- Jumps & tricks @MTB @Dirtjumping ~ jump, drop, gap, send, air
  Drops: drop | Gaps: gap | Dirt jumps: dirt jump, dj | Whips: whip | Crashes: crash
- Trail building @MTB @trailbuilding ~ trail build, built, berm, digging
  Berms: berm | Jumps built: jump | Backyard trails: backyard | Pump tracks: pump track | Tools: tools
## Commuting & City @bikecommuting @fuckcars @ebikes
- Bike commutes @!bikecommuting ~ commute, commuting, work, city
  Winter commutes: winter, snow | Rain commutes: rain | Commuter setups: setup, panniers | Bike parking: parking | Infrastructure: bike lane, lane
- Cargo bikes @CargoBike @bikecommuting ~ cargo bike, cargo, bakfiets, longtail
  Kid haulers: kid, kids | Grocery runs: grocery | Longtails: longtail | Bakfiets: bakfiets | Dog carriers: dog
- E-bikes @ebikes @bikecommuting ~ ebike, e-bike, electric bike, conversion
  Commuter e-bikes: commuter | Conversions: conversion, kit | Fat tire: fat tire | Folding e-bikes: folding | Batteries: battery
- Folding & city bikes @Brompton @bikecommuting ~ brompton, folding, dutch bike, city bike
  Bromptons: brompton | Dutch bikes: dutch | Fixies: fixie, fixed gear | Vintage city bikes: vintage | Train combos: train
## Bikepacking & Touring @bikepacking @bicycletouring
- Bikepacking rigs @!bikepacking ~ bikepacking, setup, rig, bags
  Frame bags: frame bag | Ultralight rigs: ultralight | Gravel rigs: gravel | Fat bike rigs: fat bike | First rigs: first
- Bike tours @bicycletouring @bikepacking ~ tour, touring, trip, miles, km
  Cross-country: cross country, across | Europe tours: europe | Coast tours: coast | Mountain tours: mountain | Long-term tours: months, year
- Gravel @gravelcycling @bicycling ~ gravel, gravel bike, gravel ride
  Gravel bikes: gravel bike | Gravel races: unbound, race | Dusty roads: dust, dusty | Gravel camps: camp | Mixed terrain: mixed
- Bike camping @bikepacking @bicycletouring ~ camp, camping, tent, wild camp
  Wild camps: wild camp | Tent setups: tent | Hammocks: hammock | Camp cooking: cooking | Night skies: night, stars
## Bike Builds & Repair @bikewrench @bicycling @bicycletouring
- Workshops @bikewrench @bicycling ~ workshop, garage, repair stand, tools
  Home workshops: home, garage | Tool walls: tools, wall | Repair stands: stand | Storage: storage | Shop visits: shop
- Restorations @bicycling @vintagecycling ~ restore, restored, vintage, restoration
  Vintage steel: steel, vintage | Rust rescues: rust | Paint jobs: paint, respray | Before & after: before, after | Found bikes: found, free
- Wheel builds @bikewrench @bicycling ~ wheel, wheels, wheel build, spokes
  Wheel builds: wheel build | Carbon wheels: carbon | Hubs: hub, hubs | Truing: true, truing | Tubeless: tubeless
- Broken parts @bikewrench @bicycling ~ broken, snapped, crack, failure, crash
  Cracked frames: crack, cracked | Snapped parts: snapped | Crash damage: crash | Worn parts: worn, wear | Warranty: warranty

# Overlanding & Off-road {overlanding} > camping, cars, van-life, travel, hiking @overlanding @Jeep @4x4
## Overland Rigs @overlanding @4Runner @Tacoma
- Rig builds @overlanding @4Runner @Tacoma ~ build, rig, setup, overland
  4Runners: 4runner | Tacomas: tacoma | Land Cruisers: land cruiser, lc | Jeeps: jeep, wrangler | Budget rigs: budget
- Rooftop tents @overlanding @camping ~ rooftop tent, rtt, roof top tent
  Hardshell RTTs: hardshell | Softshell RTTs: softshell | Truck bed tents: bed tent | Setup shots: setup | Night camps: night
- Truck campers @overlanding @truckcampers ~ truck camper, camper, slide in, four wheel camper
  Pop-up campers: pop up | Slide-ins: slide in | DIY campers: diy | Interiors: interior | Winter camping: winter, snow
- Trailers @overlanding @camping ~ trailer, off road trailer, teardrop
  Off-road trailers: off road trailer | Teardrops: teardrop | DIY trailers: diy | Kitchen setups: kitchen | Hitch setups: hitch
## Trails & Off-roading @4x4 @Jeep @offroad
- Trail runs @4x4 @offroad @Jeep ~ trail, trails, wheeling, offroad, off road
  Rock crawling: rock, crawling | Mud runs: mud | Snow wheeling: snow | Desert runs: desert, dunes | Water crossings: water crossing, water
- Jeep life @!Jeep @Wrangler ~ jeep, wrangler, gladiator, rubicon
  Wranglers: wrangler | Gladiators: gladiator | Rubicons: rubicon | Jeep builds: build, lift | Jeep waves: wave, meet
- Lifts & mods @4x4 @Toyota ~ lift, lifted, suspension, tires, 35s, 37s
  Lift kits: lift | Big tires: 35, 37, tires | Bumpers & winches: bumper, winch | Armor: armor, sliders | Lights: light bar, lights
- Recoveries & fails @4x4 @offroad ~ stuck, recovery, winch, rollover, broke
  Stuck: stuck | Recoveries: recovery | Rollovers: rollover, flipped | Broken axles: axle, broke | Winching: winch
## Camping Setups @overlanding @CampingandHiking
- Camp kitchens @overlanding @camping ~ kitchen, camp kitchen, cooking, stove
  Drawer systems: drawer, drawers | Fridges: fridge | Slide-outs: slide out | Camp coffee: coffee | Meals: meal, dinner
- Power setups @overlanding @vandwellers ~ solar, battery, power station, dual battery
  Solar panels: solar | Dual batteries: dual battery | Power stations: power station, ecoflow | Wiring: wiring | Inverters: inverter
- Camp spots @overlanding @camping ~ camp spot, campsite, spot, camp
  Mountain camps: mountain | Desert camps: desert | Beach camps: beach | Forest camps: forest | Lake camps: lake
- Organization @overlanding ~ storage, organization, drawers, setup
  Drawer builds: drawer | Molle panels: molle | Roof racks: roof rack, rack | Bins & boxes: bin, box | Interior racks: interior
## Expeditions @overlanding @roadtrip
- Long expeditions @overlanding @roadtrip ~ expedition, trip, journey, miles, months
  Pan-American: pan american, panamerican | Africa crossings: africa | Australian outback: australia, outback | Iceland: iceland | Central Asia: mongolia, kazakhstan
- Road trips @roadtrip @overlanding ~ road trip, roadtrip, drive
  National parks: national park | Coast drives: coast | Mountain drives: mountain | Desert drives: desert | Weekend trips: weekend
- Off-grid life @overlanding @vandwellers ~ off grid, living, full time
  Full-timers: full time | Families: family, kids | Dogs on trips: dog | Remote work: remote, starlink | Winter living: winter
- Navigation & maps @overlanding ~ map, route, navigation, gps
  Paper maps: map | Route plans: route | GPS units: gps, garmin | Trail apps: app, gaia | Waypoints: waypoint
## Vehicles & Builds @overlanding @projectcar
- Land Cruisers @LandCruisers @overlanding ~ land cruiser, 80 series, 100 series, 70 series, lx
  80 Series: 80 series, fzj80 | 100 Series: 100 series | 70 Series: 70 series | 200 Series: 200 series | LX builds: lx
- Defenders & classics @LandRover @overlanding ~ defender, land rover, series, discovery
  New Defenders: new defender | Classic Defenders: classic, 110, 90 | Series Land Rovers: series | Discoveries: discovery | Restorations: restored
- Vans 4x4 @VanLife @overlanding ~ sprinter 4x4, 4x4 van, awd van, van
  Sprinter 4x4: sprinter | Transit AWD: transit | Syncro: syncro | Van builds: build | Lifted vans: lifted
- Budget overlanders @overlanding @4x4 ~ budget, cheap, old, high miles
  Old Pajeros: pajero, montero | Old Tacomas: old tacoma | Subaru builds: subaru, outback, forester | Minivan builds: minivan | Cheap mods: cheap

# Aviation {aviation} > travel, photography, cars, home-lab @aviation @flying @planespotting
## Planespotting @planespotting @aviation
- Airport spotting @planespotting @aviation ~ spotted, spotting, airport, landing, takeoff
  Landings: landing | Takeoffs: takeoff | Night spotting: night | Crosswinds: crosswind | Special liveries: livery
- Rare aircraft @aviation @planespotting ~ rare, an-225, concorde, 747, a380
  747s: 747 | A380s: a380 | Antonov: antonov | Retro liveries: retro livery | Rare visits: rare, visit
- Window views @aviation @travel ~ window, window seat, view, wing
  Wing views: wing | Sunset flights: sunset | Mountain views: mountain | City lights: city, night | Cloud tops: clouds
- Airshows @aviation @airshow ~ airshow, display, flyover, formation
  Formations: formation | Blue Angels: blue angels | Red Arrows: red arrows | Fighters: fighter, f-22, f-35 | Warbirds: warbird, spitfire, p-51
## Military Aviation @MilitaryPorn @aviation @WarplanePorn
- Fighter jets @aviation @WarplanePorn ~ f-35, f-16, f-22, eurofighter, rafale, fighter
  F-35: f-35, f35 | F-16: f-16, f16 | Rafale: rafale | Eurofighter: eurofighter, typhoon | Gripen: gripen
- Warbirds @aviation @WarplanePorn ~ warbird, spitfire, p-51, mustang, b-17, ww2
  Spitfires: spitfire | Mustangs: p-51, mustang | Bombers: b-17, b-29, lancaster | Corsairs: corsair | Restorations: restoration
- Helicopters @Helicopters @aviation ~ helicopter, heli, chopper, black hawk, chinook
  Rescue helis: rescue | Military helis: black hawk, apache, chinook | News & EMS: ems, medical | Heli cockpits: cockpit | Small helis: robinson, r44
- Carriers & bases @aviation @navy ~ carrier, base, flight deck, hangar
  Flight decks: flight deck | Hangars: hangar | Catapults: catapult | Base visits: base | Flyovers: flyover
## Flying & Pilots @flying @aviation
- Student pilots @flying @aviation ~ student pilot, first solo, checkride, solo
  First solos: first solo, solo | Checkrides: checkride, passed | Cessnas: cessna, 172 | Ground school: ground school | Logbooks: logbook
- Cockpits @aviation @flying ~ cockpit, flight deck, panel, glass cockpit
  Glass cockpits: glass, g1000 | Airliner cockpits: airliner, 737, a320 | Vintage cockpits: vintage | Night cockpits: night | Cockpit views: view
- General aviation @flying @aviation ~ cessna, piper, cirrus, bonanza, small plane
  Cessnas: cessna | Pipers: piper | Cirrus: cirrus | Bush planes: bush, super cub | Fly-ins: fly in, fly-in
- Pilot life @flying @aviation ~ pilot, crew, layover, uniform
  Layovers: layover | Crew photos: crew | Uniforms: uniform | Career milestones: hired, career | Long hauls: long haul
## Airports & Airlines @aviation @airliners
- Airports @aviation @airports ~ airport, terminal, gate, runway
  Terminals: terminal | Gates: gate | Runways: runway | Lounges: lounge | Tiny airports: small airport
- Airline liveries @aviation @airliners ~ livery, special livery, retro livery
  Special liveries: special | Retro liveries: retro | Painted aircraft: painted | New liveries: new livery | Star Alliance: star alliance
- Cabin & class @aviation @awardtravel ~ business class, first class, cabin, suite, seat
  First class: first class | Business class: business class | Economy views: economy | Cabin designs: cabin | Inflight meals: meal
- Boneyards @aviation @AbandonedPorn ~ boneyard, retired, scrapped, storage
  Boneyards: boneyard | Retired jets: retired | Scrapping: scrapped | Abandoned planes: abandoned | Museums: museum
## Sims & Models @flightsim @MSFS @modelmakers
- Flight sim setups @flightsim @MSFS ~ flight sim, msfs, home cockpit, setup
  Home cockpits: home cockpit | Yokes & throttles: yoke, throttle | VR flying: vr | Triple screens: triple | Panels: panel
- Flight sim screenshots @MSFS @flightsim ~ msfs, screenshot, approach, landing
  Approaches: approach | Night flights: night | Weather: storm, weather | Scenery: scenery | Liveries: livery
- Scale models @modelmakers @aviation ~ model, scale model, 1/48, 1/72, kit
  1/72 models: 1/72 | 1/48 models: 1/48 | Weathering: weathering | Dioramas: diorama | Airliner models: airliner
- RC planes @rcplanes @radiocontrol ~ rc plane, rc, foam, glider
  Foam builds: foam | Gliders: glider | Jets: jet | Scale RC: scale | Crashes: crash
`;
export default source;
