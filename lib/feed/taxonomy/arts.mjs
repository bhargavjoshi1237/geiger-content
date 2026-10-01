// Arts & crafts topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Drawing & Illustration {drawing} > painting, digital-art, tattoos, anime-manga @drawing @Art @sketches
## Sketching @sketches @drawing @Sketchbook
- Sketchbook tours @Sketchbook @sketches ~ sketchbook, sketchbook tour, pages, filled
  Filled sketchbooks: filled, finished | Daily pages: daily | Travel sketchbooks: travel | Studies: study, studies | First sketchbooks: first
- Urban sketching @urbansketchers @sketches ~ urban sketch, urban sketching, plein air, on location
  Street scenes: street | Cafes: cafe | Buildings: building | Travel sketches: travel | Ink & wash: ink and wash, watercolor
- Life drawing @drawing @ArtFundamentals ~ figure drawing, life drawing, gesture, anatomy
  Gestures: gesture | Anatomy studies: anatomy | Hands: hands | Portrait studies: portrait | Model sessions: model
- Pencil realism @drawing @Art ~ pencil, graphite, realistic, realism
  Portraits: portrait | Eyes: eye, eyes | Animals: animal, dog, cat | Hands: hand | Hyperrealism: hyperrealism, hyperrealistic
## Ink & Pens @drawing @inktober @fountainpens
- Ink drawings @drawing @inktober ~ ink, pen, fineliner, inktober
  Inktober: inktober | Stippling: stippling, dots | Hatching: hatching, crosshatch | Brush pens: brush pen | Line art: line art
- Fountain pens @!fountainpens ~ fountain pen, pen, nib, ink
  Nib shots: nib | Ink swatches: swatch | Pen collections: collection | Vintage pens: vintage | Pen and paper: paper, notebook
- Calligraphy & lettering @Calligraphy @HandLettering ~ calligraphy, lettering, script, hand lettering
  Copperplate: copperplate | Brush lettering: brush | Blackletter: blackletter, gothic | Signage: sign | Practice sheets: practice
- Zines & comics @comics @ComicBookArt ~ comic, zine, panel, page
  Comic pages: page | Webcomics: webcomic | Zines: zine | Panels: panel | Character sheets: character sheet
## Colored Media @drawing @ColoredPencils @markers
- Colored pencils @!ColoredPencils @drawing ~ colored pencil, coloured pencil, prismacolor
  Realistic colored pencil: realistic | Animals: animal | Portraits: portrait | Still life: still life | Blending: blending
- Markers @drawing @copic ~ copic, marker, markers, alcohol marker
  Copic art: copic | Character art: character | Marker studies: study | Product art: product | Swatches: swatch
- Pastels @pastel @Art ~ pastel, soft pastel, oil pastel
  Oil pastels: oil pastel | Soft pastels: soft pastel | Landscapes: landscape | Portraits: portrait | Animals: animal
- Charcoal @drawing @Art ~ charcoal, conte, chalk
  Charcoal portraits: portrait | Figure studies: figure | Dark drawings: dark | Animals: animal | Landscapes: landscape
## Learning to Draw @learnart @ArtFundamentals @drawing
- Progress posts @learnart @drawing ~ progress, then and now, years, improvement
  Year comparisons: year | Redraws: redraw | Daily practice: daily, day | Before & after: before, after | First drawings: first
- Fundamentals @ArtFundamentals @learnart ~ fundamentals, drawabox, perspective, boxes
  Drawabox: drawabox | Perspective: perspective | Construction: construction | Values: value, values | Shading: shading
- Critique requests @learnart @drawing ~ critique, feedback, advice, help
  Anatomy critiques: anatomy | Composition critiques: composition | Color critiques: color | Style critiques: style | Portfolio reviews: portfolio
- Art challenges @drawing @Art ~ challenge, draw this in your style, dtiys, prompt
  DTIYS: dtiys, draw this in your style | Prompt lists: prompt | 100 days: 100 days | Monthly challenges: month | Collabs: collab
## Illustration @Illustration @Art @drawing
- Character design @characterdesign @Illustration ~ character design, oc, character, original character
  OCs: oc, original character | Turnarounds: turnaround | Creature designs: creature | Costume designs: outfit | Expressions: expression
- Children's illustration @Illustration @childrensbooks ~ picture book, children's book, kids book, whimsical
  Picture books: picture book | Whimsical scenes: whimsical | Animal characters: animal | Cozy scenes: cozy | Book spreads: spread
- Editorial & posters @Illustration @Art ~ poster, editorial, print, illustration
  Posters: poster | Book covers: cover | Prints: print | Editorial: editorial | Album art: album
- Fantasy art @ImaginaryLandscapes @Illustration ~ fantasy, dragon, castle, wizard
  Dragons: dragon | Castles: castle | Wizards: wizard | Fantasy maps: map | Creatures: creature

# Painting {painting} > drawing, digital-art, pottery, interior-design @painting @Art @Watercolor
## Watercolor @Watercolor @painting
- Watercolor landscapes @!Watercolor ~ watercolor, watercolour, landscape
  Skies: sky | Mountains: mountain | Seascapes: sea, ocean | Forests: forest | Night scenes: night
- Loose florals @Watercolor ~ flowers, floral, botanical, loose
  Loose florals: loose | Botanical studies: botanical | Roses: rose | Wildflowers: wildflower | Wreaths: wreath
- Watercolor animals @Watercolor ~ bird, cat, dog, animal, fox
  Birds: bird | Cats: cat | Dogs: dog | Foxes: fox | Wildlife: wildlife
- Gouache @gouache @painting ~ gouache, plein air, study
  Plein air: plein air | Gouache studies: study | Miniatures: mini, tiny | Food painting: food | Cityscapes: city
## Oil & Acrylic @oilpainting @AcrylicPainting @painting
- Oil landscapes @oilpainting @painting ~ oil, landscape, plein air, oil painting
  Plein air oils: plein air | Seascapes: sea | Skies: sky | Snowscapes: snow | Golden hour: golden, sunset
- Oil portraits @oilpainting @portraits ~ portrait, oil portrait, self portrait
  Commissions: commission | Self portraits: self portrait | Old master style: old master | Alla prima: alla prima | Studies: study
- Acrylic paintings @AcrylicPainting @painting ~ acrylic, canvas, acrylic painting
  Space paintings: space, galaxy | Abstract acrylics: abstract | Pour paintings: pour | Palette knife: palette knife | Night skies: night
- Still life @painting @oilpainting ~ still life, fruit, flowers, vase
  Fruit: fruit | Flowers: flowers | Glass & reflections: glass, reflection | Food: food | Objects: objects
## Abstract & Modern @abstractart @painting @Art
- Abstract paintings @!abstractart @painting ~ abstract, expressionism, texture
  Textured: texture, textured | Color fields: color field | Geometric: geometric | Expressive: expressive | Large canvases: large, big
- Pour & fluid art @PourPainting @AcrylicPainting ~ pour, fluid art, acrylic pour, cells
  Cell pours: cells | Swipes: swipe | Dutch pours: dutch | Resin art: resin | Ring pours: ring
- Murals @Murals @streetart ~ mural, wall, painted wall
  Street murals: street | Indoor murals: indoor, room | Kids room murals: kids | Mural progress: progress | Large murals: large
- Street art & graffiti @streetart @Graffiti ~ graffiti, street art, piece, spray paint
  Pieces: piece | Stencils: stencil | Spray paint art: spray paint | Paste-ups: paste up | Legal walls: legal wall
## Painting Practice @painting @ArtistLounge @learnart
- Studio tours @ArtistLounge @painting ~ studio, art studio, workspace
  Home studios: home studio | Easels: easel | Paint tables: palette, table | Small studios: small | Storage walls: storage
- Progress & WIP @painting @Art ~ wip, progress, in progress, steps
  Step-by-step: step | WIP shots: wip | Time-lapses: timelapse | Before & after: before, after | Hours taken: hours
- Supplies @ArtistLounge @painting ~ paints, brushes, palette, supplies
  Paint hauls: haul | Brushes: brush, brushes | Palettes: palette | Pans & tubes: tubes, pans | DIY supplies: diy
- Selling & shows @ArtistLounge @Art ~ sold, exhibition, show, gallery, art fair
  First sales: sold, first sale | Exhibitions: exhibition | Art fairs: art fair | Commissions: commission | Gallery walls: gallery
## Miniature & Craft Painting @painting @minipainting
- Tiny paintings @painting @Art ~ tiny, mini, miniature painting, small
  Coin-sized: coin | Mini canvases: mini canvas | Ring paintings: ring | Bottle caps: cap | Matchbox art: matchbox
- Painted objects @painting @somethingimade ~ painted, rock, shoes, jacket
  Painted rocks: rock | Painted shoes: shoes | Painted jackets: jacket | Painted furniture: furniture | Painted mugs: mug
- Paint by numbers @PaintByNumbers @painting ~ paint by numbers, pbn
  Finished PBNs: finished | Progress: progress | Pet portraits: pet | Landscapes: landscape | Framed: framed
- Glass & window painting @painting @Art ~ window, glass, stained glass
  Window paintings: window | Stained glass: stained glass | Holiday windows: holiday | Glass bottles: bottle | Mirrors: mirror

# Digital Art & 3D {digital-art} > drawing, painting, gaming, anime-manga, 3d-printing @DigitalArt @blender @Procreate
## Digital Painting @DigitalArt @Procreate @DigitalPainting
- Procreate art @!Procreate @DigitalArt ~ procreate, ipad
  Portraits: portrait | Landscapes: landscape | Lettering: lettering | Fan art: fan art | Time-lapses: timelapse
- Digital portraits @DigitalPainting @DigitalArt ~ portrait, face, character portrait
  Realistic portraits: realistic | Stylized portraits: stylized | Self portraits: self portrait | Commissions: commission | Studies: study
- Concept art @ConceptArt @DigitalArt ~ concept art, concept, environment, keyframe
  Environments: environment | Keyframes: keyframe | Creatures: creature | Props: prop | Vehicles: vehicle
- Digital landscapes @DigitalArt @ImaginaryLandscapes ~ landscape, scenery, environment, background
  Fantasy vistas: fantasy | Sci-fi cities: sci-fi, city | Cozy scenes: cozy | Night scenes: night | Painted skies: sky
## 3D Rendering @blender @3Dmodeling @Cinema4D
- Blender renders @!blender ~ blender, render, cycles, eevee
  Donut tutorials: donut | Interior renders: interior | Product renders: product | Stylized renders: stylized | Procedural: procedural, geometry nodes
- 3D characters @blender @3Dmodeling ~ character, sculpt, zbrush, model
  Sculpts: sculpt | Stylized characters: stylized | Realistic characters: realistic | Creatures: creature | Topology: topology, wireframe
- Archviz @blender @archviz ~ archviz, architecture, interior, render
  Interiors: interior | Exteriors: exterior | Night renders: night | Kitchens: kitchen | Modern houses: house
- Motion & abstract 3D @Cinema4D @blender ~ abstract, motion, loop, simulation
  Simulations: simulation | Loops: loop | Abstract renders: abstract | Particles: particles | Satisfying loops: satisfying
## Pixel & Low Poly @PixelArt @lowpoly
- Pixel art scenes @PixelArt ~ scene, landscape, room, city
  Cozy rooms: room | Cityscapes: city | Landscapes: landscape | Night scenes: night | Rainy scenes: rain
- Low poly @lowpoly @blender ~ low poly, lowpoly, isometric, diorama
  Dioramas: diorama | Isometric rooms: isometric | Islands: island | Characters: character | Vehicles: vehicle
- Voxel art @VoxelArt @PixelArt ~ voxel, magicavoxel
  Voxel scenes: scene | Voxel characters: character | Voxel buildings: building | Animated voxels: animation | Tiny worlds: world
- Retro & vaporwave @outrun @DigitalArt ~ vaporwave, synthwave, outrun, retro
  Synthwave suns: sun, sunset | Neon grids: grid, neon | Retro cars: car | Vaporwave statues: statue | Retro cities: city
## Design & Type @graphic_design @Design @typography
- Graphic design @graphic_design ~ design, poster, logo, branding
  Posters: poster | Logos: logo | Branding: branding | Packaging: packaging | Album covers: album
- Typography @typography @graphic_design ~ type, typography, font, lettering
  Custom fonts: font | Type posters: poster | Lettering: lettering | Signage: sign | Kinetic type: animated
- UI & web design @web_design @UI_Design ~ ui, website, app, landing page, dashboard
  Dashboards: dashboard | Landing pages: landing page | Mobile apps: app | Redesigns: redesign | Dark modes: dark mode
- Infographics & maps @dataisbeautiful @MapPorn ~ map, chart, infographic, visualization
  Maps: map | Charts: chart | Infographics: infographic | Data viz: visualization | Hand-drawn maps: hand drawn
## AI-free Digital Craft @DigitalArt @animation
- 2D animation @animation @DigitalArt ~ animation, animated, frame, walk cycle
  Walk cycles: walk cycle | Frame-by-frame: frame by frame | Loops: loop | Short films: short film | Storyboards: storyboard
- Speedpaints & process @DigitalArt @DigitalPainting ~ process, speedpaint, steps, timelapse
  Process steps: steps | Speedpaints: speedpaint | Sketch to final: sketch | Layer breakdowns: layers | Color passes: color
- Fan art digital @DigitalArt @fanart ~ fan art, fanart, character
  Game fan art: game | Anime fan art: anime | Movie fan art: movie | Redesigns: redesign | Crossovers: crossover
- Digital art setups @DigitalArt @wacom ~ setup, tablet, cintiq, wacom, ipad
  Cintiqs: cintiq | Wacom tablets: wacom | iPad setups: ipad | Desk setups: desk | Gloves & stands: stand

# Tattoos {tattoos} > drawing, painting, fashion @tattoos @tattoo @TattooDesigns
## Tattoo Styles @tattoos @tattoo
- Traditional @tattoos ~ traditional, american traditional, old school, neo traditional
  American traditional: american traditional | Neo traditional: neo traditional | Japanese traditional: japanese, irezumi | Flash pieces: flash | Swallows & roses: swallow, rose
- Fine line @tattoos @tattoo ~ fine line, fineline, single needle, minimal
  Single needle: single needle | Floral fine line: floral, flower | Script: script | Micro tattoos: micro, tiny | Ornamental: ornamental
- Blackwork & dotwork @tattoos @blackwork ~ blackwork, dotwork, geometric, mandala
  Geometric: geometric | Mandalas: mandala | Dotwork: dotwork | Heavy black: heavy black, blackout | Ornamental: ornamental
- Realism @tattoos @tattoo ~ realism, realistic, black and grey, portrait
  Portraits: portrait | Black and grey: black and grey | Color realism: color realism | Animal realism: animal | Micro realism: micro realism
## Placements & Projects @tattoos @tattoo
- Sleeves @tattoos ~ sleeve, full sleeve, half sleeve
  Full sleeves: full sleeve | Half sleeves: half sleeve | Leg sleeves: leg sleeve | Sleeve progress: progress | Japanese sleeves: japanese
- Back pieces @tattoos ~ back piece, backpiece, full back
  Full backs: full back | Upper backs: upper back | Spine tattoos: spine | Progress sessions: session | Healed backs: healed
- Small tattoos @tattoos @tattoo ~ small, tiny, first tattoo, minimal
  First tattoos: first tattoo | Matching tattoos: matching | Finger tattoos: finger | Wrist tattoos: wrist | Ankle tattoos: ankle
- Chest & leg pieces @tattoos ~ chest piece, chest, leg, thigh, calf
  Chest pieces: chest | Thigh pieces: thigh | Calf pieces: calf | Knee ditches: knee | Stomach pieces: stomach
## Tattoo Meanings @tattoos @tattoo
- Memorial tattoos @tattoos @tattoo ~ memorial, in memory, rip, passed
  Pet memorials: pet, dog, cat | Parent memorials: mom, dad | Handwriting: handwriting | Portraits: portrait | Dates: date
- Pet tattoos @tattoos @tattoo ~ dog, cat, pet, paw
  Dog portraits: dog | Cat portraits: cat | Paw prints: paw | Line art pets: line | Pet memorials: memorial
- Pop culture tattoos @tattoos @tattoo ~ anime, star wars, lord of the rings, zelda, pokemon
  Anime: anime | Games: zelda, pokemon, game | Movies: star wars, lotr | Cartoons: cartoon | Book quotes: book, quote
- Family & matching @tattoos @tattoo ~ matching, sister, brother, couple, family
  Sibling tattoos: sister, brother | Couple tattoos: couple | Parent & child: mom, dad | Friend tattoos: friend | Twin tattoos: twin
## Tattoo Process @tattoos @TattooArtists
- Healed vs fresh @tattoos ~ healed, fresh, healing, years later
  Healed shots: healed | Fresh ink: fresh | Healing process: healing | Years later: years | Peeling: peeling
- Cover-ups & reworks @tattoos @tattoo ~ cover up, coverup, cover-up, rework
  Cover-ups: cover up, coverup | Reworks: rework | Laser fades: laser | Blastovers: blastover | Before & after: before, after
- Tattoo artists @TattooArtists @tattoos ~ artist, apprentice, shop, flash day
  Apprentices: apprentice | Flash days: flash day | Shop interiors: shop | Practice skins: practice skin | Machines: machine
- Tattoo designs @TattooDesigns @tattoos ~ design, drawing, stencil, sketch
  Stencils: stencil | Sketches: sketch | Flash sheets: flash sheet | Commissioned designs: commission | Custom designs: custom
## Body Art @tattoos @piercing
- Piercings @!piercing ~ piercing, piercings, septum, helix, curated ear
  Curated ears: curated ear | Septums: septum | Helix: helix | Nose piercings: nose | Jewelry upgrades: jewelry
- Henna @Mehndi @henna ~ henna, mehndi, mehendi
  Bridal henna: bridal | Hand henna: hand | Foot henna: foot | Minimal henna: minimal | Jagua: jagua
- Hand-poked tattoos @sticknpokes @tattoos ~ stick and poke, hand poke, handpoked
  Stick and pokes: stick and poke | Hand-poked: hand poke | Tiny pokes: tiny | Healed pokes: healed | Flash pokes: flash
- Tattoo flash art @TattooDesigns @flash ~ flash, flash sheet, design sheet
  Traditional flash: traditional | Fine line flash: fine line | Spooky flash: spooky, halloween | Cute flash: cute | Painted flash: painted

# Knitting & Crochet {knitting-crochet} > painting, cosplay, cats, collectibles-toys @knitting @crochet @Amigurumi
## Knitting @knitting
- Sweaters @!knitting ~ sweater, jumper, cardigan, pullover
  Colorwork sweaters: colorwork, fair isle | Cable sweaters: cable | First sweaters: first sweater | Cardigans: cardigan | Raglans: raglan
- Socks & accessories @knitting ~ socks, hat, beanie, mittens, scarf
  Socks: socks | Beanies: beanie, hat | Mittens: mittens | Scarves: scarf | Shawls: shawl
- Colorwork @knitting ~ colorwork, fair isle, stranded, intarsia
  Fair isle: fair isle | Yokes: yoke | Intarsia: intarsia | Mosaic knitting: mosaic | Double knitting: double knit
- Knitting projects @knitting ~ blanket, finished, fo, project
  Blankets: blanket | Finished objects: fo, finished | WIPs: wip | Baby knits: baby | Gifts: gift
## Crochet @crochet
- Crochet garments @!crochet ~ top, cardigan, sweater, vest, dress
  Tops: top | Cardigans: cardigan | Vests: vest | Dresses: dress | Bags: bag
- Blankets & granny squares @crochet ~ blanket, granny square, afghan, squares
  Granny squares: granny square | Blankets: blanket | Temperature blankets: temperature | C2C: c2c | Baby blankets: baby
- Tapestry crochet @crochet ~ tapestry, pixel, graphghan, colorwork
  Graphghans: graphghan | Pixel crochet: pixel | Tapestry bags: bag | Wall hangings: wall | Portraits: portrait
- Crochet home decor @crochet ~ pillow, rug, basket, coaster, decor
  Pillows: pillow | Rugs: rug | Baskets: basket | Coasters: coaster | Plant hangers: plant
## Amigurumi & Toys @Amigurumi @crochet
- Amigurumi animals @!Amigurumi ~ amigurumi, plush, animal
  Cats: cat | Bears: bear | Frogs: frog | Octopus: octopus | Dinosaurs: dino, dinosaur
- Character plushies @Amigurumi @crochet ~ character, pokemon, anime, game
  Pokemon: pokemon | Anime characters: anime | Game characters: game | Movie characters: movie | Original characters: original
- Tiny amigurumi @Amigurumi @crochet ~ tiny, mini, micro, keychain
  Micro crochet: micro | Keychains: keychain | Tiny animals: tiny | Earrings: earring | Thread crochet: thread
- Big plushies @Amigurumi @crochet ~ big, giant, huge, chunky
  Giant plushies: giant | Chunky yarn: chunky | Pillow plushies: pillow | Plush blankets: blanket | Cuddle toys: cuddle
## Yarn & Fiber @YarnAddicts @Spinning @knitting
- Yarn hauls @YarnAddicts @knitting ~ yarn, haul, stash, skeins
  Stash shots: stash | Yarn hauls: haul | Hand-dyed: hand dyed | Yarn stores: shop, store | Organized stashes: organized
- Hand spinning @!Spinning ~ spinning, handspun, wheel, spindle
  Handspun skeins: handspun | Spinning wheels: wheel | Drop spindles: spindle | Fiber prep: fiber, roving | Plying: ply
- Dyeing yarn @Yarndye @YarnAddicts ~ dye, dyed, dyeing, natural dye
  Natural dyes: natural dye | Speckled yarns: speckled | Gradients: gradient | Kettle dyes: kettle | Food coloring: food coloring
- Weaving @weaving ~ weaving, loom, woven, tapestry
  Floor looms: floor loom | Rigid heddle: rigid heddle | Tapestries: tapestry | Towels: towel | Rugs: rug
## Embroidery & Sewing @Embroidery @sewing @quilting
- Embroidery @!Embroidery ~ embroidery, embroidered, hoop, stitch
  Floral hoops: floral, flower | Clothing embroidery: jacket, shirt, jeans | Portraits: portrait | Landscapes: landscape | Patches: patch
- Cross-stitch @CrossStitch ~ cross stitch, cross-stitch, xstitch, pattern
  Finished pieces: finished | WIPs: wip | Pixel patterns: pixel | Funny samplers: funny, sampler | Framing: framed
- Quilting @!quilting ~ quilt, quilting, quilts, block
  Finished quilts: finished | Quilt blocks: block | Baby quilts: baby | Modern quilts: modern | Hand quilting: hand quilting
- Sewing projects @sewing @myog ~ sewing, sewed, sewn, made, dress
  Dresses: dress | Bags: bag | Outdoor gear: myog, gear | Alterations: alteration, hemmed | First projects: first

# Cosplay {cosplay} > anime-manga, gaming, 3d-printing, knitting-crochet, makeup-nails @cosplay @cosplayers @cosplaygirls
## Anime Cosplay @cosplay @cosplayers
- Shonen cosplay @cosplay @cosplayers ~ naruto, one piece, jujutsu kaisen, demon slayer, dragon ball
  Naruto: naruto | One Piece: one piece, luffy, zoro | Jujutsu Kaisen: jujutsu, gojo | Demon Slayer: demon slayer, tanjiro | Dragon Ball: dragon ball, goku
- Fantasy anime cosplay @cosplay @cosplayers ~ frieren, sailor moon, evangelion, chainsaw man
  Frieren: frieren | Sailor Moon: sailor moon | Evangelion: evangelion, asuka, rei | Chainsaw Man: chainsaw man, makima, power | Spy x Family: spy x family, yor
- Group cosplay @cosplay ~ group, squad, friends, group cosplay
  Anime groups: anime | Game groups: game | Duos: duo | Family cosplay: family, kids | Couples: couple
- Wigs & makeup @cosplay @cosplayprops ~ wig, makeup, styling, contacts
  Wig styling: wig | Character makeup: makeup | Prosthetics: prosthetic | Contacts: contacts | Transformations: transformation
## Game Cosplay @cosplay @cosplayers
- RPG cosplay @cosplay ~ final fantasy, elden ring, baldur's gate, witcher, zelda
  Final Fantasy: final fantasy | Elden Ring: elden ring, malenia | Baldur's Gate: baldur | Witcher: witcher, geralt, yennefer | Zelda: zelda, link
- Shooter & hero cosplay @cosplay ~ overwatch, halo, valorant, apex
  Overwatch: overwatch | Halo: halo, master chief | Valorant: valorant | Apex: apex | Mass Effect: mass effect
- Gacha & mobile cosplay @cosplay @cosplayers ~ genshin, honkai, arknights, blue archive
  Genshin: genshin | Honkai: honkai | Arknights: arknights | Blue Archive: blue archive | Zenless: zenless
- Retro game cosplay @cosplay ~ mario, sonic, street fighter, pokemon
  Mario: mario | Sonic: sonic | Street Fighter: street fighter, chun li | Pokemon: pokemon | Mortal Kombat: mortal kombat
## Props & Armor @cosplayprops @cosplay
- Armor builds @!cosplayprops ~ armor, armour, eva foam, foam
  EVA foam armor: eva foam, foam | Worbla: worbla | 3D printed armor: 3d printed | Weathering: weathered, weathering | Armor progress: progress
- Weapons & props @cosplayprops @cosplay ~ sword, prop, weapon, staff, gun
  Swords: sword | Staffs: staff | Blasters: blaster, gun | Shields: shield | Magic items: magic
- Helmets & masks @cosplayprops @cosplay ~ helmet, mask, visor
  Helmets: helmet | Masks: mask | Visors: visor | Mandalorian: mandalorian | Light-up helmets: led
- Wings & big builds @cosplayprops @cosplay ~ wings, big, huge, mech, mech suit
  Wings: wings | Mech suits: mech | Stilts: stilts | Giant props: giant | Puppets: puppet
## Costume Making @cosplay @sewing @costuming
- Sewing costumes @costuming @cosplay ~ sewing, sewn, handmade, fabric
  Ballgowns: gown, ballgown | Uniforms: uniform | Capes: cape | Embroidery details: embroidery | Patterns: pattern
- Historical costumes @HistoricalCostuming @costuming ~ historical, regency, victorian, medieval
  Regency: regency | Victorian: victorian | Medieval: medieval | Renaissance: renaissance | 18th century: 18th century
- Budget cosplay @cosplay ~ budget, cheap, closet cosplay, thrifted
  Closet cosplay: closet | Thrift builds: thrift | Cardboard props: cardboard | Last-minute: last minute | Under $50: $50
- Halloween costumes @Halloween @costumes ~ halloween, costume, costumes
  Couple costumes: couple | Family costumes: family | Kids costumes: kid | Scary costumes: scary | Pun costumes: pun
## Conventions @cosplay @Comicon
- Con photos @cosplay @Comicon ~ con, convention, comic con, anime expo
  Comic-Con: comic con | Anime Expo: anime expo | Dragon Con: dragon con | Con floors: floor | Meetups: meetup
- Photoshoots @cosplay @cosplayers ~ photoshoot, shoot, photographer, photo
  Studio shoots: studio | Outdoor shoots: outdoor | Night shoots: night | Edited shots: edit | Behind the scenes: behind the scenes, bts
- Cosplay contests @cosplay ~ contest, competition, award, masquerade
  Awards: award, won | Masquerades: masquerade | Stage shots: stage | Judging: judge | Championship: championship
- Then & now cosplay @cosplay ~ then and now, years, first cosplay, progress
  First cosplays: first cosplay | Year comparisons: years | Skill growth: progress | Re-made costumes: remake | Same character: same

# Miniatures & Tabletop {miniatures-tabletop} > painting, 3d-printing, lego, collectibles-toys, gaming @minipainting @Warhammer @DnD
## Miniature Painting @minipainting @Warhammer40k
- Painted minis @!minipainting ~ mini, miniature, painted, paint job
  Display-level: display | Speed paints: contrast, speed paint | Battle-ready: tabletop, battle ready | First minis: first | NMM & OSL: nmm, osl
- Warhammer 40K @Warhammer40k @minipainting ~ 40k, space marine, warhammer 40k, necron, ork
  Space Marines: space marine | Orks: ork | Necrons: necron | Tyranids: tyranid | Armies: army
- Age of Sigmar & fantasy @ageofsigmar @Warhammer ~ sigmar, aos, old world, fantasy
  Age of Sigmar: sigmar, aos | Old World: old world | Stormcast: stormcast | Skaven: skaven | Nighthaunt: nighthaunt
- Kitbashes @Warhammer @minipainting ~ kitbash, kitbashed, conversion, custom
  Conversions: conversion | Kitbashes: kitbash | Sculpted mods: green stuff | Custom heroes: custom | Scratch builds: scratch
## Terrain & Dioramas @TerrainBuilding @minipainting
- Terrain builds @!TerrainBuilding ~ terrain, scenery, table, board
  Gaming tables: table, board | Buildings: building, house | Ruins: ruins | Foam terrain: foam, xps | Trees & foliage: tree
- Dioramas @dioramas @TerrainBuilding ~ diorama, scene, vignette, base
  Vignettes: vignette | Bases: base | Water effects: water, resin | Snow scenes: snow | Ruins: ruins
- DnD terrain @DnD @TerrainBuilding ~ dungeon, tiles, battle map, dungeon tiles
  Dungeon tiles: tiles | Battle maps: battle map | Taverns: tavern | Caves: cave | Modular sets: modular
- Model railways @modeltrains @TerrainBuilding ~ model railway, layout, train, ho scale
  HO layouts: ho | N scale: n scale | Scenery: scenery | Stations: station | Bridges: bridge
## D&D & RPGs @DnD @rpg
- DnD tables @DnD @rpg ~ table, session, setup, game night
  Table setups: setup | Game nights: game night | Dungeon trays: tray | Screens: dm screen, screen | Snacks: snacks
- Dice @DiceGoblins @DnD ~ dice, dice set, d20, resin dice
  Resin dice: resin | Metal dice: metal | Handmade dice: handmade | Dice hoards: collection, hoard | Dice trays: tray
- Character art & minis @DnD @rpg ~ character, my character, party, oc
  Character portraits: portrait | Party art: party | Tieflings: tiefling | Dragonborn: dragonborn | Commissioned art: commission
- Maps & handouts @dndmaps @DnD ~ map, maps, handout, world map
  World maps: world map | Battle maps: battle map | City maps: city | Dungeon maps: dungeon | Handouts: handout
## Board Games @boardgames
- Board game nights @!boardgames ~ board game, game night, played, table
  Game nights: game night | Big box games: big box | Two-player games: two player | Party games: party | Kids games: kid
- Collections & shelves @boardgames ~ collection, shelf, shelves, kallax
  Kallax shelves: kallax | Full collections: collection | Shelfies: shelfie | Organizers: insert, organizer | New arrivals: arrived, new
- Upgrades & inserts @boardgames ~ insert, upgrade, sleeves, organizer, painted
  Inserts: insert | Painted components: painted | Metal coins: coins | Sleeved cards: sleeves | Playmats: playmat
- Gaming tables @boardgames @DnD ~ gaming table, table, custom table
  Custom tables: custom | Vaulted tables: vault | Toppers: topper | DIY tables: diy | Coffee table conversions: coffee table
## Wargames & Historical @wargaming @Warhammer
- Historical wargames @wargaming ~ historical, napoleonic, ww2, ancient, bolt action
  Napoleonics: napoleonic | WW2: ww2, bolt action | Ancients: ancient, roman | Medieval: medieval | Sci-fi skirmish: skirmish
- Army showcases @Warhammer @wargaming ~ army, force, collection, display
  Painted armies: army | Display boards: display | Army shelves: shelf | Battle reports: battle report | Army progress: progress
- Kill Team & skirmish @killteam @wargaming ~ kill team, skirmish, necromunda, mordheim
  Kill Team: kill team | Necromunda: necromunda | Mordheim: mordheim | Gangs: gang | Warbands: warband
- Tournaments & events @Warhammer @wargaming ~ tournament, event, gt, rtt
  Tournament tables: tournament | Best painted: best painted | Events: event | Champions: won | Club nights: club

# LEGO {lego} > miniatures-tabletop, collectibles-toys, architecture-cities, gaming @lego @legodeal @LegoStarWars
## Sets & Builds @lego
- Big sets @!lego ~ set, ucs, completed, built
  UCS sets: ucs | Icons sets: icons | Ideas sets: ideas | Modular buildings: modular | Big builds: biggest, huge
- Star Wars LEGO @LegoStarWars @lego ~ star wars, falcon, x-wing, star destroyer, mandalorian
  Millennium Falcon: falcon | Star Destroyers: star destroyer | X-wings: x-wing | Helmets: helmet | Dioramas: diorama
- Technic @lego @legotechnic ~ technic, gearbox, supercar, crane
  Supercars: supercar, ferrari, lamborghini | Cranes: crane | Motorized: motorized, motor | Trucks: truck | Gearboxes: gearbox
- Botanicals & adult sets @lego ~ botanical, flowers, bouquet, bonsai, art
  Flower bouquets: bouquet | Bonsai: bonsai | Orchids: orchid | Art sets: art | Wreaths: wreath
## MOCs @lego @legomoc
- MOCs @legomoc @lego ~ moc, my own creation, custom build
  Castles: castle | Space MOCs: space | City MOCs: city | Mechs: mech | Vehicles: vehicle
- Micro builds @lego @legomoc ~ micro, microscale, mini build, small
  Microscale cities: city | Mini ships: ship | Tiny scenes: scene | Micro mechs: mech | Nano builds: nano
- Mosaics & art @lego ~ mosaic, art, portrait, pixel
  Portraits: portrait | Pixel art: pixel | Landscapes: landscape | Logos: logo | Huge mosaics: huge
- Dioramas @lego @legomoc ~ diorama, scene, display
  Battle scenes: battle | Village scenes: village | Snow scenes: snow | Underwater: underwater | Display cases: display case
## LEGO City & Trains @lego @LegoTrains
- LEGO cities @lego ~ lego city, city layout, town, layout
  City layouts: layout | Street views: street | Modular streets: modular | Night lighting: lights | Expansion progress: progress
- LEGO trains @LegoTrains @lego ~ train, railway, station, track
  Steam engines: steam | Stations: station | Bridges: bridge | Freight trains: freight | Powered trains: powered
- Castle & pirates @lego ~ castle, pirate, knights, medieval
  Castles: castle | Pirate ships: pirate ship, pirate | Knights: knight | Villages: village | Forestmen: forest
- Space & classic space @lego ~ space, classic space, spaceship, galaxy explorer
  Classic Space: classic space | Spaceships: spaceship | Moon bases: base | Galaxy Explorer: galaxy explorer | Blacktron: blacktron
## Minifigures & Collections @lego @minifigs
- Minifigures @minifigs @lego ~ minifig, minifigure, minifigures, figs
  Collectible series: series, cmf | Custom figs: custom | Army builders: army | Rare figs: rare | Display frames: frame
- LEGO rooms @lego ~ lego room, display, shelves, collection
  Display shelves: shelf, shelves | Lego rooms: room | Storage systems: storage | Wall displays: wall | Collection tours: collection
- Sorting & storage @lego ~ sorting, storage, bulk, drawers
  Sorting systems: sorting | Drawer walls: drawers | Bulk hauls: bulk | Thrift lots: thrift | Part tubs: tubs
- Vintage LEGO @lego @legodeal ~ vintage, 80s, 90s, childhood, old set
  Childhood sets: childhood | 80s sets: 80s | 90s sets: 90s | Boxed vintage: box | Restored sets: restored
## LEGO Life @lego @legodeal
- Building with kids @lego ~ son, daughter, kid, kids, family
  Kid creations: creation | Family builds: family | First sets: first set | Birthday builds: birthday | Kid MOCs: made
- Deals & hauls @legodeal @lego ~ haul, deal, sale, clearance
  Clearance finds: clearance | Hauls: haul | Store pickups: store | Bulk deals: bulk | Birthday hauls: birthday
- Stores & events @lego ~ lego store, brickfair, convention, legoland
  LEGO Stores: store | Legoland: legoland | Conventions: convention, brickfair | Displays: display | House of LEGO: billund
- LEGO photography @lego @legophotography ~ photo, photography, toy photography, scene
  Outdoor shots: outdoor | Forced perspective: perspective | Minifig stories: story | Snow shots: snow | Lighting setups: lighting

# Pottery & Ceramics {pottery} > painting, coffee, interior-design, houseplants @Pottery @Ceramics
## Wheel Throwing @Pottery @Ceramics
- Wheel throwing @!Pottery ~ wheel, thrown, throwing, centering
  Centering: centering | First pots: first | Tall pieces: tall | Big bowls: bowl, big | Throwing off the hump: hump
- Mugs @Pottery @Ceramics ~ mug, mugs, cup, handle
  Handles: handle | Mug sets: set | Carved mugs: carved | Funny mugs: funny, face | Glazed mugs: glaze
- Vases & vessels @Pottery @Ceramics ~ vase, vessel, bottle, jar
  Vases: vase | Moon jars: moon jar | Lidded jars: lidded, jar | Bottles: bottle | Large vessels: large
- Bowls & plates @Pottery @Ceramics ~ bowl, plate, dinnerware, set
  Dinnerware sets: dinnerware, set | Ramen bowls: ramen | Plates: plate | Nesting bowls: nesting | Serving bowls: serving
## Glazes & Firing @Pottery @Ceramics
- Glaze results @Pottery @Ceramics ~ glaze, glazed, glazes, glaze combo
  Glaze combos: combo | Crystalline: crystalline | Celadons: celadon | Drip glazes: drip | Glaze tests: test
- Kiln openings @Pottery @Ceramics ~ kiln, firing, kiln opening, fired
  Kiln openings: opening | Wood firing: wood fire, wood fired | Raku: raku | Soda & salt: soda, salt | Kiln disasters: disaster, exploded
- Surface decoration @Pottery @Ceramics ~ carved, sgraffito, underglaze, slip
  Sgraffito: sgraffito | Carving: carved | Underglaze painting: underglaze | Slip trailing: slip | Mishima: mishima
- Glaze fails @Pottery @Ceramics ~ fail, crawling, pinholes, crazing, ruined
  Crawling: crawling | Pinholes: pinhole | Crazing: crazing | Runs: run, ran | Ugly but cute: ugly
## Handbuilding @Pottery @Ceramics
- Handbuilt pieces @Pottery @Ceramics ~ handbuilt, hand built, slab, coil, pinch
  Slab builds: slab | Coil pots: coil | Pinch pots: pinch | Planters: planter | Trays: tray
- Sculptures @Ceramics @sculpture ~ sculpture, figure, sculpted, bust
  Animals: animal | Figures: figure | Busts: bust | Abstract forms: abstract | Monsters: monster
- Tiles & wall art @Ceramics @Pottery ~ tile, tiles, wall art, relief
  Relief tiles: relief | Painted tiles: painted | Wall pieces: wall | Mosaic tiles: mosaic | House numbers: house number
- Cute ceramics @Pottery @Ceramics ~ cute, frog, cat, mushroom, tiny
  Frogs: frog | Cats: cat | Mushrooms: mushroom | Tiny pots: tiny | Trinket dishes: trinket
## Studio Life @Pottery @Ceramics
- Home studios @Pottery @Ceramics ~ studio, home studio, garage studio, setup
  Garage studios: garage | Small studios: small | Shelving: shelf, shelves | Wheel setups: wheel | Kiln corners: kiln
- Shelves of work @Pottery @Ceramics ~ shelf, bisque, greenware, batch
  Greenware: greenware | Bisque shelves: bisque | Batches: batch | Drying racks: drying | Market prep: market
- Markets & selling @Pottery @Ceramics ~ market, sold, shop, craft fair, booth
  Craft fair booths: booth | Sold out: sold out | Shop updates: shop | Wholesale: wholesale | Commissions: commission
- Progress & journeys @Pottery @Ceramics ~ progress, first, year, then and now
  First year: first year | Then & now: then and now | Class pieces: class | Practice batches: practice | Improvement: improvement
## Clay Crafts @Polymerclay @Pottery
- Polymer clay @!Polymerclay ~ polymer clay, fimo, sculpey
  Earrings: earring | Charms: charm | Figurines: figurine | Canes: cane | Miniature food: food
- Air-dry clay @Pottery @crafts ~ air dry clay, air-dry clay, das
  Trinket dishes: dish | Planters: planter | Decor: decor | Painted pieces: painted | Kids crafts: kids
- Clay miniatures @Polymerclay @miniatures ~ miniature, mini, tiny, food
  Tiny food: food | Dollhouse pieces: dollhouse | Tiny animals: animal | Charms: charm | Terrarium pieces: terrarium
- Functional clay @Pottery @Ceramics ~ planter, soap dish, spoon rest, incense
  Planters: planter | Soap dishes: soap | Spoon rests: spoon rest | Incense holders: incense | Ring dishes: ring
`;
export default source;
