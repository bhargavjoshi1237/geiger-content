// Culture & collecting topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Anime & Manga {anime-manga} > gaming, cosplay, drawing, collectibles-toys, digital-art @anime @manga @AnimeFigures
## Figures @AnimeFigures @figurecollecting
- Scale figures @!AnimeFigures ~ figure, scale, 1/7, 1/4, figure haul
  1/7 scale: 1/7 | 1/4 scale: 1/4 | Hauls: haul | Unboxings: unboxing, arrived | Bootleg checks: bootleg
- Figure displays @AnimeFigures @figurecollecting ~ display, shelf, collection, detolf
  Detolf cases: detolf | Glass cabinets: cabinet | Shelf tours: shelf | Lighting: led, light | Full rooms: room
- Nendoroids & prize figures @AnimeFigures @nendoroid ~ nendoroid, prize figure, figma, pop up parade
  Nendoroids: nendoroid | Figma: figma | Pop Up Parade: pop up parade | Prize figures: prize | Dioramas: diorama
- Figure photography @AnimeFigures ~ photo, photography, outdoor, shoot
  Outdoor shots: outdoor | Night shots: night | Scene setups: scene | Macro shots: macro | Travel shots: travel
## Manga @manga @MangaCollectors
- Manga collections @!MangaCollectors ~ collection, shelf, manga collection, volumes
  Shelf tours: shelf | Box sets: box set | Complete series: complete | Japanese editions: japanese | New volumes: new
- Manga panels @manga ~ panel, chapter, page, art
  Art panels: art | Iconic pages: page | Fight scenes: fight | Emotional panels: emotional | Color spreads: color
- Manga hauls @MangaCollectors @manga ~ haul, bought, pickup
  Bookstore hauls: bookstore | Kinokuniya: kinokuniya | Used finds: used | Japan hauls: japan | Gift hauls: gift
- Manga reading nooks @MangaCollectors @CozyPlaces ~ reading, nook, corner, room
  Reading corners: corner | Book walls: wall | Cozy nooks: cozy | Room tours: room | Small shelves: small
## Anime Art @anime @AnimeART @fanart
- Anime fan art @AnimeART @anime ~ fan art, fanart, drew, drawing
  Character portraits: portrait | Ghibli art: ghibli | Chibi art: chibi | Painted fan art: painted | Sketch art: sketch
- Anime scenery @anime @AnimeART ~ scenery, background, landscape, ghibli
  Ghibli scenery: ghibli | Makoto Shinkai: shinkai | Night skies: night | Cityscapes: city | Countryside: countryside
- Anime wallpapers @Animewallpaper @anime ~ wallpaper, 4k, phone wallpaper
  Phone wallpapers: phone | Desktop wallpapers: desktop, 4k | Minimal wallpapers: minimal | Character wallpapers: character | Dark wallpapers: dark
- Anime crafts @anime @crafts ~ crochet, made, handmade, cake, embroidery
  Anime crochet: crochet | Anime cakes: cake | Embroidery: embroidery | Perler beads: perler | Woodwork: wood
## Anime Life @anime @Animesuggest
- Anime rooms @anime @AnimeFigures ~ room, setup, otaku room, wall
  Otaku rooms: room | Poster walls: poster, wall | Itasha setups: itasha | Desk setups: desk | Bedroom shrines: shrine
- Japan trips @anime @JapanTravel ~ japan, akihabara, tokyo, pilgrimage, ikebukuro
  Akihabara: akihabara | Anime pilgrimages: pilgrimage, real life location | Ghibli Museum: ghibli museum | Pokemon Center: pokemon center | Cafes: cafe
- Merch & goods @anime @AnimeFigures ~ merch, plush, keychain, acrylic stand, poster
  Plushies: plush | Acrylic stands: acrylic stand | Keychains: keychain | Posters: poster | Gacha: gacha
- Itasha & anime cars @itasha @anime ~ itasha, wrap, anime car
  Itasha cars: car | Itasha bikes: bike | Wraps: wrap | Meets: meet | Interiors: interior
## Seasonal Anime @anime @manga
- Current season @anime ~ episode, season, new season, finale
  Finales: finale | Episode moments: episode | Season reveals: season | Key visuals: key visual | Trailers: trailer
- Classic anime @anime ~ classic, 90s, retro, cowboy bebop, evangelion
  90s anime: 90s | Cowboy Bebop: cowboy bebop | Evangelion: evangelion | Sailor Moon: sailor moon | Retro screenshots: retro
- Anime films @anime ~ movie, film, ghibli, your name
  Ghibli films: ghibli | Shinkai films: your name, suzume | Theater visits: theater | Posters: poster | Blu-rays: blu-ray
- Studios & production @anime ~ studio, sakuga, key animation, production
  Key frames: key frame | Sakuga: sakuga | Storyboards: storyboard | Studio visits: studio | Cels: cel

# Music Gear {music-gear} > electronics-diy, desk-setups, collectibles-toys @Guitar @guitarpedals @synthesizers
## Guitars @Guitar @guitars @Bass
- NGD @!Guitar ~ ngd, new guitar day, new guitar
  Stratocasters: strat, stratocaster | Telecasters: tele, telecaster | Les Pauls: les paul | Acoustic NGDs: acoustic | First guitars: first
- Acoustic guitars @AcousticGuitar @Guitar ~ acoustic, martin, taylor, dreadnought
  Martins: martin | Taylors: taylor | Gibsons: gibson | Parlor guitars: parlor | Classical guitars: classical
- Bass guitars @!BassGuitar ~ bass, nbd, new bass day, jazz bass, p bass
  P basses: p bass, precision | Jazz basses: jazz bass | Short scale: short scale | 5-strings: 5 string | Fretless: fretless
- Guitar builds & mods @Luthier @Guitar ~ build, built, luthier, refret, mod
  Kit builds: kit | Partscasters: partscaster | Refinishes: refinish | Luthier builds: luthier | Relics: relic
## Pedals & Amps @guitarpedals @GuitarAmps
- Pedalboards @!guitarpedals ~ pedalboard, board, pedals
  Big boards: big | Mini boards: mini | Board wiring: wiring | Ambient boards: ambient | Board updates: update
- Pedals @guitarpedals ~ pedal, fuzz, overdrive, delay, reverb
  Fuzz: fuzz | Overdrives: overdrive | Delays: delay | Reverbs: reverb | Boutique pedals: boutique
- Amps @GuitarAmps @Guitar ~ amp, amplifier, tube amp, head, combo
  Tube amps: tube | Vintage amps: vintage | Amp stacks: stack, head | Combos: combo | Amp repairs: repair
- Gear rooms @Guitar @guitarpedals ~ setup, rig, gear, room, wall
  Guitar walls: wall | Studio rigs: studio | Live rigs: live | Small setups: small | Collections: collection
## Synths & Production @synthesizers @musicproduction @WeAreTheMusicMakers
- Synth setups @!synthesizers ~ synth, setup, studio, synths
  Desktop setups: desktop | Big studios: studio | Vintage synths: vintage | Portable setups: portable | New synth days: new
- Eurorack @modular @synthesizers ~ eurorack, modular, case, patch
  Patch shots: patch | Cases: case | Small racks: small | Big walls: wall | Module hauls: module
- Home studios @musicproduction @homestudios ~ home studio, studio, desk, monitors
  Bedroom studios: bedroom | Acoustic treatment: treatment, panels | Studio desks: desk | Small studios: small | Vocal booths: booth
- Drum machines & grooveboxes @synthesizers @drummachines ~ drum machine, groovebox, mpc, sp-404
  MPCs: mpc | SP-404: sp-404, sp404 | 808s & 909s: 808, 909 | Elektron: elektron | OP-1: op-1, op1
## Drums & Orchestral @drums @Violin @piano
- Drum kits @!drums ~ drum, kit, drums, cymbal, snare
  Kits: kit | Snares: snare | Cymbals: cymbal | Practice rooms: room | Vintage drums: vintage
- Pianos & keys @piano @Pianists ~ piano, grand piano, keyboard, upright
  Grand pianos: grand | Uprights: upright | Digital pianos: digital | Restorations: restored | Piano rooms: room
- Strings & violins @Violin @Cello ~ violin, cello, viola, double bass
  Violins: violin | Cellos: cello | Violas: viola | Double basses: double bass | Luthier work: luthier
- Brass & woodwinds @Saxophone @trumpet ~ saxophone, trumpet, clarinet, flute, trombone
  Saxophones: saxophone, sax | Trumpets: trumpet | Clarinets: clarinet | Flutes: flute | Trombones: trombone
## Vinyl & Audio @vinyl @audiophile @headphones
- Vinyl collections @!vinyl ~ vinyl, record, records, collection, lp
  Record walls: wall | Hauls: haul | Colored vinyl: colored vinyl, splatter | Now spinning: now spinning, spinning | Crate digging: crate digging, thrift
- Turntable setups @vinyl @audiophile ~ turntable, setup, stereo, receiver
  Turntables: turntable | Vintage receivers: receiver | Speaker setups: speaker | Console stereos: console | Listening rooms: listening room
- Hi-fi rooms @audiophile ~ hifi, hi-fi, speakers, listening room, amp
  Big speakers: speaker | Tube amps: tube | Listening rooms: listening room | Vintage hi-fi: vintage | Budget hi-fi: budget
- Headphones @headphones @audiophile ~ headphones, iem, headphone, dac
  Collections: collection | Planars: planar | IEMs: iem | Desk setups: desk | Stands: stand

# Collectibles & Toys {collectibles-toys} > lego, anime-manga, retro-gaming, miniatures-tabletop, sneakers @ActionFigures @funkopop @hotwheels
## Action Figures @ActionFigures @transformers
- Figure collections @!ActionFigures ~ collection, figures, shelf, display
  Shelf tours: shelf | Display cases: display | Hauls: haul | Customs: custom | Toy photography: photography, photo
- Marvel & DC figures @ActionFigures @marvellegends ~ marvel legends, marvel, dc, batman, spider-man
  Marvel Legends: marvel legends | Spider-Man: spider-man, spiderman | Batman: batman | X-Men: x-men | McFarlane: mcfarlane
- Star Wars figures @ActionFigures @StarWarsCollecting ~ star wars, black series, vintage collection, mandalorian
  Black Series: black series | Vintage Collection: vintage collection | Vintage Kenner: kenner | Helmets: helmet | Dioramas: diorama
- Transformers @!transformers ~ transformers, transformer, optimus, masterpiece
  Masterpiece: masterpiece | G1 vintage: g1 | Studio Series: studio series | Optimus Prime: optimus | Customs: custom
## Die-cast & Models @hotwheels @Diecast @modelmakers
- Hot Wheels @!hotwheels ~ hot wheels, hotwheels, treasure hunt, sth
  Treasure hunts: treasure hunt, sth | Hunts in store: found, peg | Collections: collection | Customs: custom | Car Culture: car culture
- Die-cast models @Diecast @hotwheels ~ diecast, die-cast, 1:18, 1:64, model car
  1:18 models: 1:18 | 1:64 models: 1:64 | Dioramas: diorama | Collections: collection | Rare castings: rare
- Model kits @modelmakers @Gunpla ~ model kit, scale model, built, kit
  Car kits: car | Tank kits: tank | Ship kits: ship | Weathering: weathering | Dioramas: diorama
- Gunpla @!Gunpla ~ gunpla, gundam, hg, mg, pg
  Master Grades: mg, master grade | Perfect Grades: pg, perfect grade | Custom paint: custom, painted | Weathered builds: weathered | Backlogs: backlog
## Trading Cards @PokemonTCG @baseballcards @mtg
- Pokemon cards @!PokemonTCG ~ pokemon, pack, pull, booster
  Big pulls: pull | Graded cards: psa, graded | Binders: binder | Vintage cards: vintage, base set | Sealed: sealed, etb
- Sports cards @baseballcards @basketballcards @footballcards ~ card, rookie, auto, patch, psa
  Rookies: rookie | Autos: auto | Patches: patch | Graded slabs: psa, graded | Breaks: break
- Magic: The Gathering @mtg @magicTCG ~ mtg, magic, commander, deck
  Commander decks: commander | Pulls: pull | Alters: alter | Collections: collection | Playmats: playmat
- One Piece & others @OnePieceTCG @yugioh ~ one piece, yugioh, lorcana, card game
  One Piece TCG: one piece | Yu-Gi-Oh: yugioh, yu-gi-oh | Lorcana: lorcana | Binders: binder | Pulls: pull
## Designer Toys & Plush @designertoys @plushies @Funko
- Designer toys @designertoys ~ designer toy, vinyl toy, art toy, kaws, bearbrick
  KAWS: kaws | Bearbricks: bearbrick, be@rbrick | Pop Mart: pop mart, labubu | Blind boxes: blind box | Customs: custom
- Plushies @!plushies ~ plush, plushie, plushies, squishmallow
  Plush piles: pile | Squishmallows: squishmallow | Jellycats: jellycat | Handmade plush: handmade | Plush beds: bed
- Funko Pops @Funko @funkopop ~ funko, pop, pops, funko pop
  Pop walls: wall | Exclusives: exclusive | Grails: grail | Customs: custom | Hauls: haul
- Retro toys @nostalgia @ActionFigures ~ vintage, 80s, 90s, childhood, he-man
  80s toys: 80s | 90s toys: 90s | He-Man: he-man | Tamagotchi: tamagotchi | Childhood toys: childhood
## Coins, Stamps & Oddities @coins @stamps @CoinCollecting
- Coins @!coins @CoinCollecting ~ coin, coins, silver, gold, mint
  Silver stacks: silver, stack | Ancient coins: ancient, roman | Error coins: error | Found coins: found | Gold coins: gold
- Stamps @stamps ~ stamp, stamps, philately, album
  Albums: album | Rare stamps: rare | Envelopes: envelope, cover | Themed stamps: themed | Vintage stamps: vintage
- Oddities & curiosities @oddities @mildlyinteresting ~ oddity, curiosity, skull, taxidermy, specimen
  Skulls: skull | Taxidermy: taxidermy | Specimens: specimen | Antique medical: medical | Cabinets: cabinet
- Antiques @Antiques @ThriftStoreHauls ~ antique, antiques, estate sale, heirloom
  Estate sales: estate sale | Furniture: furniture | Glassware: glass | Heirlooms: heirloom | Mystery objects: what is this

# Architecture & Cities {architecture-cities} > travel, interior-design, photography, home-improvement @architecture @ArchitecturePorn @CityPorn
## Modern Architecture @ArchitecturePorn @architecture
- Modern houses @ArchitecturePorn @architecture ~ house, modern house, villa, residence
  Concrete houses: concrete | Glass houses: glass | Cliff houses: cliff | Forest houses: forest | Courtyards: courtyard
- Skyscrapers @skyscrapers @CityPorn ~ skyscraper, tower, highrise, supertall
  Supertalls: supertall | Under construction: construction | Glass towers: glass | Art deco towers: art deco | Rooftops: rooftop
- Brutalism @brutalism @architecture ~ brutalist, brutalism, concrete
  Housing blocks: housing | Civic buildings: civic, library | Soviet modernism: soviet | Campuses: university, campus | Monuments: monument
- Interiors & spaces @ArchitecturePorn @InteriorDesign ~ interior, atrium, staircase, library
  Staircases: staircase, stairs | Atriums: atrium | Libraries: library | Stations: station | Museums: museum
## Historic Architecture @ArchitecturePorn @architecture @castles
- Castles @!castles ~ castle, fortress, palace
  Medieval castles: medieval | Palaces: palace | Ruined castles: ruin | Fairytale castles: fairytale | Fortresses: fortress
- Churches & cathedrals @ArchitecturePorn @architecture ~ cathedral, church, chapel, basilica
  Gothic cathedrals: gothic | Ceilings: ceiling | Stained glass: stained glass | Village churches: village | Orthodox churches: orthodox
- Old towns @CityPorn @travel ~ old town, medieval town, historic center, alley
  Medieval streets: medieval | Alleys: alley | Squares: square | Colorful houses: colorful | Half-timbered: half timbered
- Ancient & ruins @ArchitecturePorn @history ~ ruins, ancient, temple, roman
  Roman ruins: roman | Greek temples: greek | Mayan sites: mayan | Egyptian temples: egypt | Angkor: angkor
## Cityscapes @CityPorn @skylineporn
- Skylines @CityPorn @skylineporn ~ skyline, city, cityscape, panorama
  Night skylines: night | Fog skylines: fog | Sunset skylines: sunset | Drone skylines: drone | Winter cities: snow, winter
- Streets & neighborhoods @CityPorn @UrbanHell ~ street, neighborhood, block, avenue
  Tree-lined streets: tree | Rowhouses: rowhouse, townhouse | Market streets: market | Rainy streets: rain | Empty streets: empty
- Transit & infrastructure @transit @CityPorn ~ metro, subway, train station, bridge, tram
  Metro stations: metro, subway | Bridges: bridge | Trams: tram | Train stations: train station | Highways: highway, interchange
- Urban design debates @urbanplanning @fuckcars ~ urban planning, walkable, zoning, bike lane
  Walkable streets: walkable | Bike lanes: bike lane | Parking lots: parking lot, parking | Plazas: plaza | Before & after: before, after
## Small & Unusual Buildings @architecture @AbandonedPorn
- Tiny & odd buildings @architecture @mildlyinteresting ~ tiny, narrow, smallest, weird building
  Narrow houses: narrow | Tiny buildings: tiny | Odd shapes: weird, odd | Treehouses: treehouse | Floating homes: floating
- Abandoned buildings @!AbandonedPorn @urbanexploration ~ abandoned, derelict, decay
  Mansions: mansion | Factories: factory | Theaters: theater | Churches: church | Malls: mall
- Vernacular homes @architecture @VernacularArch ~ traditional house, vernacular, cottage, farmhouse
  Thatched cottages: thatched | Japanese houses: japanese | Stone houses: stone | Adobe: adobe | Log houses: log
- Lighthouses & towers @architecture @lighthouses ~ lighthouse, tower, water tower, windmill
  Lighthouses: lighthouse | Windmills: windmill | Water towers: water tower | Fire lookouts: lookout | Bell towers: bell tower
## Architecture Craft @architecture @Architects
- Sketches & drawings @architecture @Architects ~ sketch, drawing, section, plan
  Hand sketches: sketch | Sections: section | Floor plans: plan | Elevations: elevation | Watercolor renders: watercolor
- Models @architecture @Architects ~ model, physical model, maquette, scale model
  Physical models: model | Massing models: massing | Wood models: wood | Paper models: paper | Site models: site
- Construction progress @architecture @Construction ~ construction, progress, site, framing
  Framing: framing | Concrete pours: pour, concrete | Cranes: crane | Steel frames: steel | Topping out: topping out
- Student work @architecture @Architects ~ student, studio project, thesis, portfolio
  Thesis projects: thesis | Studio projects: studio | Portfolios: portfolio | Competition entries: competition | Renders: render
`;
export default source;
