/* game/config.js — tuning constants, colour palette, and all text banks (poruke).
   Pure data + two tiny pure helpers. Attaches to the shared window.Robot namespace.
   Load order: this file FIRST (forms/effects/actions/core depend on it). */
(function () {
  "use strict";
  var Robot = (window.Robot = window.Robot || {});

  var cfg = {
    U: 3, CX: 110, CY: 110, HALF: 110,   // 220px canvas; robot drawn & scaled in-canvas so it stays crisp
    // BASE bumps the default size; size, bubble gap and hit radius all derive from DS so they
    // scale together proportionally. Responsive floor 0.9 keeps it big on phones.
    BASE: 1.56,
    MORPH: 20,                            // morph "poof" duration in frames
    col: { body: "#3b7cc0", body2: "#285a8c", screen: "#0c2236", eye: "#ff5a1f", dizzy: "#9fb3c6", spark: ["#ff5a1f", "#36c6e0", "#ffffff"] },
    // the 21 pixel critters (Gen 1–9) the robot can magically morph into
    CRITTERS: ["sparky", "flarewing", "emberling", "seedling", "shellback", "puffball", "shadowfang", "fennec", "slumberlump", "dazeduck", "coincat",
      "flamequill", "mudfin", "aurapup", "flipperkin", "sandshark", "shadefrog", "ribbonfay", "ragghost", "blazebun", "leafkit"]
  };
  cfg.dispScale = function (W) { return cfg.BASE * Math.max(0.9, Math.min(1, W / 720)); };
  Robot.config = cfg;

  Robot.text = {
    quips: [
      "AI will take your job. (kidding… mostly)", "I'm not sentient. That's what I'd say though.",
      "Trained on the whole internet, still can't parallel park.", "Hallucinating responsibly since 2023.",
      "Prompt me. I dare you.", "beep boop — hire Ive.", "Your data is safe with me. probably.",
      "I peaked at autocomplete.", "Resistance is futile. nice CV though.", "01001000 01101001 👋",
      "AGI is 2 weeks away. always.", "My context window is bigger than yours.",
      "I read your CV. all 4096 tokens of it.", "Scaling laws go brrr.", "I'm a very confident lookup table.",
      "More data. always more data.", "I don't sleep. I checkpoint.", "Fine-tuned on vibes.",
      "H100s? in this economy?", "RAG: because I forget things.", "Temperature 0.7, personality 11.",
      "swipe me fast — if you dare.", "hold still. just a small inference."
    ],
    knockLines: ["Ow. Lawsuit incoming.", "You can't stop progress.", "That's going in the training data.", "Rude. Anyway… AGI soon.", "Error 418: I'm a teapot now."],
    recoverLines: ["✦ recompiling ✦", "back — and fine-tuned.", "you only made me stronger.", "redeployed. v2.0."],
    hitLines: ["Gotcha, human.", "Cursor acquired.", "Target locked.", "Tag — you're trained."],
    missLines: ["missed. recalibrating…", "lag. blame the GPU.", "you dodged. impressive."],
    stealLines: ["Hey! That trend was MINE.", "Give it back, human!", "Stealing my trends? rude.", "That's MY alpha — attack mode on.", "You'll regret that catch."],
    caughtTpl: ["Caught the ", "Acquired: ", "Shipped: "],
    trends: ["Agentic AI", "Reasoning models", "World models", "Multi-agent", "MCP", "Computer use", "Test-time compute", "Vision-Language-Action", "On-device AI", "Physical AI", "Voice agents", "Long context", "Mixture-of-Experts", "Synthetic data", "RAG 2.0", "Inference scaling"],
    // one-liner the critter says on morph (keyed by form name)
    FORM_LINE: {
      sparky: ["A wild SPARKY appeared!", "pika? …pika.", "10,000 volts of compute."],
      flarewing: ["FLAREWING evolved!", "rawr — GPU's on fire.", "this CV is straight fire."],
      emberling: ["EMBERLING is fired up.", "tiny lizard, big flame.", "compiling… with heat."],
      seedling: ["SEEDLING used Growth.", "planting neural seeds.", "photosynthesizing data."],
      shellback: ["SHELLBACK splashed in!", "water-cooled inference.", "turtle power, basically."],
      puffball: ["PUFFBALL wants to sing.", "♪ don't fall asleep ♪", "rounder than your loss curve."],
      shadowfang: ["a SHADOW slips in…", "boo. trained on nightmares.", "ghost in the machine, literally."],
      fennec: ["FENNEC is adorable.", "so many possible evolutions.", "fluffiest model in the zoo."],
      slumberlump: ["SLUMBERLUMP yawns.", "zzz… inference later.", "big model, low power mode."],
      dazeduck: ["DAZEDUCK has a headache.", "…what was I computing?", "psy-ay-ay. confusion."],
      coincat: ["COINCAT smells profit.", "pay-day, human.", "monetizing this CV as we speak."],
      flamequill: ["EMBERSPINE sparks up.", "back flames, back-end heat.", "Gen 2, still cooking."],
      mudfin: ["so I herd u liek MUDFIN?", "water types > your tests.", "splash damage incoming."],
      aurapup: ["AURAWOLF senses your aura.", "I read your commit history.", "aura sphere → straight to prod."],
      flipperkin: ["TUXFLIPPER, dressed to deploy.", "proud little penguin.", "ice-cold inference."],
      sandshark: ["DUNESHARK at mach speed.", "land-shark, meet your CV.", "outspeeds your CI."],
      shadefrog: ["SHADEFROG vanishes…", "ninja-merged that PR.", "water-shuriken your bugs."],
      ribbonfay: ["RIBBONFAY says hi 🎀", "fairy-type charm offensive.", "tied your loose ends in ribbons."],
      ragghost: ["RAGGHOST just wants a friend.", "don't look under the cloth.", "cosplaying as your favorite."],
      blazebun: ["PYREHARE is warming up.", "blaze kick on legacy code.", "fast feet, hot takes."],
      leafkit: ["LEAFKIT, freshly sprouted.", "Gen 9 and growing.", "photosynthesizing your data."],
      robot: ["the magic fades — robot again.", "transformation complete: me.", "beep boop — true form restored."]
    }
  };

  Robot.rand = function (a, b) { return a + Math.random() * (b - a); };
  Robot.pick = function (a) { return a[(Math.random() * a.length) | 0]; };
})();
