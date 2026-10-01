// Pets & animals topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Dogs {dogs} > cats, hiking, wildlife-nature, van-life, photography @dogs @dogpictures @rarepuppers
## Breeds @dogs @dogpictures
- Retrievers & labs @goldenretrievers @labrador @dogpictures ~ golden, retriever, lab, labrador
  Golden puppies: golden puppy, puppy | Black labs: black lab | Yellow labs: yellow lab | Swimming retrievers: swim, lake | Senior goldens: senior, old
- Shepherds & working dogs @germanshepherds @aussie @BorderCollie ~ german shepherd, gsd, aussie, border collie, malinois
  GSDs: german shepherd, gsd | Aussies: aussie, australian shepherd | Border collies: border collie | Malinois: malinois | Working dogs: working
- Small breeds @dachshund @Pomeranians @corgi ~ dachshund, corgi, pomeranian, chihuahua, frenchie
  Dachshunds: dachshund, doxie | Corgis: corgi | Frenchies: frenchie, french bulldog | Pomeranians: pomeranian | Chihuahuas: chihuahua
- Big breeds @greatdanes @husky @bernesemountaindogs ~ great dane, husky, bernese, newfoundland, mastiff
  Huskies: husky | Great Danes: great dane | Berners: bernese | Newfies: newfoundland, newfie | Mastiffs: mastiff
## Puppies & Rescues @puppies @rescuedogs @dogpictures
- Puppies @!puppies @dogpictures ~ puppy, puppies, pup
  First days home: first day, home | Sleepy puppies: sleep, sleeping | Puppy litters: litter | Puppy growth: growth, then and now | Puppy chaos: chewed, destroyed
- Rescue stories @rescuedogs @dogs ~ rescue, adopted, shelter, gotcha day
  Gotcha days: gotcha day | Before & after: before, after | Shelter pups: shelter | Foster fails: foster | Street dogs: street
- Senior dogs @seniordogs @dogs ~ senior, old, years old, grey
  Grey muzzles: grey, gray | Birthdays: birthday | Last days: last day, rainbow bridge | Old friends: old | Still going: still
- Dog birthdays & milestones @dogs @dogpictures ~ birthday, gotcha day, years, anniversary
  Birthday cakes: cake | 1st birthdays: 1st, first birthday | Gotcha days: gotcha | Party hats: hat | Big numbers: 10, 12, 15
## Dog Adventures @dogs @hikingwithdogs @dogpictures
- Hiking dogs @hikingwithdogs @dogs ~ hike, hiking, trail, summit, mountain
  Summit dogs: summit | Trail dogs: trail | Backpacking dogs: backpacking, pack | Snow hikes: snow | Lake hikes: lake
- Beach dogs @dogs @dogpictures ~ beach, ocean, sand, waves
  Beach zoomies: zoomies, running | Surfing dogs: surf | Sandy dogs: sand | Sunset beach: sunset | First beach trips: first
- Snow dogs @dogs @dogpictures ~ snow, winter, snowy
  First snows: first snow | Snow zoomies: zoomies | Sled dogs: sled | Snow faces: face | Winter coats: coat
- Road trip dogs @dogs @dogpictures ~ car, road trip, truck, window
  Window heads: window | Truck dogs: truck | Seatbelts: seatbelt | Long drives: drive | Camping dogs: camping
## Training & Sports @Dogtraining @OPTSD @dogs
- Training wins @dogpictures @aww ~ training, trained, trick, learned
  Tricks: trick | Recall: recall | Leash training: leash | Crate training: crate | Graduations: graduation, class
- Dog sports @Dogtraining @agility @dogs ~ agility, frisbee, dock diving, flyball
  Agility: agility | Frisbee: frisbee | Dock diving: dock diving | Flyball: flyball | Herding trials: herding
- Service dogs @dogpictures @aww ~ service dog, therapy dog, guide dog
  Service dogs: service dog | Therapy dogs: therapy | Guide dogs: guide dog | In training: in training | Vest shots: vest
- Grooming @doggrooming @dogs ~ groom, groomed, haircut, grooming
  Before & after: before, after | Doodle cuts: doodle | Show cuts: show | Home grooming: home | Fluffy results: fluffy
## Dog Life @dogs @dogpictures @WhatsWrongWithYourDog
- Silly dogs @WhatsWrongWithYourDog @dogpictures ~ weird, silly, derp, funny
  Derpy faces: derp, face | Weird sleeping: sleeping | Tongue out: tongue | Head tilts: tilt | Guilty dogs: guilty
- Dog and cat friends @dogs @cats ~ cat, best friends, together, friends
  Cuddle buddies: cuddle | Nap piles: nap | Siblings: brother, sister | Babies & dogs: baby | Odd friends: friends
- Dog beds & gear @dogs @dogpictures ~ bed, collar, harness, toy
  Dog beds: bed | Collars: collar | Harnesses: harness | Toy piles: toys | Custom gear: custom
- Costumes @dogs @dogpictures ~ costume, halloween, dressed, sweater
  Halloween costumes: halloween | Sweaters: sweater | Christmas outfits: christmas | Raincoats: raincoat | Bandanas: bandana

# Cats {cats} > dogs, houseplants, wildlife-nature @cats @catpictures @aww
## Cat Breeds & Colors @cats @catpictures
- Orange cats @OneOrangeBraincell @cats ~ orange, ginger, orange cat
  Orange kittens: kitten | Chonky oranges: chonk, big | Orange derps: derp | Orange naps: sleep, nap | Orange duos: two
- Black cats @blackcats @cats ~ black cat, void, panther
  Voids: void | Black kittens: kitten | Yellow eyes: eyes | Halloween voids: halloween | Black cat naps: sleeping
- Tuxedos & calicos @tuxedocats @calicokitties @cats ~ tuxedo, calico, tortie, tabby
  Tuxedos: tuxedo | Calicos: calico | Torties: tortie, tortoiseshell | Tabbies: tabby | Siamese: siamese
- Fancy breeds @MaineCoon @ragdolls @cats ~ maine coon, ragdoll, sphynx, bengal, british shorthair
  Maine Coons: maine coon | Ragdolls: ragdoll | Sphynx: sphynx | Bengals: bengal | British shorthairs: british shorthair
## Kittens & Rescues @kittens @CatAdvice @cats
- Kittens @!kittens @catpictures ~ kitten, kittens, baby
  Tiny kittens: tiny | Litters: litter | Bottle babies: bottle | Kitten zoomies: zoomies | First days: first day
- Rescues @cats @rescuecats ~ rescue, rescued, adopted, stray, shelter
  Stray rescues: stray | Before & after: before, after | Shelter cats: shelter | Gotcha days: gotcha | Found kittens: found
- Senior cats @seniorkitties @cats ~ senior, old, years old
  Old cats: old | Birthdays: birthday | Last photos: last, rainbow bridge | Still going: still | Grey whiskers: grey, gray
- Fosters @fosterit @cats ~ foster, fostering, foster fail
  Foster fails: foster fail | Foster litters: litter | Adoption days: adopted | Foster setups: room, setup | Foster updates: update
## Cat Behavior @cats @Catswithjobs @CatsAreAssholes
- Sleeping cats @catpictures @cats ~ sleep, sleeping, nap, asleep
  Weird positions: position, weird | Sunbeams: sun, sunbeam | Cuddle naps: cuddle | Boxes: box | Blankets: blanket
- Loaf & chonk @catloaf @chonkers @cats ~ loaf, chonk, chonky, fat, big boy
  Loafs: loaf | Chonks: chonk, chonky | Diet progress: diet, weight | Big boys: big boy | Floofs: floof, fluffy
- Cats being weird @catpictures @CatsAreAssholes ~ weird, why, what, derp
  Derps: derp | Tongue blep: blep, tongue | Stares: stare, staring | If it fits: fits, sits | Mischief: knocked, destroyed
- Cats with jobs @Catswithjobs @cats ~ job, working, helping, supervisor
  Work-from-home helpers: work, laptop | Kitchen inspectors: kitchen | Shop cats: shop, store | Farm cats: farm, barn | Bodega cats: bodega
## Cat Setups @cats @CatTrees @CatAdvice
- Cat trees & shelves @cats @catpictures ~ cat tree, cat shelf, catio, wall shelves
  Cat walls: wall | Cat trees: cat tree | Window perches: window | Hammocks: hammock | DIY trees: diy
- Catios @catio @cats ~ catio, outdoor enclosure, balcony
  Catio builds: build | Balcony catios: balcony | Window boxes: window | Garden catios: garden | Tunnels: tunnel
- Litter & feeding @CatAdvice @cats ~ litter box, feeder, fountain, food
  Litter setups: litter | Auto feeders: feeder | Fountains: fountain | Food bowls: bowl | Hidden litter: hidden
- Cat toys & beds @cats @catpictures ~ toy, toys, bed, tunnel
  Toy hauls: toys | Beds: bed | Tunnels: tunnel | Boxes: box | Crinkle balls: ball
## Big & Wild Cats @bigcats @cats
- Big cats @!bigcats ~ lion, tiger, leopard, jaguar, cheetah
  Lions: lion | Tigers: tiger | Leopards: leopard | Cheetahs: cheetah | Jaguars: jaguar
- Wild small cats @bigcats @cats ~ lynx, serval, bobcat, caracal, ocelot
  Lynx: lynx | Servals: serval | Bobcats: bobcat | Caracals: caracal | Sand cats: sand cat
- Sanctuary cats @bigcats ~ sanctuary, rescue, zoo
  Sanctuaries: sanctuary | Rescued big cats: rescue | Zoo cats: zoo | Cubs: cub | Enrichment: enrichment
- Cats in art @cats @Art ~ painting, drawing, art, portrait
  Cat portraits: portrait | Cat paintings: painting | Cat sketches: sketch, drawing | Cat crochet: crochet | Cat tattoos: tattoo

# Aquariums {aquariums} > houseplants, reptiles, fishing, wildlife-nature @Aquariums @PlantedTank @aquarium
## Planted Tanks @PlantedTank @Aquascape
- Planted tank setups @!PlantedTank ~ planted, tank, setup, scape
  Nano planted: nano | Large planted: 75, 125, large | Low-tech: low tech | CO2 tanks: co2 | Rescapes: rescape
- Aquascapes @!Aquascape @PlantedTank ~ aquascape, scape, iwagumi, nature aquarium
  Iwagumi: iwagumi | Nature aquariums: nature | Jungle scapes: jungle | Dutch scapes: dutch | Hardscapes: hardscape, rock, wood
- Carpets & foregrounds @PlantedTank @Aquascape ~ carpet, monte carlo, hairgrass, foreground
  Monte Carlo: monte carlo | Hairgrass: hairgrass | Mosses: moss | Buce: bucephalandra, buce | Stems: stem
- Algae & problems @PlantedTank @Aquariums ~ algae, problem, help, melting, bba
  BBA: bba, black beard | Green water: green water | Hair algae: hair algae | Plant melt: melt, melting | Deficiencies: deficiency
## Fish Keeping @Aquariums @bettafish @Cichlid
- Bettas @!bettafish ~ betta, bettas, fin
  Halfmoons: halfmoon | Koi bettas: koi | Betta tanks: tank | Fin growth: fin | Rescue bettas: rescue
- Community tanks @Aquariums @aquarium ~ community, tetra, guppy, school
  Neon tetras: neon tetra, tetra | Guppies: guppy | Rasboras: rasbora | Corydoras: cory, corydoras | Schooling shots: school, schooling
- Cichlids @!Cichlid @Aquariums ~ cichlid, african, discus, oscar
  African cichlids: african | Discus: discus | Oscars: oscar | Angelfish: angelfish | Rams: ram
- Goldfish & ponds @Goldfish @ponds ~ goldfish, pond, koi
  Fancy goldfish: fancy | Koi ponds: koi | Pond builds: pond build | Goldfish tanks: tank | Winter ponds: winter
## Reef & Saltwater @ReefTank @saltwateraquarium
- Reef tanks @!ReefTank ~ reef, reef tank, coral
  Full tank shots: fts, full tank | Nano reefs: nano | Mixed reefs: mixed | SPS dominant: sps | Night shots: night, blue
- Corals @ReefTank @Corals ~ coral, zoa, euphyllia, acropora, frag
  Zoas: zoa, zoanthid | Euphyllia: euphyllia, torch, hammer | Acros: acro, acropora | Frags: frag | Coral growth: growth
- Clownfish & reef fish @ReefTank @saltwateraquarium ~ clownfish, clown, tang, goby, wrasse
  Clownfish: clown, clownfish | Tangs: tang | Gobies: goby | Wrasses: wrasse | Anemones: anemone
- Reef equipment @ReefTank @saltwateraquarium ~ sump, skimmer, lights, setup, equipment
  Sumps: sump | Skimmers: skimmer | Reef lights: light, radion | ATOs: ato | Equipment closets: closet
## Shrimp & Inverts @shrimptank @Aquariums
- Shrimp tanks @!shrimptank ~ shrimp, neocaridina, caridina
  Cherry shrimp: cherry | Blue dream: blue | Caridina: caridina, crystal | Berried shrimp: berried | Colonies: colony
- Snails @Aquariums @snails ~ snail, snails, nerite, mystery snail
  Mystery snails: mystery | Nerites: nerite | Rabbit snails: rabbit | Snail eggs: eggs | Shell colors: shell
- Crabs & crayfish @Aquariums @crayfish ~ crab, crayfish, lobster
  Crayfish: crayfish | Vampire crabs: vampire crab | Hermit crabs: hermit | Molting: molt | Blue crays: blue
- Nano tanks @Aquariums @nanotank ~ nano, jar, bowl, small tank
  Jar tanks: jar | Desk tanks: desk | Walstad bowls: walstad | Pico tanks: pico | Shrimp nanos: shrimp
## Tank Builds & Gear @Aquariums @aquarium @AquaSwap
- Tank builds @Aquariums @aquarium ~ build, new tank, stand, setup
  Stands: stand | Rack systems: rack | In-wall tanks: in wall | Big upgrades: upgrade | Day one: day one, day 1
- Fish rooms @Aquariums @fishroom ~ fish room, fishroom, rack, tanks
  Rack walls: rack | Breeding rooms: breeding | Garage fish rooms: garage | Basement fish rooms: basement | Tours: tour
- Paludariums @paludarium @Aquascape ~ paludarium, riparium, waterfall
  Waterfalls: waterfall | Rainforest scapes: rainforest | Ripariums: riparium | Land sections: land | Frogs: frog
- Biotopes @Aquariums @Aquascape ~ biotope, blackwater, amazon, river
  Blackwater: blackwater | Amazon biotopes: amazon | Asian rivers: asia | Lake tanganyika: tanganyika | Stream tanks: stream

# Reptiles & Exotics {reptiles} > aquariums, birds, wildlife-nature, dogs @reptiles @herpetology @snakes
## Snakes @snakes @ballpython @cornsnakes
- Ball pythons @!ballpython ~ ball python, bp, morph
  Morphs: morph | Hatchlings: hatchling, baby | Big girls: big, female | Enclosures: enclosure | Sheds: shed
- Corn snakes @!cornsnakes @snakes ~ corn snake, corn
  Morphs: morph | Hatchlings: baby, hatchling | Feeding: feeding | Enclosures: enclosure | Handling: handling
- Hognose & colubrids @hognosesnakes @snakes ~ hognose, king snake, milk snake
  Hognoses: hognose | King snakes: king snake, kingsnake | Milk snakes: milk snake | Dramatic deaths: dramatic, playing dead | Babies: baby
- Big constrictors @snakes @reptiles ~ boa, python, retic, burmese
  Boas: boa | Retics: retic | Burmese: burmese | Carpet pythons: carpet | Handling big snakes: big, huge
## Lizards @leopardgeckos @BeardedDragons @CrestedGecko
- Leopard geckos @!leopardgeckos ~ leopard gecko, leo, gecko
  Morphs: morph | Babies: baby | Smiles: smile | Tail growth: tail | Enclosures: enclosure
- Bearded dragons @!BeardedDragons ~ bearded dragon, beardie
  Beardie faces: face | Basking: basking | Enclosures: enclosure | Feeding: feeding | Baby beardies: baby
- Crested geckos @CrestedGecko @geckos ~ crested gecko, crestie, gargoyle gecko
  Cresties: crestie | Gargoyles: gargoyle | Bioactive setups: bioactive | Morphs: morph | Babies: baby
- Monitors & tegus @Monitorlizards @tegu @reptiles ~ monitor, tegu, savannah, ackie
  Ackies: ackie | Tegus: tegu | Savannahs: savannah | Big enclosures: enclosure | Handling: handling
## Amphibians @frogs @axolotls
- Frogs @!frogs ~ frog, frogs, dart frog, tree frog
  Dart frogs: dart | Tree frogs: tree frog | Pacman frogs: pacman | Wild frogs: wild, found | Vivariums: vivarium
- Axolotls @!axolotls ~ axolotl, axie
  Leucistic: leucistic | Wild type: wild type | Axie tanks: tank | Babies: baby | Gills: gills
- Salamanders & newts @salamanders @reptiles ~ salamander, newt
  Wild salamanders: wild | Newts: newt | Fire salamanders: fire | Habitats: habitat | Found under logs: found
- Toads @frogs @herpetology ~ toad, toads
  Wild toads: wild | Pet toads: pet | Toad homes: house | Rain toads: rain | Tiny toads: tiny
## Turtles & Tortoises @turtle @tortoise
- Tortoises @!tortoise ~ tortoise, sulcata, russian tortoise
  Sulcatas: sulcata | Russian tortoises: russian | Outdoor pens: outdoor, pen | Hatchlings: hatchling, baby | Eating shots: eating
- Turtles @!turtle ~ turtle, red eared slider, musk turtle
  Sliders: slider | Musk turtles: musk | Turtle tanks: tank | Basking: basking | Wild turtles: wild
- Sea turtles @turtle @scuba ~ sea turtle, sea turtles, hatchling
  Hatchlings: hatchling | Diving encounters: diving | Rescue releases: release | Nesting: nest | Close-ups: close
- Box turtles @turtle @tortoise ~ box turtle, box turtles
  Enclosures: enclosure | Wild box turtles: wild | Shell patterns: shell | Eating: eating | Hatchlings: baby
## Invertebrates & Exotics @tarantulas @isopods @reptiles
- Tarantulas @!tarantulas ~ tarantula, sling, molt
  Slings: sling | Molts: molt | Enclosures: enclosure | Colorful Ts: blue, green | Rehouses: rehouse
- Isopods @!isopods ~ isopod, isopods, cubaris, rubber ducky
  Rubber duckies: rubber ducky | Cubaris: cubaris | Colonies: colony | Bioactive tubs: bioactive | Mantis isopods: mantis
- Mantises & bugs @MantisMania @insects ~ mantis, beetle, stick insect, insect
  Mantises: mantis | Beetles: beetle | Stick insects: stick | Orchid mantis: orchid | Molts: molt
- Bioactive builds @bioactive @reptiles ~ bioactive, vivarium, terrarium, enclosure build
  Background builds: background | Planted vivs: planted | Drainage layers: drainage | Cleanup crews: cleanup crew | Big builds: build

# Birds {birds} > wildlife-nature, photography, reptiles, gardening @birding @birdpics @parrots
## Birdwatching @birding @whatsthisbird
- Backyard birds @birding @birdpics ~ backyard, yard, garden, window
  Cardinals: cardinal | Blue jays: blue jay | Robins: robin | Chickadees: chickadee | Finches: finch
- Bird feeders @birding @backyardbirds ~ feeder, feeders, bird feeder, suet
  Feeder cams: feeder cam, camera | Squirrel thieves: squirrel | Hummingbird feeders: hummingbird | Winter feeders: winter | Feeder setups: setup
- Lifers & rare sightings @birding @whatsthisbird ~ lifer, rare, first, spotted
  Lifers: lifer | Rare visitors: rare | First sightings: first | Rarity chases: chase | Mystery birds: id, what bird
- Birding trips @birding ~ trip, birding trip, big day, count
  Big days: big day | Migration: migration | Christmas counts: christmas count, cbc | Wetland trips: wetland | Hotspots: hotspot
## Bird Photography @birdpics @wildlifephotography
- Raptors @birdpics @Raptors ~ owl, eagle, hawk, falcon, osprey
  Owls: owl | Eagles: eagle | Hawks: hawk | Falcons: falcon | Ospreys: osprey
- Songbirds @birdpics @birding ~ warbler, sparrow, wren, bluebird, songbird
  Warblers: warbler | Bluebirds: bluebird | Wrens: wren | Sparrows: sparrow | Kingfishers: kingfisher
- Birds in flight @birdpics @wildlifephotography ~ flight, flying, in flight, bif
  Wing spreads: wings | Takeoffs: takeoff | Landings: landing | Diving: dive | Formations: flock
- Waterbirds @birdpics @birding ~ heron, egret, duck, pelican, crane
  Herons: heron | Egrets: egret | Ducks: duck | Pelicans: pelican | Cranes: crane
## Pet Birds @parrots @budgies @cockatiel
- Parrots @!parrots ~ parrot, macaw, african grey, conure, amazon
  Macaws: macaw | African greys: african grey | Conures: conure | Amazons: amazon | Cockatoos: cockatoo
- Budgies & cockatiels @budgies @cockatiel ~ budgie, budgies, cockatiel, tiel
  Budgies: budgie | Cockatiels: cockatiel | Pairs: pair | Baby birds: baby | Cage setups: cage
- Bird enrichment @parrots @budgies ~ toy, toys, enrichment, play gym
  Foraging toys: foraging | Play gyms: play gym | DIY toys: diy | Shredding: shred, shredding | Training: training
- Pigeons & chickens @pigeon @BackYardChickens ~ pigeon, dove, chicken, hen
  Pigeons: pigeon | Doves: dove | Fancy chickens: fancy, silkie | Rescue pigeons: rescue | Ducks: duck
## Birds & Habitat @birding @gardening
- Birdhouses @birding @woodworking ~ birdhouse, nest box, bird house
  Nest boxes: nest box | Builds: built, build | Occupants: moved in | Bluebird boxes: bluebird | Owl boxes: owl box
- Nests & babies @birding @birdpics ~ nest, babies, chicks, eggs, fledgling
  Nests: nest | Eggs: eggs | Chicks: chicks | Fledglings: fledgling | Feeding time: feeding
- Bird baths @birding @gardening ~ bird bath, birdbath, bath, water
  Bath visitors: visitor | Heated baths: heated | Splash shots: splash | DIY baths: diy | Fountain baths: fountain
- Bird rescues @birding @Animalrescue ~ rescue, injured, rehab, saved
  Rehab releases: release | Injured birds: injured | Window strikes: window | Orphaned chicks: orphan | Wildlife centers: rehab
## Exotic & Tropical Birds @birdpics @birding
- Tropical birds @birdpics @birding ~ toucan, hornbill, quetzal, tropical, rainforest
  Toucans: toucan | Hornbills: hornbill | Quetzals: quetzal | Bee-eaters: bee-eater | Sunbirds: sunbird
- Hummingbirds @hummingbirds @birdpics ~ hummingbird, hummingbirds, hummer
  Hovering: hover, hovering | Feeders: feeder | Nests: nest | Iridescence: iridescent | Tiny babies: baby
- Peacocks & pheasants @birdpics ~ peacock, peafowl, pheasant, turkey
  Peacocks: peacock | Pheasants: pheasant | Wild turkeys: turkey | Displays: display | White peacocks: white
- Penguins & seabirds @birdpics @birding ~ penguin, puffin, albatross, gull
  Penguins: penguin | Puffins: puffin | Albatrosses: albatross | Gannets: gannet | Gulls: gull
`;
export default source;
