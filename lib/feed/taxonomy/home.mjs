// Home & living topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Interior Design {interior-design} > houseplants, home-improvement, desk-setups, architecture-cities, woodworking @InteriorDesign @CozyPlaces @malelivingspace
## Living Rooms @InteriorDesign @CozyPlaces @malelivingspace
- Living room reveals @InteriorDesign @malelivingspace ~ living room, lounge, sofa, couch
  Sectionals: sectional | Gallery walls: gallery wall | Fireplaces: fireplace | Rugs: rug | Before & after: before, after
- Cozy spaces @!CozyPlaces ~ cozy, warm, rainy, nook
  Reading nooks: reading nook, nook | Rainy days: rain, rainy | Fireplaces: fireplace | Window seats: window seat | Christmas cozy: christmas
- Apartment styling @malelivingspace @AmateurRoomPorn ~ apartment, studio, first apartment
  First apartments: first apartment | Studio layouts: studio | Rentals: rental, renter | Small living rooms: small | City views: view
- Maximalist & eclectic @maximalism @InteriorDesign ~ maximalist, eclectic, colorful, vintage
  Maximalism: maximalist, maximalism | Eclectic: eclectic | Color drenching: color, colorful | Vintage mixes: vintage | Pattern play: pattern, wallpaper
## Bedrooms @malelivingspace @AmateurRoomPorn @InteriorDesign
- Bedroom makeovers @InteriorDesign @AmateurRoomPorn ~ bedroom, bed, headboard
  Headboards: headboard | Canopy beds: canopy | Moody bedrooms: moody, dark | Small bedrooms: small | Before & after: before, after
- Kids rooms @InteriorDesign @Mommit ~ nursery, kids room, playroom, toddler
  Nurseries: nursery | Playrooms: playroom | Toddler rooms: toddler | Bunk beds: bunk | Themed rooms: theme, themed
- Dorms & first rooms @malelivingspace @dorm ~ dorm, college, first room
  Dorm rooms: dorm | Teen rooms: teen | Shared rooms: shared | Lofted beds: loft | Budget rooms: budget
- Guest & bonus rooms @InteriorDesign @HomeDecorating ~ guest room, bonus room, office, attic
  Guest rooms: guest room | Attic rooms: attic | Home gyms: home gym, gym | Craft rooms: craft room | Libraries: library
## Kitchens & Baths @kitchens @HomeImprovement @InteriorDesign
- Kitchen remodels @kitchens @HomeImprovement ~ kitchen, remodel, renovation, cabinets
  Before & after: before, after | Painted cabinets: painted cabinets, cabinets | Islands: island | Backsplashes: backsplash | Small kitchens: small kitchen
- Bathroom remodels @HomeImprovement @bathrooms ~ bathroom, shower, tile, vanity
  Tile showers: tile, shower | Vanities: vanity | Tubs: tub | Small bathrooms: small | Before & after: before, after
- Dining spaces @InteriorDesign @HomeDecorating ~ dining room, dining table, breakfast nook
  Dining tables: dining table | Breakfast nooks: nook | Lighting: chandelier, pendant | Tablescapes: tablescape, table setting | Banquettes: banquette
- Laundry & mudrooms @HomeImprovement @organization ~ laundry room, mudroom, entryway
  Laundry rooms: laundry | Mudrooms: mudroom | Entryways: entryway | Storage builds: storage | Before & after: before, after
## Styles @InteriorDesign @midcenturymodern @RoomPorn
- Mid-century modern @!midcenturymodern ~ mid century, mcm, eames, teak
  Eames chairs: eames | Teak furniture: teak | Credenzas: credenza | Lamps: lamp | Thrift finds: thrift, found
- Scandinavian & Japandi @InteriorDesign @japandi ~ scandinavian, japandi, minimal, nordic
  Japandi: japandi | Nordic: nordic, scandinavian | Light wood: oak, light wood | Neutral palettes: neutral, beige | Minimal: minimal
- Modern farmhouse & rustic @InteriorDesign @farmhouse ~ farmhouse, rustic, cottage, barn
  Farmhouse: farmhouse | Cottagecore: cottage, cottagecore | Rustic beams: beams, rustic | Barn doors: barn door | Shiplap: shiplap
- Industrial & loft @InteriorDesign @RoomPorn ~ loft, industrial, brick, concrete
  Lofts: loft | Exposed brick: brick | Concrete: concrete | Metal accents: metal, steel | Warehouse homes: warehouse
## Decor & DIY @HomeDecorating @DIY @thriftstorehauls
- Thrift flips @thriftstorehauls @furniturerestoration ~ thrift, thrifted, flip, found
  Furniture flips: flip, refinished | Thrift hauls: haul | Curb finds: curb, free | Lamps: lamp | Art finds: painting, art
- Wall decor @HomeDecorating @InteriorDesign ~ wall, gallery wall, art, mirror
  Gallery walls: gallery wall | Mirrors: mirror | Shelves: shelf, shelves | Tapestries: tapestry | Accent walls: accent wall
- Lighting @InteriorDesign @HomeDecorating ~ lamp, lighting, pendant, chandelier
  Pendants: pendant | Chandeliers: chandelier | Table lamps: table lamp | Sconces: sconce | Warm lighting: warm
- Seasonal decor @HomeDecorating @CozyPlaces ~ christmas, halloween, fall decor, holiday
  Christmas decor: christmas | Halloween decor: halloween | Fall decor: fall, autumn | Spring decor: spring | Tree shots: tree

# Houseplants {houseplants} > gardening, interior-design, aquariums @houseplants @IndoorGarden @plantclinic
## Popular Plants @houseplants @IndoorGarden
- Monsteras @Monstera @houseplants ~ monstera, deliciosa, thai constellation, albo
  Deliciosa: deliciosa | Thai constellation: thai constellation | Albos: albo | Fenestrations: fenestration, leaf | Moss poles: moss pole
- Pothos & philodendrons @pothos @philodendron @houseplants ~ pothos, philodendron, golden pothos
  Pothos trails: trail, trailing | Pink princess: pink princess | Neon pothos: neon | Philodendron gloriosum: gloriosum | Mounted growth: climbing
- Snake plants & ZZ @houseplants @snakeplants ~ snake plant, zz plant, sansevieria, low light
  Snake plants: snake plant | ZZ plants: zz | Low-light corners: low light | Propagations: propagation | Flowers: flower, bloom
- Ficus & trees @fiddleleaffig @houseplants ~ fiddle leaf, ficus, rubber plant, tree
  Fiddle leaf figs: fiddle leaf | Rubber plants: rubber | Olive trees: olive | Bird of paradise: bird of paradise | Indoor trees: tree
## Rare & Collector Plants @RareHouseplants @houseplants @Anthurium
- Anthuriums @Anthurium @RareHouseplants ~ anthurium, crystallinum, warocqueanum
  Velvet leaves: velvet | Crystallinum: crystallinum | Warocqueanum: warocqueanum | New leaves: new leaf | Collections: collection
- Variegated plants @RareHouseplants @houseplants ~ variegated, variegation, albo, aurea
  Albo variegation: albo | Half moons: half moon | Pink variegation: pink | Mint variegation: mint | Reversions: reverted, revert
- Hoyas @!hoyas @houseplants ~ hoya, hoyas
  Hoya blooms: bloom, flower | Splash leaves: splash | Hoya collections: collection | Trellises: trellis | Kerrii: kerrii
- Alocasias & begonias @alocasia @begonias @RareHouseplants ~ alocasia, begonia
  Alocasias: alocasia | Begonia maculata: maculata | Rex begonias: rex | Dragon scale: dragon scale | Corms: corm
## Plant Setups @IndoorGarden @houseplants @plantrack
- Plant shelves @IndoorGarden @houseplants ~ shelf, shelves, plant shelf, plant wall
  Plant walls: wall | Ikea cabinets: ikea, greenhouse cabinet | Window shelves: window | Bookcase jungles: bookcase | Hanging plants: hanging
- Grow lights @IndoorGarden @houseplants ~ grow light, grow lights, led, lighting
  Shelf lights: shelf | Bar lights: bar | Purple glow: purple | Bulbs: bulb | Light setups: setup
- Plant rooms @IndoorGarden @UrbanJungle ~ plant room, jungle, sunroom, all my plants
  Sunrooms: sunroom | Urban jungles: jungle | Bedroom plants: bedroom | Bathroom plants: bathroom | Collections: collection
- Terrariums @terrariums @IndoorGarden ~ terrarium, closed terrarium, jar, vivarium
  Closed terrariums: closed | Jar gardens: jar | Moss terrariums: moss | Paludariums: paludarium | Tiny terrariums: tiny
## Plant Care @plantclinic @houseplants
- Plant problems @!plantclinic ~ help, dying, yellow, brown, what's wrong
  Yellow leaves: yellow | Brown tips: brown | Root rot: root rot, rot | Pests: pest, bugs, thrips | Sunburn: burn, sunburn
- Repotting @houseplants @plantclinic ~ repot, repotting, roots, soil
  Root shots: roots | Soil mixes: soil, mix | Pots: pot | Root bound: root bound | Big repots: huge
- Propagation @propagation @houseplants ~ propagation, prop, cutting, cuttings, water prop
  Water props: water | Leaf props: leaf | Prop stations: station | Rooted cuttings: rooted | Prop boxes: prop box
- Rescues & progress @houseplants @plantclinic ~ progress, rescue, saved, before, after
  Rescued plants: rescue, saved | Growth timelines: progress, growth | Year comparisons: year | Clearance plants: clearance | Revivals: revived, back
## Succulents & Cacti @succulents @cactus
- Succulents @!succulents ~ succulent, succulents, echeveria
  Echeverias: echeveria | Arrangements: arrangement | Haworthias: haworthia | Propagations: propagation | Stressed colors: color, stressed
- Cacti @!cactus ~ cactus, cacti, astrophytum
  Cactus blooms: bloom, flower | Collections: collection | Grafts: graft | Rare cacti: rare | Seedlings: seedling
- Lithops & mesembs @lithops @succulents ~ lithops, living stones, conophytum
  Lithops: lithops | Splitting: split, splitting | Conophytums: conophytum | Flowers: flower | Pot setups: pot
- Bonsai @!Bonsai ~ bonsai, juniper, ficus bonsai, styling
  Junipers: juniper | Ficus bonsai: ficus | Styling sessions: styling, styled | Pre-bonsai: nursery stock, pre bonsai | Progress: progress, year

# Gardening {gardening} > houseplants, home-cooking, wildlife-nature, home-improvement @gardening @vegetablegardening @GardeningUK
## Vegetable Gardens @vegetablegardening @gardening @homestead
- Raised beds @vegetablegardening @gardening ~ raised bed, raised beds, bed build
  Cedar beds: cedar | Metal beds: metal | First beds: first | Layouts: layout | Hugelkultur: hugel
- Harvests @vegetablegardening @gardening ~ harvest, haul, picked, grew
  Tomato hauls: tomato | Pepper hauls: pepper | Giant veggies: giant, huge | Daily harvests: today | Fall harvests: fall
- Tomatoes & peppers @tomatoes @HotPeppers @vegetablegardening ~ tomato, tomatoes, pepper, peppers
  Heirlooms: heirloom | Superhots: reaper, superhot, ghost | Cherry tomatoes: cherry | Problems: blossom end, split | Trellising: trellis, cage
- Seed starting @vegetablegardening @SeedStarting ~ seed, seeds, seedlings, starting
  Seedlings: seedling | Grow setups: setup, light | Germination: germination, sprouted | Hardening off: harden | Seed hauls: haul
## Flower Gardens @gardening @flowers @roses
- Roses @!roses ~ rose, roses, bloom
  Climbing roses: climbing | David Austin: david austin | Rose bushes: bush | Single blooms: bloom | Rose gardens: garden
- Cottage gardens @gardening @flowers ~ cottage garden, flowers, border, perennials
  Perennial borders: perennial, border | Wildflower meadows: wildflower, meadow | Front yards: front yard | Pollinator gardens: pollinator | Path gardens: path
- Dahlias & cut flowers @dahlias @flowers ~ dahlia, dahlias, cut flowers, bouquet
  Dahlia blooms: dahlia | Bouquets: bouquet | Flower farms: farm | Zinnias: zinnia | Tubers: tuber
- Spring bulbs @gardening @flowers ~ tulip, tulips, daffodil, bulbs
  Tulips: tulip | Daffodils: daffodil | Hyacinths: hyacinth | Allium: allium | Crocus: crocus
## Landscaping & Yards @landscaping @lawncare @gardening
- Yard makeovers @landscaping @gardening ~ backyard, yard, before, after, makeover
  Backyard glow-ups: backyard | Front yards: front yard | Patios: patio | Paths: path | Before & after: before, after
- Lawns @!lawncare ~ lawn, grass, mow, stripes
  Lawn stripes: stripes | Renovations: renovation, overseed | Weeds: weed, weeds | Mowers: mower | Clover lawns: clover
- Native & wildlife gardens @NativePlantGardening @gardening ~ native, natives, pollinator, wildlife
  Native meadows: meadow | Prairie plantings: prairie | Bee gardens: bee | Butterfly gardens: butterfly | No-mow yards: no mow
- Hardscaping @landscaping @HomeImprovement ~ pavers, retaining wall, fire pit, deck, patio
  Pavers: pavers | Retaining walls: retaining wall | Fire pits: fire pit | Decks: deck | Pergolas: pergola
## Homesteading @homestead @BackYardChickens @Permaculture
- Backyard chickens @!BackYardChickens ~ chicken, chickens, hen, coop
  Coops: coop | Chicks: chick, chicks | Eggs: egg, eggs | Breeds: breed, silkie | Free range: free range
- Homesteads @homestead @Permaculture ~ homestead, farm, acres, land
  Barns: barn | Goats: goat | Food forests: food forest | Root cellars: root cellar | Preserves: canning, preserves
- Composting @composting @gardening ~ compost, composting, worms, bin
  Bins: bin | Worm farms: worm | Hot piles: pile | Leaf mold: leaf | Finished compost: finished
- Beekeeping @!Beekeeping ~ bees, hive, beekeeping, honey, frame
  Hives: hive | Honey harvests: honey, harvest | Frames: frame | Swarms: swarm | Queen spotting: queen
## Greenhouses & Indoor Growing @greenhouse @gardening @hydro
- Greenhouses @greenhouse @gardening ~ greenhouse, polytunnel, glasshouse
  DIY greenhouses: diy, built | Polytunnels: polytunnel | Winter greenhouses: winter | Setups: setup | Small greenhouses: small
- Hydroponics @hydro @Hydroponics ~ hydroponic, hydroponics, hydro, kratky, dwc
  Kratky jars: kratky | DWC: dwc | Towers: tower | Lettuce grows: lettuce | Systems: system
- Microgreens & herbs @microgreens @herbs ~ microgreens, herbs, basil, windowsill
  Microgreens: microgreens | Basil: basil | Windowsill herbs: windowsill | Herb spirals: herb spiral | Mint: mint
- Fruit trees @fruittrees @gardening ~ fruit tree, apple tree, citrus, fig, lemon tree
  Citrus: citrus, lemon, lime | Fig trees: fig | Apples & pears: apple, pear | Espalier: espalier | Grafting: graft, grafting

# Woodworking {woodworking} > home-improvement, interior-design, 3d-printing, electronics-diy @woodworking @BeginnerWoodWorking @Woodcarving
## Furniture @woodworking @BeginnerWoodWorking
- Tables @woodworking @BeginnerWoodWorking ~ table, dining table, coffee table, side table
  Dining tables: dining table | Coffee tables: coffee table | Side tables: side table, end table | Live edge: live edge | Epoxy tables: epoxy
- Chairs & seating @woodworking ~ chair, stool, bench, rocking chair
  Chairs: chair | Stools: stool | Benches: bench | Rocking chairs: rocking | Windsor chairs: windsor
- Cabinets & storage @woodworking @BeginnerWoodWorking ~ cabinet, dresser, bookshelf, shelf
  Dressers: dresser | Bookshelves: bookshelf, bookcase | Wall cabinets: wall cabinet | Built-ins: built in | Media consoles: console, media
- Beds & big builds @woodworking ~ bed, bed frame, headboard, desk
  Bed frames: bed frame, bed | Headboards: headboard | Desks: desk | Wardrobes: wardrobe | Bunk beds: bunk
## Small Projects @BeginnerWoodWorking @woodworking @somethingimade
- Cutting boards @BeginnerWoodWorking @woodworking ~ cutting board, end grain, charcuterie board
  End grain: end grain | Edge grain: edge grain | Charcuterie boards: charcuterie | Juice grooves: groove | Board finishes: oil, finish
- Boxes @woodworking @BeginnerWoodWorking ~ box, jewelry box, keepsake box
  Jewelry boxes: jewelry | Keepsake boxes: keepsake | Dovetail boxes: dovetail | Puzzle boxes: puzzle | Watch boxes: watch
- Gifts & small builds @BeginnerWoodWorking @woodworking ~ gift, made for, christmas, birthday
  Christmas gifts: christmas | Birthday gifts: birthday | Kid toys: toy, kid | Pens: pen | Picture frames: frame
- Shop jigs @woodworking @BeginnerWoodWorking ~ jig, sled, crosscut sled, fixture
  Crosscut sleds: sled | Router jigs: router | Tapering jigs: taper | Clamp racks: clamp rack | Outfeed tables: outfeed
## Hand Tools & Joinery @handtools @woodworking
- Hand tool work @!handtools ~ hand plane, plane, chisel, saw, handtool
  Planes: plane | Chisels: chisel | Saws: saw | Restorations: restore, restored | Tool chests: tool chest, chest
- Joinery @woodworking @handtools ~ joinery, dovetail, mortise, tenon, joint
  Dovetails: dovetail | Mortise and tenon: mortise, tenon | Japanese joinery: japanese | Box joints: box joint | Splines: spline
- Workbenches @woodworking @handtools ~ workbench, bench, roubo, split top
  Roubos: roubo | Split tops: split top | Vises: vise | First benches: first | Portable benches: portable
- Sharpening @handtools @woodworking ~ sharpen, sharpening, whetstone, honing
  Whetstones: whetstone | Strops: strop | Honing guides: guide | Mirror edges: mirror | Stations: station
## Turning & Carving @turning @Woodcarving @Whittling
- Bowl turning @turning ~ bowl, turned, lathe, vase
  Bowls: bowl | Hollow forms: hollow form | Vases: vase | Burl bowls: burl | Segmented: segmented
- Pen & small turning @turning @penturning ~ pen, pens, pen turning, tops
  Pens: pen | Spinning tops: top | Bottle stoppers: stopper | Ornaments: ornament | Mallets: mallet
- Wood carving @!Woodcarving ~ carving, carved, carve, relief
  Relief carving: relief | Spoons: spoon | Figures: figure | Animals: animal, bear | Signs: sign
- Whittling @!Whittling @Woodcarving ~ whittle, whittling, whittled, knife
  Small animals: animal, bird | Faces: face | Gnomes: gnome | First whittles: first | Tools: knife, tools
## Shops & Tools @woodworking @Tools
- Shop tours @woodworking @Workshop ~ shop, workshop, garage shop, shop tour
  Garage shops: garage | Basement shops: basement | Small shops: small | Dust collection: dust collection | Shop layouts: layout
- Power tools @woodworking @Tools ~ table saw, bandsaw, router, cnc, jointer
  Table saws: table saw | Bandsaws: bandsaw | Routers: router | Planers: planer, jointer | Tool hauls: haul
- CNC & laser @hobbycnc @lasercutting @woodworking ~ cnc, laser, engraved, shapeoko
  CNC carves: cnc | Laser engravings: laser, engraved | Inlays: inlay | Signs: sign | Machines: shapeoko, xtool
- Lumber & milling @woodworking @Sawmill ~ lumber, slab, sawmill, milling, log
  Slabs: slab | Sawmills: sawmill | Log to lumber: log | Exotic woods: exotic, walnut, purpleheart | Drying stacks: drying, stack

# Home Improvement {home-improvement} > interior-design, woodworking, gardening, home-lab @HomeImprovement @DIY @Renovations
## Renovations @HomeImprovement @Renovations @fixit
- Full renovations @Renovations @HomeImprovement ~ renovation, reno, gut, remodel
  Gut jobs: gut | Old houses: old house, 1920s, victorian | Flips: flip | Progress timelines: progress, update | Before & after: before, after
- Flooring @Flooring @HomeImprovement ~ floor, flooring, lvp, hardwood, tile
  Hardwood: hardwood | LVP: lvp, vinyl | Refinishing: refinish, sanded | Tile floors: tile | Hidden floors: under the carpet, found
- Painting & walls @HomeImprovement @DIY ~ paint, painted, drywall, wall, accent wall
  Accent walls: accent wall | Drywall patches: drywall, patch | Wallpaper: wallpaper | Limewash: limewash | Board and batten: board and batten
- Tiling @HomeImprovement @Tile ~ tile, tiled, grout, backsplash
  Backsplashes: backsplash | Shower tiles: shower | Patterns: pattern, herringbone | Floor tiles: floor | Grout lines: grout
## DIY Builds @DIY @somethingimade @HomeImprovement
- Built-ins @DIY @HomeImprovement ~ built in, built-in, bookshelves, window seat
  Bookshelves: bookshelves | Window seats: window seat | Mudroom benches: mudroom | Closets: closet | Media walls: media wall
- Decks & patios @DIY @Decks ~ deck, patio, pergola, porch
  Decks: deck | Pergolas: pergola | Porches: porch | Paver patios: pavers | Railings: railing
- Sheds & outbuildings @DIY @sheds ~ shed, she shed, outbuilding, studio
  Sheds: shed | Backyard offices: office, studio | Greenhouses: greenhouse | Playhouses: playhouse | Garages: garage
- Fences & gates @DIY @HomeImprovement ~ fence, gate, privacy fence
  Privacy fences: privacy | Gates: gate | Horizontal fences: horizontal | Garden fences: garden | Repairs: repair
## Repairs & Fixes @fixit @HomeImprovement @Plumbing
- Plumbing @Plumbing @fixit ~ plumbing, pipe, leak, toilet, faucet
  Leaks: leak | Water heaters: water heater | Toilets: toilet | Faucets: faucet | Bad plumbing: bad, horror
- Electrical @electricians @HomeImprovement ~ electrical, wiring, panel, outlet
  Panels: panel | Bad wiring: bad, sketchy, scary | Outlets: outlet | Lighting installs: light, fixture | Rewires: rewire
- Roofing & exterior @Roofing @HomeImprovement ~ roof, siding, gutter, exterior
  Roofs: roof | Siding: siding | Gutters: gutter | Windows: window | Exterior paint: exterior paint, painted
- Found in the walls @HomeImprovement @fixit ~ found, behind the wall, inside the wall, under
  Wall finds: wall | Old newspapers: newspaper | Time capsules: time capsule | Previous owner fails: previous owner, po | Hidden rooms: hidden
## Smart & Efficient Homes @HomeImprovement @solar @heatpumps
- Solar installs @solar @HomeImprovement ~ solar, panels, solar install, inverter
  Roof arrays: roof | Ground mounts: ground mount | Batteries: battery, powerwall | Balcony solar: balcony | Monitoring: monitoring, app
- Heat pumps & HVAC @heatpumps @hvacadvice ~ heat pump, mini split, hvac, furnace
  Mini splits: mini split | Heat pumps: heat pump | Furnaces: furnace | Ductwork: duct | Thermostats: thermostat
- Insulation & windows @HomeImprovement @DIY ~ insulation, windows, attic, spray foam
  Attic insulation: attic | Spray foam: spray foam | Window swaps: window | Weatherproofing: draft, weather | Basements: basement
- Smart upgrades @smarthome @HomeImprovement ~ smart, smart switch, smart lock, doorbell
  Smart switches: switch | Smart locks: lock | Doorbells: doorbell | Lighting scenes: lights | Sensors: sensor
## Workshops & Garages @Garages @Workbenches @DIY
- Garage makeovers @Garages @organization ~ garage, garage makeover, epoxy floor
  Epoxy floors: epoxy | Storage walls: wall, slatwall | Garage gyms: gym | Car garages: car | Before & after: before, after
- Tool organization @Tools @organization ~ tool wall, pegboard, toolbox, organized
  Pegboards: pegboard | Tool chests: tool chest, toolbox | French cleats: french cleat | Drawer foam: foam, shadow | Packout: packout
- Workbenches @Workbenches @DIY ~ workbench, bench, work surface
  Rolling benches: rolling | Wall benches: wall | Fold-down: fold down | Garage benches: garage | First benches: first
- Tool hauls @Tools @DIY ~ tool, tools, haul, milwaukee, dewalt, makita
  Milwaukee: milwaukee | DeWalt: dewalt | Makita: makita | Ryobi: ryobi | Vintage tools: vintage

# Van Life & Tiny Homes {van-life} > overlanding, camping, travel, interior-design, home-improvement @VanLife @vandwellers @TinyHouses
## Van Builds @VanLife @vandwellers @campervan
- Sprinter builds @VanLife @vandwellers ~ sprinter, build, van build
  Full builds: full build | Layouts: layout | Garages: garage | Beds: bed | Finished builds: finished, done
- Budget vans @vandwellers @VanLife ~ budget, cheap, minivan, old van
  Minivan camps: minivan | Stealth vans: stealth | Old vans: old, 90s | Cheap builds: cheap | First vans: first
- Classic vans @VanLife @Vanagon ~ vanagon, westfalia, vw bus, t3, t2
  Westfalias: westfalia, westy | VW buses: bus, t2 | Vanagons: vanagon, t3 | Restorations: restored | Pop-tops: pop top
- Skoolies @skoolies @VanLife ~ skoolie, school bus, bus conversion, bus
  Bus interiors: interior | Roof raises: roof raise | Kitchens: kitchen | Bus exteriors: paint, exterior | Families on buses: family
## Van Interiors @VanLife @vandwellers
- Van kitchens @VanLife @vandwellers ~ kitchen, galley, sink, stove
  Galleys: galley | Sinks: sink | Stoves: stove | Fridges: fridge | Storage: storage
- Beds & layouts @VanLife @vandwellers ~ bed, layout, convertible, dinette
  Fixed beds: fixed bed | Convertibles: convertible | Dinettes: dinette | Bunks: bunk | Pet spaces: dog, cat
- Electrical & solar @VanLife @vandwellers @SolarDIY ~ solar, battery, electrical, wiring, victron
  Solar roofs: solar | Battery banks: battery, lithium | Wiring diagrams: diagram, wiring | Victron setups: victron | Shore power: shore power
- Bathrooms & water @VanLife @vandwellers ~ shower, toilet, water tank, bathroom
  Showers: shower | Toilets: toilet, composting toilet | Water tanks: tank | Outdoor showers: outdoor | Heaters: heater
## Tiny Homes @TinyHouses @tinyhouse
- Tiny houses @TinyHouses @tinyhouse ~ tiny house, tiny home, thow
  On wheels: on wheels, thow | Lofts: loft | Interiors: interior | Exteriors: exterior | Builds: build
- Cabins @cabins @CabinPorn ~ cabin, a-frame, log cabin
  A-frames: a-frame, a frame | Log cabins: log cabin | Snowy cabins: snow, winter | Lake cabins: lake | Cabin builds: build
- Container homes @ContainerHomes @TinyHouses ~ container, shipping container
  Single containers: single | Container stacks: stack, multiple | Interiors: interior | Builds: build | Off-grid containers: off grid
- Yurts & domes @TinyHouses @OffGrid ~ yurt, dome, geodesic, earthship
  Yurts: yurt | Domes: dome, geodesic | Earthships: earthship | Treehouses: treehouse | Hobbit homes: hobbit
## Life on the Road @vandwellers @VanLife
- Views from the van @VanLife ~ view, morning, back doors, sunset
  Back door views: back doors, door | Beach mornings: beach | Mountain mornings: mountain | Snowy nights: snow | Sunsets: sunset
- Stealth & city living @vandwellers @urbancarliving ~ stealth, city, parking, urban
  Stealth setups: stealth | City parking: parking | Gym showers: gym | Work from van: work, remote | Night setups: night
- Van pets @VanLife @vandwellers ~ dog, cat, pup, pet
  Van dogs: dog | Van cats: cat | Pet beds: bed | Adventure pets: adventure | Pet safety: safety, heat
- Winter van life @vandwellers @VanLife ~ winter, snow, cold, heater, diesel heater
  Diesel heaters: diesel heater | Snowy camps: snow | Ski trips: ski | Insulation: insulation | Frost: frost
## Off-Grid Living @OffGrid @homestead @cabins
- Off-grid cabins @OffGrid @cabins ~ off grid, cabin, solar, wood stove
  Wood stoves: wood stove | Solar cabins: solar | Water systems: water | Outhouses: outhouse | Remote builds: remote
- Land & builds @OffGrid @homestead ~ land, acres, property, raw land
  Raw land: raw land | Clearing: clearing | Driveways: driveway | Foundations: foundation | Progress: progress
- Off-grid power @OffGrid @SolarDIY ~ solar, battery, generator, wind
  Solar arrays: solar | Battery banks: battery | Wind turbines: wind | Generators: generator | Micro-hydro: hydro
- Self-built homes @OffGrid @homestead ~ built, self built, owner built, timber frame
  Timber frames: timber frame | Cob & straw: cob, straw bale | Stone houses: stone | Log builds: log | Earth-bermed: bermed
`;
export default source;
