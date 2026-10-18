// Area -> subject. Content types are independent tags, not levels of expertise.
export const TAXONOMY_VERSION = "entertainment-v2";
export const CONTENT_TYPES = ["announcement", "meme", "art", "discussion", "analysis", "highlight", "collection", "general"];
const areas = [
  ["movies-tv", "Movies & TV", ["anime-manga", "creators-culture", "music"], [
    ["marvel", "Marvel", ["marvelstudios", "Marvel"]],
    ["star-wars", "Star Wars", ["StarWars"]],
    ["dc", "DC", ["DC_Cinematic", "DCcomics"]],
    ["horror", "Horror", ["horror"]],
    ["television", "Television", ["television"]],
    ["indian-cinema", "Indian Cinema", ["bollywood", "tollywood"]],
  ]],
  ["anime-manga", "Anime & Manga", ["movies-tv", "gaming", "creators-culture"], [
    ["classroom-of-the-elite", "Classroom of the Elite", ["ClassroomOfTheElite"]],
    ["one-piece", "One Piece", ["OnePiece"]],
    ["naruto", "Naruto", ["Naruto"]],
    ["dragon-ball", "Dragon Ball", ["dbz", "Dragonballsuper"]],
    ["jujutsu-kaisen", "Jujutsu Kaisen", ["JuJutsuKaisen"]],
    ["demon-slayer", "Demon Slayer", ["KimetsuNoYaiba"]],
    ["anime", "Anime Community", ["anime", "AnimeART"]],
  ]],
  ["gaming", "Gaming", ["anime-manga", "sports", "creators-culture"], [
    ["minecraft", "Minecraft", ["Minecraft"]],
    ["gta", "Grand Theft Auto", ["GTA", "GTA6", "gtaonline"]],
    ["counter-strike", "Counter-Strike", ["GlobalOffensive", "cs2"]],
    ["pokemon", "Pokemon", ["pokemon"]],
    ["fortnite", "Fortnite", ["FortNiteBR"]],
    ["valorant", "Valorant", ["VALORANT"]],
    ["elden-ring", "Elden Ring", ["Eldenring"]],
  ]],
  ["music", "Music", ["movies-tv", "creators-culture"], [
    ["pop", "Pop Music", ["popheads"]],
    ["hip-hop", "Hip-Hop", ["hiphopheads"]],
    ["k-pop", "K-Pop", ["kpop"]],
    ["rock", "Rock & Alternative", ["rock", "indieheads"]],
    ["taylor-swift", "Taylor Swift", ["TaylorSwift"]],
    ["indian-music", "Indian Music", ["IndianMusic", "IndianHipHopHeads"]],
  ]],
  ["sports", "Sports", ["gaming", "creators-culture"], [
    ["football", "Football", ["soccer"]],
    ["basketball", "Basketball", ["nba"]],
    ["cricket", "Cricket", ["Cricket"]],
    ["formula-1", "Formula 1", ["formula1", "F1Porn"]],
    ["tennis", "Tennis", ["tennis"]],
    ["wrestling", "Professional Wrestling", ["SquaredCircle"]],
  ]],
  ["creators-culture", "Creators & Internet Culture", ["movies-tv", "gaming", "music", "sports"], [
    ["internet-humor", "Internet Humor", ["memes", "funny"]],
    ["streaming", "Streaming Communities", ["Twitch"]],
    ["youtube", "YouTube Creators", ["youtube"]],
    ["pop-culture", "Pop Culture", ["popculturechat"]],
    ["cosplay", "Cosplay", ["cosplay"]],
  ]],
];

export function entertainmentTaxonomy() {
  return areas.map(([id, name, related, subjects]) => ({
    id, name, related, version: TAXONOMY_VERSION, pool: "entertainment", cap: null,
    subreddits: [...new Set(subjects.flatMap(s => s[2]))],
    subtopics: subjects.map(([subjectId, subjectName, subreddits]) => {
      const path = `${id}/${subjectId}`;
      return {
        id: subjectId, name: subjectName, path, subreddits,
        // Compatibility projection for the existing feed composer. All types are equally accessible.
        steps: [{ id: "content", name: "Content", path: `${path}/content`, depth: 1, subreddits, dedicated: subreddits, keywords: [],
          horizontals: CONTENT_TYPES.map(type => ({ id: type, name: type[0].toUpperCase() + type.slice(1), path: `${path}/content/${type}`, keywords: [{ field: "any", text: type }] })),
        }],
      };
    }),
  }));
}
