// Food & drink topics. DSL: see lib/feed/taxonomy/parse.mjs.
const source = `
# Home Cooking {home-cooking} > baking, bbq-grilling, world-cuisines, coffee, gardening @Cooking @FoodPorn @food
## Everyday Meals @Cooking @food @EatCheapAndHealthy
- Weeknight dinners @Cooking @dinner @food ~ dinner, weeknight, made, homemade
  One-pan meals: one pan, sheet pan, skillet | Pasta nights: pasta | Stir fries: stir fry | Soups: soup | Tacos: taco, tacos
- Meal prep @MealPrepSunday @EatCheapAndHealthy ~ meal prep, prep, lunches, containers
  High protein preps: protein | Budget preps: budget, cheap | Breakfast preps: breakfast | Bento preps: bento | Weekly preps: week, weekly
- Budget cooking @EatCheapAndHealthy @budgetfood ~ budget, cheap, under, frugal
  Rice and beans: rice and beans, beans | Pantry meals: pantry | Batch cooking: batch | Leftover makeovers: leftover, leftovers | Cheap proteins: eggs, chicken thighs
- Breakfast @breakfast @food ~ breakfast, brunch, eggs, pancakes
  Eggs: eggs, omelette | Pancakes: pancake, pancakes | Full breakfasts: full english, fry up | Brunch plates: brunch | Breakfast sandwiches: breakfast sandwich
## Techniques @Cooking @AskCulinary @sousvide
- Knife skills @TrueChefKnives @knives @sharpening ~ knife, knives, cut, dice
  Chef knives: chef knife, gyuto | Japanese knives: japanese, santoku | Sharpening: sharpen, whetstone | Knife rolls: knife roll, collection | Cuts: julienne, brunoise
- Cast iron @!castiron ~ cast iron, skillet, seasoning, pan
  Restorations: restore, restored, rust | Seasoning: seasoning, seasoned | Eggs in cast iron: egg, eggs | Collections: collection, griswold | Thrift finds: thrift, found
- Sous vide @!sousvide ~ sous vide, anova, water bath
  Steaks: steak | Chicken breasts: chicken | Eggs: egg, eggs | Roasts: roast | Fails: fail
- Fermenting @fermentation @Kombucha ~ ferment, fermented, kimchi, sauerkraut, kombucha
  Kimchi: kimchi | Sauerkraut: sauerkraut | Hot sauces: hot sauce | Kombucha: kombucha | Pickles: pickle, pickles
## Comfort Food @food @FoodPorn @pizza
- Pizza night @Pizza @food ~ pizza, pie, neapolitan, detroit
  Neapolitan: neapolitan | Detroit style: detroit | NY style: ny style, new york | Pizza ovens: ooni, oven | Homemade dough: dough
- Burgers @burgers @food ~ burger, burgers, smash burger, cheeseburger
  Smash burgers: smash | Double stacks: double | Homemade buns: bun | Restaurant burgers: restaurant | Breakfast burgers: breakfast
- Pasta @pasta @Cooking ~ pasta, carbonara, lasagna, ravioli, gnocchi
  Fresh pasta: fresh pasta, homemade pasta | Carbonara: carbonara | Lasagna: lasagna | Filled pasta: ravioli, tortellini | Gnocchi: gnocchi
- Sandwiches @sandwiches @food ~ sandwich, sub, hoagie, grilled cheese
  Grilled cheese: grilled cheese | Deli subs: sub, hoagie, deli | Breakfast sandwiches: breakfast | Cheesesteaks: cheesesteak | Banh mi: banh mi
## Healthy & Plant-based @HealthyFood @vegan @veganrecipes
- Healthy plates @HealthyFood @EatCheapAndHealthy ~ healthy, salad, bowl, protein
  Salads: salad | Grain bowls: bowl | High protein: protein | Low calorie: low calorie | Snacks: snack
- Vegan meals @vegan @veganrecipes ~ vegan, plant based, plant-based, tofu
  Tofu dishes: tofu | Vegan comfort food: comfort | Vegan baking: vegan cake, vegan cookies | Vegan burgers: burger | Vegan curries: curry
- Vegetarian @vegetarian @veganrecipes ~ vegetarian, veggie, meatless
  Veggie pasta: pasta | Veggie curries: curry | Roasted veg: roasted | Veggie burgers: burger | Halloumi: halloumi
- Smoothies & bowls @smoothies @HealthyFood ~ smoothie, acai, smoothie bowl, juice
  Acai bowls: acai | Green smoothies: green | Fruit bowls: fruit | Protein shakes: shake | Juices: juice
## Fine Dining at Home @CulinaryPlating @Chefit @Cooking
- Plating @!CulinaryPlating ~ plating, plated, dish, course
  Seafood plates: fish, scallops, seafood | Meat plates: steak, duck, lamb | Desserts: dessert | Tasting menus: tasting menu, course | Sauces: sauce, foam
- Steak dinners @steak @Cooking ~ steak, ribeye, wagyu, filet, tomahawk
  Ribeyes: ribeye | Wagyu: wagyu | Tomahawks: tomahawk | Reverse sears: reverse sear | Steak frites: frites
- Seafood @seafood @Cooking ~ seafood, salmon, shrimp, lobster, scallops, crab
  Salmon: salmon | Shrimp: shrimp, prawns | Lobster: lobster | Scallops: scallops | Crab: crab
- Holiday feasts @Cooking @food ~ thanksgiving, christmas dinner, feast, holiday
  Thanksgiving: thanksgiving, turkey | Christmas dinners: christmas | Easter: easter | Diwali: diwali | Eid: eid

# Baking {baking} > home-cooking, coffee, world-cuisines @Baking @Breadit @cakedecorating
## Bread @Breadit @Sourdough
- Sourdough @!Sourdough @Breadit ~ sourdough, starter, loaf, crumb
  Crumb shots: crumb | Starters: starter | Scoring: score, scoring, ear | Inclusions: jalapeno, cheese, olive | First loaves: first
- Yeasted breads @Breadit @Baking ~ bread, loaf, brioche, challah, focaccia
  Focaccia: focaccia | Brioche: brioche | Challah: challah | Sandwich loaves: sandwich, pan loaf | Rolls: rolls, buns
- Baguettes & lean doughs @Breadit ~ baguette, ciabatta, batard, boule
  Baguettes: baguette | Ciabatta: ciabatta | Batards: batard | Boules: boule | Bakery visits: bakery
- Bread fails @Breadit @Sourdough ~ fail, flat, dense, help, what went wrong
  Flat loaves: flat | Dense crumb: dense | Burnt crusts: burnt | Gummy: gummy | Explosions: exploded, blowout
## Cakes & Decorating @cakedecorating @Baking @Cakes
- Celebration cakes @cakedecorating @Cakes ~ birthday cake, cake, celebration
  Birthday cakes: birthday | Kids cakes: son, daughter, kids | Number cakes: number cake | Drip cakes: drip | Tiered cakes: tier, tiered
- Wedding cakes @cakedecorating @Cakes ~ wedding cake, wedding, tiered
  Floral cakes: floral, flowers | Naked cakes: naked | Modern cakes: modern | Rustic: rustic | Cake toppers: topper
- Character cakes @cakedecorating ~ character, themed, sculpted, 3d cake
  Animal cakes: animal, cat, dog | Cartoon cakes: cartoon, disney | Game cakes: minecraft, pokemon | Realistic cakes: realistic | Sculpted: sculpted
- Cake fails @cakedecorating @Baking ~ fail, disaster, collapsed, nailed it
  Collapsed: collapsed | Melting: melting | Ordered vs got: ordered, expectation | Lopsided: lopsided | Funny fails: funny
## Pastries & Desserts @Baking @Pastry @Dessert
- Croissants & laminated @Pastry @Baking ~ croissant, laminated, puff pastry, danish
  Croissants: croissant | Pain au chocolat: pain au chocolat | Danishes: danish | Lamination shots: lamination, layers | Cruffins: cruffin
- Cookies @Cookies @Baking ~ cookie, cookies, chocolate chip
  Chocolate chip: chocolate chip | Sugar cookies: sugar cookie, decorated | Macarons: macaron, macarons | Shortbread: shortbread | Stuffed cookies: stuffed
- Pies & tarts @Pie @Baking ~ pie, tart, galette, crust
  Fruit pies: apple, cherry, blueberry | Lattice tops: lattice | Tarts: tart | Galettes: galette | Pie art: pie art, design
- Desserts @Dessert @Baking ~ dessert, cheesecake, tiramisu, brownie
  Cheesecakes: cheesecake | Tiramisu: tiramisu | Brownies: brownie, brownies | Creme brulee: brulee | Pavlova: pavlova
## Cupcakes & Sweets @Baking @cupcakes @Candy
- Cupcakes @Baking @cupcakes ~ cupcake, cupcakes, frosting
  Piped frosting: piping, piped | Themed cupcakes: themed | Mini cupcakes: mini | Cupcake towers: tower | Flavors: lemon, red velvet
- Donuts @doughnuts @Baking ~ donut, donuts, doughnut
  Glazed: glazed | Filled donuts: filled | Mochi donuts: mochi | Homemade donuts: homemade | Donut boxes: box, dozen
- Chocolate work @chocolate @Baking ~ chocolate, bonbon, truffle, tempered
  Bonbons: bonbon | Truffles: truffle | Tempering: tempered, temper | Chocolate bars: bar | Showpieces: showpiece
- Candy & confections @Candy @Baking ~ candy, fudge, caramel, marshmallow
  Fudge: fudge | Caramel: caramel | Marshmallows: marshmallow | Hard candy: hard candy, lollipop | Toffee: toffee
## World Bakes @Baking @Breadit @AsianBaking
- Asian bakes @Baking @AsianBaking ~ mochi, milk bread, matcha, mooncake, bao
  Milk bread: milk bread | Mochi: mochi | Matcha bakes: matcha | Mooncakes: mooncake | Bao: bao
- European classics @Baking @Pastry ~ stollen, strudel, kouign amann, panettone, baklava
  Panettone: panettone | Strudel: strudel | Baklava: baklava | Stollen: stollen | Kouign amann: kouign amann
- Holiday baking @Baking @Cookies ~ christmas cookies, gingerbread, holiday, easter
  Gingerbread houses: gingerbread house | Christmas cookies: christmas | Hot cross buns: hot cross | Pumpkin bakes: pumpkin | Valentine bakes: valentine
- Gluten-free @glutenfree @Baking ~ gluten free, gluten-free, gf
  GF bread: bread | GF cakes: cake | GF cookies: cookie | GF pizza: pizza | GF pastry: pastry

# BBQ & Grilling {bbq-grilling} > home-cooking, camping, cocktails-mixology @BBQ @smoking @grilling
## Smoking @smoking @BBQ
- Brisket @smoking @BBQ ~ brisket, bark, smoke ring, packer
  Bark shots: bark | Smoke rings: smoke ring | Sliced brisket: slice, sliced | Burnt ends: burnt ends | First briskets: first
- Ribs @smoking @BBQ ~ ribs, spare ribs, baby back, beef ribs
  Spare ribs: spare | Baby backs: baby back | Beef ribs: beef ribs, dino ribs | Sauced ribs: sauce, glazed | Bend tests: bend
- Pulled pork @smoking @BBQ ~ pulled pork, pork butt, shoulder
  Pork butts: butt | Pulled shots: pulled | Sandwiches: sandwich | Bark: bark | Overnight cooks: overnight
- Smoker setups @smoking @BBQ ~ smoker, offset, pellet, kamado, cabinet
  Offsets: offset | Pellet grills: pellet, traeger | Kamados: kamado, big green egg | Cabinet smokers: cabinet | DIY smokers: diy, build
## Grilling @grilling @BBQ @steak
- Steaks on the grill @grilling @steak ~ steak, ribeye, tomahawk, picanha
  Ribeyes: ribeye | Tomahawks: tomahawk | Picanha: picanha | Reverse sear: reverse sear | Grill marks: grill marks
- Burgers & dogs @grilling @burgers ~ burger, burgers, hot dog, smash
  Smash burgers: smash | Hot dogs: hot dog | Brats: brat, brats | Sliders: slider | Cookouts: cookout
- Chicken & wings @grilling @BBQ ~ chicken, wings, thighs, spatchcock
  Wings: wings | Spatchcock: spatchcock | Thighs: thighs | Beer can: beer can | Skewers: skewer, kebab
- Grill setups @grilling @webergrills ~ grill, weber, kettle, griddle, blackstone
  Weber kettles: kettle, weber | Griddles: griddle, blackstone | Gas grills: gas | Outdoor kitchens: outdoor kitchen | Restorations: restore, restored
## Live Fire @BBQ @FirePit @grilling
- Open fire cooking @BBQ @grilling ~ open fire, fire, live fire, asado
  Asado: asado | Hanging cooks: hanging | Campfire steaks: campfire | Cowboy cooking: cowboy | Fire pits: fire pit
- Rotisserie & spits @BBQ ~ rotisserie, spit, whole hog, lamb
  Whole hogs: whole hog, pig | Lamb spits: lamb | Rotisserie chicken: rotisserie | Al pastor: al pastor, trompo | Gyro: gyro
- Charcoal & wood @BBQ @smoking ~ charcoal, wood, lump, oak, hickory
  Lump charcoal: lump | Wood stacks: wood | Binchotan: binchotan | Chimney starters: chimney | Fire builds: fire
- Pizza ovens @Pizza @ooni ~ pizza oven, ooni, wood fired
  Ooni: ooni | Wood-fired: wood fired | Gozney: gozney | Diy ovens: diy | First pizzas: first
## Sides & Sauces @BBQ @Cooking
- BBQ sides @BBQ @Cooking ~ mac and cheese, coleslaw, beans, cornbread
  Mac and cheese: mac and cheese | Baked beans: beans | Cornbread: cornbread | Coleslaw: coleslaw | Potato salad: potato salad
- Sauces & rubs @BBQ @hotsauce ~ sauce, rub, homemade sauce, hot sauce
  BBQ sauces: bbq sauce | Dry rubs: rub | Hot sauces: hot sauce | Chimichurri: chimichurri | Glazes: glaze
- Sausages & charcuterie @Charcuterie @sausagetalk ~ sausage, salami, bacon, cured
  Homemade sausage: sausage | Salami: salami | Bacon: bacon | Jerky: jerky | Boards: board
- Smoked extras @smoking ~ smoked cheese, smoked salmon, smoked turkey, smoked
  Smoked turkey: turkey | Smoked salmon: salmon | Smoked cheese: cheese | Smoked nuts: nuts | Smoked cocktails: cocktail
## Competition & Pitmasters @BBQ @smoking
- BBQ joints @BBQ @Texas ~ bbq joint, franklin, texas bbq, restaurant
  Texas joints: texas | Franklin: franklin | KC BBQ: kansas city | Carolina BBQ: carolina | Trays: tray
- Competitions @BBQ ~ competition, comp, kcbs, contest
  Turn-in boxes: turn in, box | Awards: award, trophy | Teams: team | Cook-offs: cook off | Judging: judge
- Big cooks @BBQ @smoking ~ party, catering, feed, cookout, crowd
  Catering: catering | Parties: party | Graduations: graduation | Weddings: wedding | Block parties: block party
- Butchery @Butchery @BBQ ~ butcher, trim, trimming, cuts, whole
  Brisket trims: trim | Primal cuts: primal | Dry aging: dry age, dry aged | Whole animals: whole | Knife work: knife

# Coffee {coffee} > baking, home-cooking, desk-setups @Coffee @espresso @pourover
## Espresso @espresso @Coffee
- First espresso setups @espresso ~ first, setup, beginner, new machine
  Breville starts: breville, bambino | Gaggia: gaggia | Manual levers: lever, flair | Budget setups: budget | Upgrades: upgrade
- Shot pulls @espresso ~ shot, pull, extraction, bottomless
  Bottomless shots: bottomless, naked portafilter | Channeling: channeling | Tiger striping: tiger | Ristretto: ristretto | Dialing in: dial, dialing
- Prosumer machines @espresso ~ la marzocco, decent, lelit, profitec, rocket
  La Marzocco: la marzocco, linea | Decent: decent | Lelit: lelit | Rocket: rocket | Profitec: profitec
- Grinders @espresso @Coffee ~ grinder, niche, df64, eg-1, comandante
  Single dosers: single dose, df64, df83 | Niche: niche | Hand grinders: hand grinder, comandante, 1zpresso | Flat burrs: flat burr | Grind distribution: grind, wdt
## Latte Art & Drinks @LatteArt @Coffee
- Latte art @!LatteArt ~ latte art, pour, rosetta, tulip, heart
  Hearts: heart | Tulips: tulip | Rosettas: rosetta | Swans: swan | Progress: progress, day
- Milk drinks @Coffee @LatteArt ~ latte, cappuccino, flat white, cortado
  Cappuccinos: cappuccino | Flat whites: flat white | Cortados: cortado | Oat milk: oat | Iced lattes: iced latte
- Iced & specialty drinks @Coffee @espresso ~ iced coffee, cold brew, espresso tonic, affogato
  Cold brew: cold brew | Espresso tonics: tonic | Affogato: affogato | Shaken espresso: shaken | Matcha lattes: matcha
- Cafe drinks @Coffee @cafe ~ cafe, coffee shop, barista
  Cafe visits: visit, cafe | Barista life: barista | Menus: menu | Cups: cup | Pastry pairings: pastry, croissant
## Pour-over & Brewing @pourover @Coffee
- Pour-over @pourover @Coffee ~ pour over, v60, chemex, kalita
  V60: v60 | Chemex: chemex | Kalita: kalita | Orea: orea | Bloom shots: bloom
- AeroPress & immersion @AeroPress @Coffee ~ aeropress, french press, clever, immersion
  AeroPress: aeropress | French press: french press | Clever: clever | Travel kits: travel | Inverted: inverted
- Moka & stovetop @Coffee @mokapot ~ moka pot, moka, stovetop, bialetti
  Bialetti: bialetti | Moka setups: setup | Turkish coffee: turkish | Camping brews: camping | Collections: collection
- Brew stations @Coffee @pourover ~ coffee station, coffee bar, setup, station
  Coffee bars: coffee bar | Small stations: small | Morning routines: morning | Cabinet bars: cabinet | Dream stations: dream
## Beans & Roasting @roasting @Coffee
- Home roasting @!roasting ~ roast, roasting, roaster, green beans
  Air roasters: air roaster, fresh roast | Drum roasters: drum | Popcorn poppers: popcorn | Roast levels: light roast, dark roast | Cooling trays: cooling
- Beans & bags @Coffee @pourover ~ beans, bag, roaster, single origin, haul
  Bean hauls: haul | Single origins: single origin, ethiopia, kenya | Bag designs: bag | Subscriptions: subscription | Geisha: geisha
- Coffee farms @Coffee @roasting ~ farm, harvest, cherries, origin trip
  Cherries: cherries, cherry | Harvests: harvest | Processing: washed, natural | Farm visits: visit | Drying beds: drying
- Tasting & cupping @Coffee @pourover ~ cupping, tasting, notes, flavor
  Cupping sessions: cupping | Tasting notes: notes | Flavor wheels: wheel | Side by side: comparison, vs | Rare coffees: rare
## Coffee Culture @Coffee @cafe
- Mugs & cups @Coffee @Mugs ~ mug, mugs, cup, cups
  Handmade mugs: handmade, ceramic | Collections: collection | Travel mugs: travel | Glass cups: glass | Funny mugs: funny
- Coffee shops @cafe @Coffee ~ coffee shop, cafe, roastery
  Tiny cafes: tiny, small | Aesthetic cafes: aesthetic | Roasteries: roastery | Travel cafes: travel | Cafe interiors: interior
- Morning rituals @Coffee @espresso ~ morning, routine, first cup, sunrise
  Sunrise coffee: sunrise | Window coffee: window | Weekend mornings: weekend | Outdoor coffee: outdoor, camping | Work coffee: work
- Coffee gear hauls @Coffee @espresso ~ haul, new gear, scale, kettle
  Scales: scale | Kettles: kettle | Tampers: tamper | Knock boxes: knock box | Accessory sets: accessories

# Cocktails & Drinks {cocktails-mixology} > coffee, bbq-grilling, home-cooking @cocktails @mixology @bourbon
## Classic Cocktails @cocktails @mixology
- Whiskey classics @cocktails @bourbon ~ old fashioned, manhattan, whiskey sour, sazerac
  Old fashioneds: old fashioned | Manhattans: manhattan | Whiskey sours: whiskey sour | Sazeracs: sazerac | Boulevardiers: boulevardier
- Gin & vodka classics @cocktails @gin ~ martini, negroni, gimlet, gin
  Martinis: martini | Negronis: negroni | Gimlets: gimlet | Gin and tonics: gin and tonic, g&t | French 75: french 75
- Rum & tiki @Tiki @cocktails ~ tiki, mai tai, daiquiri, rum, zombie
  Mai tais: mai tai | Daiquiris: daiquiri | Zombies: zombie | Painkillers: painkiller | Tiki mugs: mug
- Tequila & mezcal @cocktails @tequila ~ margarita, paloma, mezcal, tequila
  Margaritas: margarita | Palomas: paloma | Mezcal drinks: mezcal | Spicy marg: spicy | Ranch water: ranch water
## Home Bars @homebar @cocktails
- Home bar setups @homebar @cocktails ~ home bar, bar cart, bar, setup
  Bar carts: bar cart | Cabinets: cabinet | Basement bars: basement | Shelves: shelf, shelves | Built-ins: built in
- Glassware @cocktails @homebar ~ glass, glasses, coupe, nick and nora
  Coupes: coupe | Nick and Noras: nick and nora | Rocks glasses: rocks | Vintage glassware: vintage | Crystal: crystal
- Ice @cocktails @homebar ~ clear ice, ice, ice ball, cube
  Clear ice: clear ice | Ice balls: ball | Stamped ice: stamp, stamped | Big cubes: cube | Ice molds: mold
- Bar tools @cocktails @homebar ~ shaker, jigger, bar spoon, tools
  Shakers: shaker | Jiggers: jigger | Mixing glasses: mixing glass | Bar kits: kit | Strainers: strainer
## Spirits @bourbon @whiskey @Scotch
- Bourbon @!bourbon ~ bourbon, pour, bottle, haul
  Hauls: haul | Store picks: store pick, single barrel | Allocated: allocated, blantons, weller | Shelves: shelf, collection | Tasting flights: flight
- Scotch & world whisky @Scotch @whiskey ~ scotch, islay, speyside, japanese whisky
  Islay: islay, laphroaig, ardbeg | Speyside: speyside, macallan | Japanese whisky: japanese, yamazaki | Irish whiskey: irish | Distillery visits: distillery
- Tequila & mezcal @tequila @mezcal ~ tequila, mezcal, agave, anejo
  Blancos: blanco | Anejos: anejo | Mezcals: mezcal | Agave fields: agave | Collections: collection
- Gin & rum @gin @rum ~ gin, rum, botanical, aged rum
  Craft gins: craft gin | Navy strength: navy | Aged rums: aged | Jamaican rums: jamaica | Bottle art: bottle
## Beer & Wine @beer @wine @Homebrewing
- Craft beer @CraftBeer @beer ~ ipa, stout, craft beer, can, pint
  IPAs: ipa | Stouts: stout | Can art: can | Brewery visits: brewery | Flights: flight
- Homebrewing @beerporn @mead @cider ~ homebrew, brew day, batch, fermenter
  Brew days: brew day | All grain: all grain | Kegs: keg | Labels: label | First batches: first
- Wine @wine @winemaking ~ wine, bottle, vineyard, red, natural wine
  Vineyards: vineyard | Natural wine: natural | Cellar shots: cellar | Bottle labels: label | Pairings: pairing
- Cider & mead @mead @cider ~ mead, cider, fermentation
  Meads: mead | Ciders: cider | Fruit wines: fruit wine | Carboys: carboy | Bottling: bottling
## Creative Mixology @mixology @cocktails
- Signature cocktails @mixology @cocktails ~ original, signature, my own, recipe
  Smoked cocktails: smoked, smoke | Garnish art: garnish | Colorful drinks: color, blue, purple | Fat washed: fat washed | Clarified: clarified, milk punch
- Seasonal cocktails @cocktails ~ fall, autumn, summer, winter, holiday
  Autumn drinks: fall, autumn, apple | Summer spritzes: spritz, summer | Holiday punches: punch, holiday | Winter warmers: hot toddy, winter | Halloween drinks: halloween
- Mocktails @mocktails @cocktails ~ mocktail, non alcoholic, zero proof, na
  NA spirits: na spirit | Sodas: soda | Fruit mocktails: fruit | Shrubs: shrub | Kombucha mocks: kombucha
- Bars & bartenders @bartenders @cocktails ~ bar, bartender, speakeasy, menu
  Speakeasies: speakeasy | Bar menus: menu | Bartender life: bartender | Best bars: best bar | Bar interiors: interior

# World Cuisines {world-cuisines} > home-cooking, travel, baking, coffee @food @FoodPorn @AsianFood
## East Asian @AsianFood @JapaneseFood @KoreanFood @chinesefood
- Ramen @ramen @JapaneseFood ~ ramen, tonkotsu, shoyu, miso ramen, noodles
  Tonkotsu: tonkotsu | Shoyu: shoyu | Homemade ramen: homemade | Ramen shops: shop, japan | Instant hacks: instant, upgraded
- Sushi @sushi @JapaneseFood ~ sushi, sashimi, nigiri, omakase, roll
  Omakase: omakase | Nigiri: nigiri | Homemade sushi: homemade | Rolls: roll | Sashimi: sashimi
- Korean food @KoreanFood ~ korean, kbbq, bibimbap, tteokbokki, kimchi
  Korean BBQ: kbbq, korean bbq | Bibimbap: bibimbap | Tteokbokki: tteokbokki | Fried chicken: fried chicken | Banchan: banchan
- Chinese food @chinesefood @AsianFood ~ dumplings, dim sum, mapo, noodles, chinese
  Dumplings: dumpling, dumplings | Dim sum: dim sum | Sichuan: sichuan, mapo | Hand-pulled noodles: hand pulled, biang | Hot pot: hot pot
## South & Southeast Asian @IndianFood @AsianFood @ThaiFood
- Indian curries @IndianFoodPhotos @FoodPorn @food ~ curry, biryani, dal, paneer, tikka
  Biryani: biryani | Butter chicken: butter chicken | Dal: dal | Paneer: paneer | Thalis: thali
- South Indian @IndianFood @food ~ dosa, idli, sambar, south indian
  Dosas: dosa | Idli: idli | Sambar: sambar | Banana leaf meals: banana leaf | Filter coffee: filter coffee
- Thai food @ThaiFood @AsianFood ~ thai, pad thai, green curry, tom yum
  Pad thai: pad thai | Green curry: green curry | Tom yum: tom yum | Mango sticky rice: mango sticky | Street stalls: street
- Vietnamese & Filipino @VietnameseFood @filipinofood @AsianFood ~ pho, banh mi, adobo, sinigang, lechon
  Pho: pho | Banh mi: banh mi | Adobo: adobo | Lechon: lechon | Halo-halo: halo halo
## Latin American @MexicanFood @food
- Tacos @tacos @MexicanFood ~ taco, tacos, al pastor, birria, carnitas
  Al pastor: al pastor | Birria: birria | Carnitas: carnitas | Street tacos: street | Homemade tortillas: tortilla
- Mexican home cooking @MexicanFood ~ enchiladas, tamales, mole, pozole, salsa
  Tamales: tamale, tamales | Enchiladas: enchilada | Mole: mole | Pozole: pozole | Salsas: salsa
- South American @food @Cooking ~ empanadas, arepas, ceviche, asado, feijoada
  Empanadas: empanada | Arepas: arepa | Ceviche: ceviche | Asado: asado | Feijoada: feijoada
- Caribbean @food @Cooking ~ jerk, jamaican, cuban, plantain, roti
  Jerk chicken: jerk | Cuban sandwiches: cuban | Plantains: plantain | Oxtail: oxtail | Roti: roti
## Mediterranean & Middle East @MediterraneanDiet @food @Cooking
- Italian classics @ItalianFood @Cooking ~ italian, risotto, osso buco, carbonara
  Risotto: risotto | Carbonara: carbonara | Cacio e pepe: cacio e pepe | Osso buco: osso buco | Nonna recipes: nonna
- Greek & Turkish @food @Cooking ~ gyro, souvlaki, kebab, doner, moussaka
  Gyros: gyro | Souvlaki: souvlaki | Doner: doner | Moussaka: moussaka | Mezze: meze, mezze
- Middle Eastern @food @Cooking ~ shawarma, falafel, hummus, kebab, mansaf
  Shawarma: shawarma | Falafel: falafel | Hummus: hummus | Rice dishes: mansaf, maqluba, kabsa | Breads: pita, manakish
- Spanish & Portuguese @food @Cooking ~ paella, tapas, jamon, pasteis
  Paella: paella | Tapas: tapas | Jamon: jamon | Pasteis de nata: pastel de nata, pasteis | Churros: churros
## Street Food & Travel Eats @StreetFood @food @FoodPorn
- Street food stalls @StreetFood @food ~ street food, stall, vendor, night market
  Night markets: night market | Food trucks: food truck | Hawker centres: hawker | Vendors: vendor | Skewers: skewer
- Food markets @food @travel ~ market, food hall, mercado
  Food halls: food hall | Mercados: mercado | Fish markets: fish market | Farmers markets: farmers market | Spice markets: spice
- Regional specialties @food @FoodPorn ~ local, traditional, regional, specialty
  Traditional dishes: traditional | Local specialties: local | Family recipes: family recipe | Village food: village | Festival food: festival
- Food trips @food @travel ~ ate, food tour, trip, while visiting
  Japan eats: japan | Mexico eats: mexico | Italy eats: italy | Thailand eats: thailand | India eats: india
`;
export default source;
