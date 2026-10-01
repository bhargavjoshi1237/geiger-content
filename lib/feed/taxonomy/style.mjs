// Fashion & style topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Fashion & Streetwear {fashion} > sneakers, watches, makeup-nails, tattoos @streetwear @malefashion @femalefashionadvice
## Outfits @OUTFITS @streetwear @malefashion
- Daily fits @OUTFITS @streetwear ~ fit, outfit, ootd, wdywt
  WDYWT: wdywt | OOTD: ootd | Casual fits: casual | Work fits: work, office | Weekend fits: weekend
- Streetwear @!streetwear ~ streetwear, fit, oversized, hoodie
  Oversized fits: oversized | Hoodies: hoodie | Cargo fits: cargo | Graphic tees: graphic, tee | Layering: layer, layering
- Menswear classics @malefashion @malefashionadvice ~ menswear, suit, blazer, chinos, workwear
  Suits: suit | Workwear: workwear | Smart casual: smart casual | Denim: denim, jeans | Knitwear: knit, sweater
- Womenswear @femalefashionadvice @OUTFITS ~ dress, skirt, outfit, blazer, style
  Dresses: dress | Skirts: skirt | Minimal styles: minimal | Vintage fits: vintage | Color pops: color
## Style Aesthetics @streetwear @Japanesestreetwear @rawdenim
- Raw denim @!rawdenim ~ raw denim, selvedge, fades, jeans
  Fades: fade, fades | Selvedge: selvedge | Wear progress: progress, months | Japanese denim: japanese | Repairs: repair, darning
- Japanese fashion @Japanesestreetwear @malefashion ~ japanese, harajuku, avant garde, layering
  Harajuku: harajuku | Avant-garde: avant garde | Wide pants: wide | Kapital: kapital | Yohji: yohji
- Techwear @techwearclothing @streetwear ~ techwear, acronym, gorpcore, shell
  Techwear: techwear | Gorpcore: gorpcore | Shells: shell, arcteryx | Utility vests: vest | All-black: black
- Vintage & thrift @ThriftStoreHauls @VintageFashion ~ vintage, thrift, thrifted, 90s
  Thrift hauls: haul | Vintage tees: tee, band tee | 90s fits: 90s | Vintage jackets: jacket | Grandpa core: grandpa
## Accessories @malefashion @handbags @Jewelry
- Bags @handbags @malefashion ~ bag, tote, backpack, crossbody
  Totes: tote | Crossbodies: crossbody | Leather bags: leather | Designer bags: designer | Backpacks: backpack
- Jewelry @Jewelry @malefashion ~ ring, necklace, chain, bracelet, earrings
  Rings: ring | Chains: chain | Bracelets: bracelet | Earrings: earring | Stacks: stack
- Hats & eyewear @malefashion @streetwear ~ hat, cap, beanie, sunglasses, glasses
  Caps: cap | Beanies: beanie | Bucket hats: bucket hat | Sunglasses: sunglasses | Glasses: glasses
- Leather goods @Leathercraft @BuyItForLife ~ wallet, belt, leather, patina
  Wallets: wallet | Belts: belt | Patina: patina | Handmade leather: handmade | Leathercraft: leathercraft
## Seasonal Wardrobes @malefashionadvice @femalefashionadvice
- Coats & jackets @malefashion @femalefashionadvice ~ coat, jacket, overcoat, parka, bomber
  Overcoats: overcoat | Leather jackets: leather jacket | Parkas: parka | Bombers: bomber | Trench coats: trench
- Summer style @malefashion @femalefashionadvice ~ summer, linen, shorts, sandals
  Linen: linen | Shorts: shorts | Sandals: sandals | Resort wear: resort | Beach fits: beach
- Wardrobes & capsules @capsulewardrobe @femalefashionadvice ~ capsule, wardrobe, closet, minimal wardrobe
  Capsule wardrobes: capsule | Closets: closet | Closet tours: tour | Organized closets: organized | Minimal wardrobes: minimal
- Formal & events @malefashion @femalefashionadvice ~ wedding, formal, tux, gala, event
  Wedding guests: wedding guest | Tuxedos: tux, tuxedo | Black tie: black tie | Galas: gala | Prom: prom
## Made & Modified @sewing @streetwear @upcycling
- Upcycled clothing @upcycling @sewing ~ upcycled, upcycle, reworked, patchwork
  Patchwork: patchwork | Reworked jackets: jacket | Visible mending: mending, visible mending | Bleach art: bleach | Dyed pieces: dyed
- Custom pieces @streetwear @sewing ~ custom, handmade, made, designed
  Custom jackets: jacket | Painted pieces: painted | Embroidered: embroidered | Screen prints: screen print | Brand drops: brand, drop
- Clothing brands @streetwear @smallbusiness ~ brand, my brand, collection, drop
  First drops: first drop | Lookbooks: lookbook | Samples: sample | Tags & labels: tag, label | Mockups: mockup
- Thrift flips @ThriftStoreHauls @upcycling ~ thrift flip, flip, before, after
  Thrift flips: flip | Before & after: before, after | Tailoring: tailored | Dye jobs: dye | Resizing: resize

# Sneakers {sneakers} > fashion, collectibles-toys, running @Sneakers @SneakerMarket @Repsneakers
## Collections @Sneakers
- Sneaker rotations @!Sneakers ~ rotation, collection, pickup, wdywt
  Rotations: rotation | Pickups: pickup | Collections: collection | Walls: wall | Wear tests: on feet, on foot
- Jordans @Jordans @Sneakers ~ jordan, jordans, aj1, jordan 4, retro
  Jordan 1s: jordan 1, aj1 | Jordan 4s: jordan 4, aj4 | Jordan 11s: jordan 11 | Jordan 3s: jordan 3 | OG colorways: og
- Nike & Dunks @Sneakers @Nike ~ dunk, dunks, air max, air force 1, af1
  Dunks: dunk | Air Max: air max | Air Force 1s: af1, air force | SB Dunks: sb | Nike Run: pegasus, vomero
- New Balance & runners @Newbalance @Sneakers ~ new balance, nb, 990, 2002r, asics
  990s: 990 | 2002Rs: 2002r | 550s: 550 | ASICS: asics, gel | Salomon: salomon
## Customs & Care @Sneakers @customsneakers
- Custom sneakers @!customsneakers ~ custom, painted, customs, angelus
  Painted customs: painted | Anime customs: anime | Dyed customs: dyed | Embroidery: embroidery | Swaps: swap
- Sneaker cleaning @Sneakers @sneakercleaning ~ clean, cleaned, cleaning, restore
  Deep cleans: deep clean | Restorations: restoration, restored | Before & after: before, after | Sole swaps: sole swap | Yellowed soles: yellow
- Beaters & worn pairs @Sneakers ~ beaters, worn, beat up, years, miles
  Beaters: beaters | Years of wear: years | Creases: crease | Heel drag: heel | Retired pairs: retired
- Storage & displays @Sneakers ~ storage, display, wall, boxes, shelf
  Sneaker walls: wall | Drop-front boxes: boxes | Display cases: display | Closet setups: closet | Rooms: room
## Releases & Hype @Sneakers @SneakerMarket
- Release days @Sneakers ~ release, drop, snkrs, raffle, w
  SNKRS wins: snkrs, w | Raffle wins: raffle | Store pickups: store | Campouts: line, campout | Unboxings: unboxing
- Collabs @Sneakers ~ collab, travis scott, off-white, sacai, union
  Travis Scott: travis scott | Off-White: off-white, off white | Sacai: sacai | Union: union | A Ma Maniere: a ma maniere
- Grails @Sneakers ~ grail, grails, finally, rare, og
  Finally got: finally | Rare pairs: rare | Childhood grails: childhood | Samples: sample | PEs: pe, player exclusive
- Resale & legit checks @SneakerMarket @Sneakers ~ legit, legit check, lc, resale, stockx
  Legit checks: legit check, lc | Resale finds: resale | Fakes caught: fake | Deals: deal | Trades: trade
## Performance Shoes @RunningShoeGeeks @BBallShoes @Sneakers
- Basketball shoes @BBallShoes @Sneakers ~ basketball, kobe, lebron, hoops
  Kobes: kobe | LeBrons: lebron | Sabrinas: sabrina | Court tests: court | Signature lines: signature
- Running shoes @RunningShoeGeeks @Sneakers ~ running, super shoe, vaporfly, alphafly
  Super shoes: super shoe, vaporfly, alphafly | Daily trainers: daily trainer | Trail shoes: trail | Retired pairs: retired | Rotations: rotation
- Skate shoes @Sneakers @skateboarding ~ skate, vans, sb, skate shoe
  Vans: vans | SB Dunks: sb | Worn skate shoes: worn | Classic skate: classic | Skate collabs: collab
- Boots @goodyearwelt @BuyItForLife ~ boots, red wing, white's, chelsea, goodyear
  Red Wings: red wing | Chelsea boots: chelsea | Work boots: work boots | Patina: patina | Resoles: resole
## Sneaker Culture @Sneakers
- Sneaker art @Sneakers @customsneakers ~ art, drawing, painting, sculpture
  Sneaker drawings: drawing | Paintings: painting | Sculptures: sculpture | Cakes: cake | Lego sneakers: lego
- Vintage sneakers @Sneakers ~ vintage, 80s, 90s, og, deadstock
  Deadstock: deadstock, ds | 90s pairs: 90s | 80s pairs: 80s | Vintage boxes: box | Thrift finds: thrift
- Sneaker stores @Sneakers ~ store, shop, boutique, flagship
  Flagship stores: flagship | Boutiques: boutique | Store walls: wall | Outlet finds: outlet | Travel shopping: travel
- Kids & family pairs @Sneakers ~ son, daughter, kid, matching, family
  Matching pairs: matching | Baby sneakers: baby | Kids collections: kid | Gifts: gift | Dad & son: dad

# Makeup & Nails {makeup-nails} > fashion, cosplay, tattoos @MakeupAddiction @RedditLaqueristas @Nails
## Makeup Looks @MakeupAddiction @makeuplounge
- Everyday makeup @!MakeupAddiction ~ makeup, look, everyday, natural, motd
  Natural looks: natural | No-makeup makeup: no makeup | Work makeup: work | Glowy skin: glow, glowy | MOTD: motd, fotd
- Eye looks @MakeupAddiction @makeuplounge ~ eyeshadow, eyeliner, eye look, cut crease, graphic liner
  Graphic liner: graphic liner, graphic | Cut creases: cut crease | Smoky eyes: smoky | Colorful eyes: colorful | Glitter: glitter
- Bold & editorial @MakeupAddiction @makeupartists ~ editorial, bold, avant garde, creative
  Editorial looks: editorial | Avant-garde: avant garde | Face gems: gems | Neon looks: neon | Drag looks: drag
- SFX & Halloween makeup @SFXmakeup @MakeupAddiction ~ sfx, halloween, special effects, prosthetic
  Zombies: zombie | Wounds: wound | Skulls: skull | Creatures: creature | Character makeup: character
## Nails @RedditLaqueristas @Nails @NailArt
- Nail art @!NailArt @RedditLaqueristas ~ nail art, nails, design, manicure
  Floral nails: floral, flower | French tips: french | Chrome nails: chrome | Character nails: character | Seasonal nails: halloween, christmas, fall
- Gel & acrylic @Nails @RedditLaqueristas ~ gel, acrylic, builder gel, gel x, extensions
  Gel X: gel x | Builder gel: builder | Acrylic sets: acrylic | Long nails: long | Short nails: short
- Polish swatches @RedditLaqueristas ~ swatch, polish, indie polish, holo
  Holo polishes: holo | Indie polishes: indie | Magnetic polishes: magnetic | Jelly polishes: jelly | Polish collections: collection
- Nail progress @RedditLaqueristas @Nails ~ progress, growth, bitten, healthy nails
  Stopped biting: biting, bitten | Nail growth: growth | Repairs: repair | First sets: first | Self-taught: self taught
## Skincare & Hair @SkincareAddiction @Hair @curlyhair
- Skincare progress @SkincareAddiction @AsianBeauty ~ progress, acne, skin, before, after
  Acne journeys: acne | Before & after: before, after | Texture: texture | Shelfies: shelfie, shelf | Routines: routine
- Hair transformations @Hair @HairDye ~ haircut, hair, transformation, before, after
  Big chops: big chop | Color changes: color | Bangs: bangs | Short cuts: short, pixie | Before & after: before, after
- Curly hair @!curlyhair ~ curly, curls, wavy, coily
  Curl routines: routine | Wash days: wash day | Wavy hair: wavy | Coily hair: coily | Curl progress: progress
- Hair color @HairDye @Hair ~ dye, dyed, color, bleach, vivid
  Vivid colors: vivid | Blondes: blonde | Reds: red | Pastels: pastel | Grey blending: grey, gray
## Beauty Collections @MakeupAddiction @makeuplounge
- Makeup collections @MakeupAddiction @makeuplounge ~ collection, vanity, storage
  Vanity setups: vanity | Storage: storage | Palette collections: palette | Lipstick collections: lipstick | Declutters: declutter
- Hauls @MakeupAddiction @makeuplounge ~ haul, sephora, ulta, new
  Sephora hauls: sephora | Drugstore hauls: drugstore | Indie brands: indie | Limited editions: limited | Gifts: gift
- Empties & favorites @MakeupAddiction @SkincareAddiction ~ empties, used up, favorites, holy grail
  Empties: empties, used up | Holy grails: holy grail, hg | Project pans: project pan | Monthly favorites: favorites | Repurchases: repurchase
- Fragrance @fragrance @Colognes ~ fragrance, perfume, cologne, bottle
  Fragrance collections: collection | Niche bottles: niche | Signature scents: signature | Decants: decant | Bottle shots: bottle
## Beauty Craft @makeupartists @MakeupAddiction
- Bridal makeup @makeupartists @MakeupAddiction ~ bridal, wedding, bride
  Bridal looks: bridal | Bridal parties: bridesmaid | Trials: trial | Henna & bridal: henna | Soft glam: soft glam
- MUA work @makeupartists ~ client, mua, makeup artist, work
  Client looks: client | Photo shoots: shoot | Stage makeup: stage | Kit tours: kit | Before & after: before, after
- Drag makeup @MakeupAddiction @rupaulsdragrace ~ drag, drag queen, mug
  Drag mugs: mug | Contouring: contour | Wigs: wig | Brows: brows | Looks: look
- Lashes & brows @MakeupAddiction @lashextensions ~ lashes, lash, brows, lamination
  Lash extensions: extension | Brow lamination: lamination | Lash lifts: lift | Microblading: microblading | False lashes: false lashes

# Watches {watches} > fashion, sneakers, collectibles-toys, cars @Watches @rolex @seiko
## Luxury @rolex @Watches @OmegaWatches
- Rolex @!rolex ~ rolex, submariner, datejust, gmt, daytona
  Submariners: submariner, sub | Datejusts: datejust | GMTs: gmt | Daytonas: daytona | Explorers: explorer
- Omega & others @OmegaWatches @Watches ~ omega, speedmaster, seamaster, tudor, cartier
  Speedmasters: speedmaster | Seamasters: seamaster | Tudor: tudor | Cartier: cartier | Grand Seiko: grand seiko
- Haute horlogerie @Watches @WatchHorology ~ patek, audemars, vacheron, lange, ap
  Patek Philippe: patek | Audemars Piguet: audemars, royal oak | Vacheron: vacheron | Lange: lange | Independents: independent
- Vintage luxury @VintageWatches @Watches ~ vintage, 1960s, 1970s, patina
  Patina dials: patina | Vintage Rolex: vintage rolex | Heirlooms: grandfather, inherited | Service rescues: serviced | Vintage chronos: chronograph
## Affordable & Microbrands @Watches @seiko @MicroBrandWatches
- Seiko @!seiko ~ seiko, skx, presage, alpinist, turtle
  SKX: skx | Presage: presage | Alpinist: alpinist | Turtles: turtle | Seiko 5: seiko 5
- Microbrands @MicroBrandWatches @Watches ~ microbrand, baltic, lorier, christopher ward, zelos
  Baltic: baltic | Christopher Ward: christopher ward | Lorier: lorier | Zelos: zelos | Kickstarters: kickstarter
- Casio & G-Shock @gshock @casio ~ casio, g-shock, gshock, casioak
  G-Shocks: g-shock, gshock | Casioaks: casioak, ga-2100 | Digital Casios: digital | Collections: collection | Mods: mod
- Budget finds @Watches ~ budget, cheap, under, affordable, aliexpress
  Under $200: $200, under 200 | AliExpress: aliexpress | Thrift finds: thrift | Homages: homage | Swatch: swatch
## Watch Life @Watches @WatchHorology
- Wrist shots @Watches ~ wrist shot, wristshot, sotc, on wrist
  Wrist shots: wrist | Outdoors: outdoor, hike | Sunlight: sun, sunlight | Night lume: lume | Car wrist shots: car
- State of the collection @Watches ~ sotc, collection, state of the collection, box
  SOTC: sotc | Watch boxes: box | Rotations: rotation | One-watch collections: one watch | Grails: grail
- Straps @Watches @WatchStraps ~ strap, nato, rubber, bracelet, leather strap
  NATOs: nato | Rubber straps: rubber | Leather straps: leather | Bracelets: bracelet | Strap changes: change
- New watch days @Watches ~ nwd, new watch day, arrived, finally, gift
  NWD: nwd, new watch day | Gifts: gift | Graduation watches: graduation | Wedding watches: wedding | Milestone watches: milestone
## Watchmaking @Watchmaking @WatchHorology
- Movements @WatchHorology @Watchmaking ~ movement, caliber, calibre, caseback
  Exhibition casebacks: caseback | Movement shots: movement | Tourbillons: tourbillon | Hand finishing: finishing | Calibers: caliber
- Watch repair @!Watchmaking ~ service, repair, restoration, servicing
  Services: service, serviced | Restorations: restoration | Parts: parts | Dial work: dial | Bench setups: bench
- Watch mods @SeikoMods @Watches ~ mod, modded, build, seiko mod
  Seiko mods: seiko mod | Custom dials: dial | Bezels: bezel | Builds: build | Hands: hands
- Clocks @clocks @Watches ~ clock, grandfather clock, wall clock, pocket watch
  Pocket watches: pocket watch | Grandfather clocks: grandfather | Wall clocks: wall | Mantel clocks: mantel | Restorations: restored
## Watch Culture @Watches
- Dive watches @DiveWatches @Watches ~ dive watch, diver, 200m, 300m
  In-water shots: water | Bezels: bezel | Lume shots: lume | Tool divers: tool | Vintage divers: vintage
- Field & pilot watches @Watches ~ field watch, pilot, flieger, hamilton khaki
  Field watches: field | Pilot watches: pilot | Hamilton Khaki: khaki, hamilton | Military: military | Trench watches: trench
- Dress watches @Watches ~ dress watch, dress, small, thin
  Small dress watches: small | Gold watches: gold | Enamel dials: enamel | Reverso: reverso | Calatravas: calatrava
- Watch photography @Watches ~ macro, photo, shot, dial
  Dial macros: macro, dial | Flat lays: flat lay | Lume shots: lume | Studio shots: studio | Moody shots: moody
`;
export default source;
