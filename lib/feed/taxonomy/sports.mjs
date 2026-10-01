// Sports & fitness topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Fitness & Gym {fitness} > running, climbing, home-cooking, cycling @GYM @Fitness @progresspics
## Transformations @progresspics @loseit @GYM
- Weight loss @!progresspics @loseit ~ lost, lbs, weight loss, down, kg
  First milestones: first, 10 lbs, 20 lbs | 50+ lbs down: 50, 60, 70, 80, 100 | Face gains: face | Year progress: year, 1 year | Maintenance: maintenance, maintaining
- Muscle gain @progresspics @GYM ~ bulk, gained, muscle, gains
  Bulks: bulk, bulking | Skinny to strong: skinny | Year of lifting: year | Glute gains: glute | Back gains: back
- Recomposition @progresspics @GYM ~ recomp, cut, cutting, shred
  Cuts: cut, cutting | Recomps: recomp | Abs: abs | Contest prep: prep, show | Mini cuts: mini cut
- Life changes @progresspics @loseit ~ sober, sobriety, health, life, journey
  Sobriety: sober | Postpartum: postpartum | After surgery: surgery | Over 40: 40, 50 | Mental health: mental health
## Home & Commercial Gyms @homegym @GYM
- Home gyms @!homegym ~ home gym, garage gym, rack, setup
  Garage gyms: garage | Basement gyms: basement | Small home gyms: small, apartment | Rack setups: rack | Budget gyms: budget
- Gym builds & equipment @homegym @GYM ~ rack, barbell, plates, bench, cable
  Power racks: power rack | Barbells: barbell | Plate collections: plates | Cable machines: cable | DIY equipment: diy
- Commercial gyms @GYM @Fitness ~ gym, gym view, equipment, machines
  Gym views: view | Old-school gyms: old school | Hotel gyms: hotel | Empty gyms: empty | Gym rats: gym rat
- Gym fails & funny @GYM @gymsnark ~ fail, funny, why, wtf
  Equipment misuse: misuse | Gym signs: sign | Weird machines: weird | Etiquette: etiquette | Overheard: overheard
## Strength Sports @powerlifting @weightlifting @strongman
- Powerlifting @!powerlifting ~ squat, bench, deadlift, meet, total
  Meet days: meet | PR lifts: pr | Deadlifts: deadlift | Squats: squat | Bench press: bench
- Olympic weightlifting @!weightlifting ~ snatch, clean and jerk, clean, jerk
  Snatches: snatch | Clean and jerks: clean and jerk | Meets: meet | Shoes: shoes | Bar paths: bar path
- Strongman @powerlifting @GYM @weightlifting ~ strongman, atlas stone, log, yoke
  Atlas stones: stone, atlas | Log press: log | Yoke: yoke | Comps: comp, competition | Implements: implement
- Bodybuilding @bodybuilding @GYM ~ bodybuilding, physique, posing, stage
  Stage shots: stage | Posing: posing | Classic physique: classic physique | Natural bodybuilders: natty, natural | Off-season: off season
## Calisthenics & Mobility @bodyweightfitness @calisthenics @yoga
- Calisthenics @GYM @progresspics ~ calisthenics, pull up, handstand, muscle up
  Muscle-ups: muscle up | Planches: planche | Front levers: front lever | Human flags: flag | Street workouts: street, park
- Handstands @GYM @yoga ~ handstand, hand balance, press
  Freestanding: freestanding | Press handstands: press | One-arm: one arm | Progress: progress | Outdoor handstands: beach, outside
- Yoga @!yoga ~ yoga, pose, asana, flow
  Arm balances: arm balance, crow | Inversions: inversion, headstand | Flexibility: flexibility, splits | Outdoor yoga: outdoor, beach | Studio vibes: studio
- Mobility & splits @flexibility @bodyweightfitness ~ splits, flexibility, mobility, stretch
  Front splits: front split | Middle splits: middle split | Backbends: backbend | Pancakes: pancake | Progress: progress
## Nutrition & Food @MealPrepSunday @fitmeals @EatCheapAndHealthy
- Protein meals @fitmeals @MealPrepSunday ~ protein, macros, high protein
  Chicken & rice: chicken and rice | Protein desserts: protein dessert | Egg breakfasts: eggs | Protein bowls: bowl | Shakes: shake
- Meal preps @MealPrepSunday @fitmeals ~ meal prep, prep, containers, week
  Weekly preps: week | Cutting preps: cut | Bulking preps: bulk | Budget preps: budget | Breakfast preps: breakfast
- Supplements @Supplements @Fitness ~ creatine, whey, pre workout, supplement
  Creatine: creatine | Protein powders: whey, protein powder | Pre-workouts: pre workout | Stacks: stack | Hauls: haul
- Fit treats @fitmeals @1200isplenty ~ low calorie, healthy, treat, snack
  Low-cal desserts: dessert | Protein ice cream: ice cream, ninja creami | Snacks: snack | Swaps: swap | Volume eating: volume

# Running {running} > fitness, cycling, hiking, travel @running @trailrunning @AdvancedRunning
## Road Racing @running @AdvancedRunning
- Marathons @marathon @Strava @parkrun ~ marathon, 26.2, bq, boston
  Finish lines: finish, finisher | Medals: medal | Boston: boston, bq | First marathons: first marathon | Majors: berlin, chicago, nyc, london, tokyo
- Half marathons @marathon @Strava @parkrun ~ half marathon, half, 13.1
  First halves: first half | PRs: pr | Medals: medal | Race bibs: bib | Themed halves: disney, themed
- 5K & 10K @parkrun @Strava @marathon ~ 5k, 10k, parkrun, turkey trot
  Parkrun: parkrun | Turkey trots: turkey trot | 5K PRs: 5k pr | Fun runs: fun run, color run | 10K races: 10k
- Race day @marathon @parkrun @Strava ~ race day, flat lay, bib, start line
  Flat lays: flat lay | Start lines: start line | Race photos: race photo, mid race | Spectator signs: sign | Post-race food: food
## Trail & Ultra @trailrunning @Ultramarathon
- Trail runs @!trailrunning ~ trail, trail run, mountain run, singletrack
  Mountain trails: mountain | Forest trails: forest | Muddy trails: mud | Snowy trails: snow | Sunrise runs: sunrise
- Ultramarathons @!Ultramarathon ~ ultra, 50k, 100k, 50 miler, 100 miler
  50Ks: 50k | 100 milers: 100 mile, 100 miler | Buckles: buckle | Aid stations: aid station | Night running: night
- Skyrunning & vert @trailrunning @Ultramarathon ~ vert, elevation, skyrunning, summit
  Big vert days: vert | Ridge runs: ridge | Summit runs: summit | Fastpacking: fastpacking | Poles: poles
- Trail races @trailrunning ~ race, trail race, utmb, western states
  UTMB: utmb | Western States: western states | Local trail races: local | Race views: view | Finish arches: finish
## Training & Shoes @RunningShoeGeeks @running @AdvancedRunning
- Running shoes @!RunningShoeGeeks ~ shoe, shoes, rotation, super shoe
  Super shoes: super shoe, carbon, alphafly, metaspeed | Rotations: rotation | Trail shoes: trail shoe | Retired shoes: retired, miles | Unboxings: new, arrived
- Watches & data @running @Garmin ~ garmin, strava, watch, data, splits
  Strava art: strava art | Garmin stats: garmin | Mileage months: month, mileage | Year totals: year | Heart rate: heart rate
- Training blocks @Strava @marathon ~ training, block, plan, workout, intervals
  Track workouts: track | Long runs: long run | Training logs: log, block | Tempo runs: tempo | Recovery: recovery
- Running gear @running @RunningShoeGeeks ~ vest, gear, kit, shorts, hydration
  Hydration vests: vest | Flat lays: flat lay | Winter kit: winter | Night gear: night, headlamp | Fueling: gel, fuel
## Running Life @running @C25K
- Couch to 5K @C25K @running ~ c25k, couch to 5k, beginner, first run
  First runs: first run | Week milestones: week | Graduations: graduated, finished | Weight loss runners: lost, weight | Slow runners: slow
- Scenic runs @running @trailrunning ~ view, sunrise, sunset, scenic, beach run
  Sunrise runs: sunrise | City runs: city | Beach runs: beach | Snow runs: snow | Travel runs: travel
- Run clubs @running @runclub ~ run club, group run, crew, social run
  Run clubs: run club | Group photos: group | Coffee runs: coffee | Running buddies: buddy | Dog runs: dog
- Running milestones @Strava @parkrun @marathon ~ streak, miles, first, milestone, pr
  Run streaks: streak | Mile milestones: 1000 miles, miles | Age milestones: age | Comebacks: comeback, back | Injuries: injury, injured
## Track & Field @trackandfield @running
- Track meets @!trackandfield ~ track, meet, sprint, relay
  Sprints: sprint, 100m | Relays: relay | Hurdles: hurdles | Distance races: 800, 1500, mile | Records: record
- Field events @trackandfield ~ jump, throw, pole vault, javelin, shot put
  Pole vault: pole vault | High jump: high jump | Long jump: long jump | Javelin: javelin | Shot put: shot put
- Pro running @AdvancedRunning @trackandfield ~ olympics, world championship, diamond league, record
  Olympics: olympic, olympics | World champs: world championship | Diamond League: diamond league | Records: world record | Pro shoes: pro
- Masters & youth @running @trackandfield ~ masters, high school, college, xc, cross country
  Cross country: cross country, xc | High school: high school | College: college, ncaa | Masters: masters | Age groupers: age group

# Climbing {climbing} > hiking, fitness, camping, wildlife-nature @climbing @bouldering @climbharder
## Bouldering @bouldering @climbing
- Gym bouldering @!bouldering ~ boulder, bouldering, gym, problem, send
  Gym sends: send | Comp-style problems: comp style | Slab problems: slab | Overhangs: overhang | First V-grades: v3, v4, v5
- Outdoor bouldering @bouldering @climbing ~ outdoor, boulder, highball, crashpad
  Highballs: highball | Crash pad setups: crashpad, crash pad | Font: fontainebleau, font | Bishop: bishop | Forest boulders: forest
- Board climbing @climbharder @bouldering ~ moonboard, kilter, tension board, board
  Kilter: kilter | Moonboard: moonboard | Tension board: tension | Home walls: home wall | Benchmarks: benchmark
- Projects & sends @bouldering @climbing ~ project, sent, send, finally, flash
  Project sends: finally, project | Flashes: flash | Grade milestones: first v | Session counts: sessions, tries | Send celebrations: sent
## Sport & Trad @climbing @tradclimbing
- Sport climbing @climbing ~ sport climbing, lead, bolts, redpoint, onsight
  Redpoints: redpoint | Onsights: onsight | First leads: first lead | Steep sport: steep | Limestone: limestone
- Trad climbing @!tradclimbing @climbing ~ trad, gear, cams, nuts, crack
  Trad racks: rack | Gear placements: placement | Crack climbing: crack | Splitters: splitter | First trad leads: first trad
- Multipitch @climbing @tradclimbing ~ multipitch, multi pitch, big wall, belay ledge
  Big walls: big wall, el cap | Belay ledges: ledge | Portaledges: portaledge | Alpine starts: alpine | Exposure shots: exposure
- Crags & areas @climbing ~ yosemite, red river gorge, kalymnos, joshua tree, smith rock
  Yosemite: yosemite | Red River Gorge: red river, rrg | Kalymnos: kalymnos | Joshua Tree: joshua tree | Smith Rock: smith rock
## Training & Gear @climbharder @climbing
- Hangboarding @!climbharder ~ hangboard, fingerboard, hang, edge
  Hangboard setups: setup | One-arm hangs: one arm | Max hangs: max hang | Portable boards: portable | Finger injuries: pulley, injury
- Climbing shoes @climbing @climbingshoes ~ shoes, climbing shoes, resole, rubber
  New shoes: new | Resoles: resole | Worn-out shoes: worn, holes | Shoe quivers: quiver | Aggressive shoes: aggressive
- Gear racks @climbing @tradclimbing ~ rack, gear, quickdraws, rope
  Quickdraws: quickdraw | Ropes: rope | Harness setups: harness | Gear walls: wall | Gear flat lays: flat lay
- Home walls @climbharder @bouldering ~ home wall, woody, garage wall, spray wall
  Garage walls: garage | Spray walls: spray wall | Small walls: small | Hold collections: holds | Build progress: build
## Alpine & Ice @Mountaineering @iceclimbing @climbing
- Ice climbing @!iceclimbing ~ ice, ice climbing, ice axe, frozen
  Frozen waterfalls: waterfall | Mixed climbing: mixed | Ice screws: screw | First ice: first | Pillars: pillar
- Alpine climbing @Mountaineering @climbing ~ alpine, ridge, glacier, summit
  Alpine ridges: ridge | Glacier approaches: glacier | Summit shots: summit | Bivies: bivy | Dawn starts: dawn, alpine start
- Expeditions @Mountaineering ~ expedition, 8000, everest, k2, denali
  Everest: everest | Denali: denali | K2: k2 | Aconcagua: aconcagua | Base camps: base camp
- Via ferrata & scrambling @climbing @hiking ~ via ferrata, scramble, scrambling
  Via ferratas: via ferrata | Ladders: ladder | Ridge scrambles: ridge | Dolomites: dolomites | Cable routes: cable
## Climbing Life @climbing @bouldering
- Climbing trips @climbing ~ trip, road trip, climbing trip, van
  Van trips: van | International trips: spain, thailand, greece | Desert trips: desert | Camping crags: camp | Winter trips: winter
- Climbing partners & community @climbing @bouldering ~ partner, friends, crew, community
  First outdoor days: first time outside | Climbing couples: couple, girlfriend, boyfriend | Kids climbing: kid, son, daughter | Old climbers: years old | Crews: crew
- Falls & fails @climbing @bouldering ~ fall, whipper, fail, injury
  Whippers: whipper | Falls: fall | Injuries: injury, injured | Gear fails: fail | Close calls: close call
- Climbing photography @climbing @climbingporn ~ photo, shot, view, exposure
  Exposure shots: exposure | Drone shots: drone | Sunset climbing: sunset | Silhouettes: silhouette | Action shots: action

# Snow Sports {snow-sports} > hiking, travel, climbing, photography @skiing @snowboarding @Backcountry
## Skiing @skiing @Skigear
- Resort skiing @!skiing ~ ski, skiing, resort, powder, run
  Powder days: powder, pow | Bluebird days: bluebird | Groomers: groomer | Lift lines: lift | Resort views: view
- Ski trips @skiing ~ trip, japan, alps, whistler, utah, colorado
  Japan pow: japan, niseko | Alps trips: alps, chamonix, zermatt | Whistler: whistler | Utah: utah | Colorado: colorado
- Ski gear @Skigear @skiing ~ skis, boots, bindings, setup, quiver
  Ski quivers: quiver | Boot setups: boots | New skis: new | Bindings: bindings | Vintage skis: vintage
- Learning to ski @skiing @Skigear ~ first, learning, beginner, lesson
  First days: first day | Kids skiing: kid, son, daughter | Lessons: lesson | Adult beginners: beginner | Progress: progress
## Snowboarding @snowboarding
- Resort riding @!snowboarding ~ snowboard, snowboarding, riding, park
  Powder riding: powder, pow | Park laps: park | Carving: carve, carving | Groomers: groomer | Resort views: view
- Park & tricks @snowboarding ~ jump, rail, box, trick, 360
  Rails: rail | Jumps: jump | Butters: butter | Spins: 360, 540 | Boxes: box
- Board setups @snowboarding ~ board, setup, bindings, quiver, new board
  Quivers: quiver | Bindings: bindings | Board graphics: graphic | Boots: boots | Splitboards: splitboard
- First seasons @snowboarding ~ first, first season, beginner, learning
  First days: first day | Season passes: pass | Bruises: bruise, fall | Progress: progress | Kids riding: kid
## Backcountry @Backcountry @skiing @snowboarding
- Ski touring @!Backcountry ~ touring, skin, skinning, backcountry
  Skin tracks: skin track | Summits: summit | Hut trips: hut | Dawn patrols: dawn patrol | Tour setups: setup
- Avalanche safety @Backcountry @skiing ~ avalanche, avy, beacon, crown
  Crowns: crown | Beacons: beacon | Snowpits: snowpit, pit | Courses: course | Debris: debris
- Splitboarding @splitboard @Backcountry ~ splitboard, split, splitboarding
  Split setups: setup | Transitions: transition | Summits: summit | Hut trips: hut | Descents: descent
- Steep lines @Backcountry @skiing ~ couloir, steep, line, chute
  Couloirs: couloir | Big lines: line | Chutes: chute | Cornices: cornice | Spines: spine
## Winter Sports @IceSkating @hockey @wintersports
- Ice skating @IceSkating @FigureSkating ~ skating, ice skating, rink, figure skating
  Figure skating: figure | Pond skating: pond | Wild ice: wild ice, lake | Rink days: rink | Skates: skates
- Hockey @hockey @hockeyplayers ~ hockey, rink, stick, goalie
  Pond hockey: pond | Goalie gear: goalie | Beer league: beer league | Sticks: stick | Kids hockey: kid
- Sledding & fun @wintersports @snow ~ sled, sledding, snowman, snowmobile
  Sledding: sled | Snowmen: snowman | Snowmobiles: snowmobile | Snow forts: fort | Snow angels: snow angel
- Cross-country skiing @xcountryskiing @skiing ~ cross country, nordic, xc ski, classic
  Classic: classic | Skate skiing: skate | Groomed tracks: track, groomed | Nordic races: race | Forest trails: forest
## Mountain Life @skiing @snowboarding @SkiBums
- Ski towns @skiing @travel ~ town, village, chalet, apres
  Chalets: chalet | Apres ski: apres | Ski villages: village | Night towns: night | Lift tickets: ticket
- Ski bum life @SkiBums @skiing ~ season, ski bum, liftie, patrol
  Lifties: liftie | Ski patrol: patrol | Season passes: season pass | Staff housing: housing | Van bums: van
- Snow conditions @skiing @snowboarding ~ snow, storm, dump, inches, cm
  Storm dumps: dump, storm | Snow depth: inches, cm | Ice days: ice, icy | Spring slush: spring | Early season: early season
- Lifts & resorts @skiing @skilifts ~ lift, chairlift, gondola, tram
  Chairlifts: chairlift | Gondolas: gondola | Trams: tram | Vintage lifts: vintage | Lift views: view

# Golf {golf} > fitness, travel, cars @golf @GolfSwing @golfclubs
## Courses @golf @golfcourses
- Course views @golf ~ course, hole, view, green
  Signature holes: signature | Links courses: links | Mountain courses: mountain | Sunrise rounds: sunrise | Island greens: island green
- Famous courses @golf ~ augusta, pebble beach, st andrews, tpc, pinehurst
  Pebble Beach: pebble beach | St Andrews: st andrews | TPC Sawgrass: tpc, sawgrass | Pinehurst: pinehurst | Augusta: augusta, masters
- Local munis @golf ~ muni, local course, public course, 9 hole
  Munis: muni | Nine holes: 9 hole | Par 3 courses: par 3 | Pitch and putt: pitch and putt | Driving ranges: range
- Course conditions @golf @golfcourses ~ greens, bunker, fairway, aeration
  Greens: greens | Bunkers: bunker | Fairways: fairway | Frost delays: frost | Maintenance: aeration, maintenance
## Gear @golf @GolfGear
- What's in the bag @!golf @GolfGear ~ witb, what's in the bag, bag, setup
  Full bags: witb | Blade sets: blades | Game improvement: game improvement | Mixed bags: mixed | Beginner bags: beginner
- Putters @golf @GolfGear ~ putter, scotty, scotty cameron, blade putter
  Scotty Camerons: scotty | Mallets: mallet | Blades: blade | Custom putters: custom | Collections: collection
- Irons & wedges @golf @GolfGear ~ irons, wedges, blades, forged, vokey
  Forged irons: forged | Vokeys: vokey | Raw wedges: raw | Muscle backs: muscle back | Iron sets: set
- Drivers & woods @golf @GolfGear ~ driver, woods, fairway wood, hybrid
  Drivers: driver | Fairway woods: fairway | Hybrids: hybrid | Shafts: shaft | Headcovers: headcover
## Swing & Play @GolfSwing @golf
- Swing videos @!GolfSwing ~ swing, help, feedback, driver swing
  Driver swings: driver | Iron swings: iron | Beginner swings: beginner | Before & after: before, after | Slow-mo: slow
- Scorecards @golf ~ scorecard, score, broke 80, broke 90, broke 100
  Broke 100: broke 100 | Broke 90: broke 90 | Broke 80: broke 80 | Personal bests: pb, personal best | Rounds: round
- Holes in one @golf ~ hole in one, ace, eagle, albatross
  Aces: ace, hole in one | Eagles: eagle | Albatrosses: albatross | Ace balls: ball | Ace plaques: plaque
- Simulators @golf @Golfsimulator ~ simulator, sim, launch monitor, garage sim
  Garage sims: garage | Basement sims: basement | Launch monitors: launch monitor | Sim builds: build | Screens: screen
## Golf Lifestyle @golf @golfcarts
- Golf fashion @golf ~ outfit, polo, fit, shoes, hat
  Outfits: outfit | Golf shoes: shoes | Hats: hat | Polos: polo | Retro style: retro, vintage
- Golf carts @golfcarts @golf ~ golf cart, cart, buggy
  Custom carts: custom | Lifted carts: lifted | Electric carts: electric | Restorations: restored | Cart setups: setup
- Golf trips @golf @travel ~ trip, golf trip, scotland, ireland, myrtle
  Scotland trips: scotland | Ireland trips: ireland | Buddy trips: buddy, buddies | Resort golf: resort | Bucket list: bucket list
- Golf with family @golf ~ dad, son, daughter, wife, family
  Father & son: dad, son | Kids golf: kid | Couples golf: wife, husband, girlfriend | Grandpa rounds: grandpa | First rounds: first
## Pro Golf @golf @PGATour
- Tournaments @golf @PGATour ~ tournament, masters, open, ryder cup, pga
  The Masters: masters | Ryder Cup: ryder cup | Majors: major, open | LIV events: liv | Tour events: tour
- Pro equipment @golfclubs @golf ~ tour, pro, tour issue, prototype
  Tour issue: tour issue | Prototypes: prototype | Pro bags: bag | Pro putters: putter | Pro balls: ball
- Memorabilia @golf ~ flag, signed, pin flag, memorabilia
  Signed flags: flag | Ball markers: ball marker | Badges & tickets: badge, ticket | Collections: collection | Displays: display
- Spectator days @golf @PGATour ~ attended, spectator, gallery, practice round
  Practice rounds: practice round | Galleries: gallery | Grandstands: grandstand | Merch hauls: merch | Autographs: autograph
`;
export default source;
