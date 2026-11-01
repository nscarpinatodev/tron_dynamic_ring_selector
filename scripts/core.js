/** Pure policy: no Foundry globals, document mutations, text inference, or rendering. */
export const ID = "tron-identity-rings";
export const CLASSIFICATIONS = Object.freeze({
  protector: "User-loyal / protector",
  loyalist: "Rogue-authority loyalist",
  search: "Search program / hacker / architect",
  corrupted: "Corrupted / repurposed program",
  iso: "ISO",
  military: "Military / defense",
  outland: "Outland / healthcare",
  utility: "Utility / information handler"
});
export const PALETTE = Object.freeze({
  protector: "#28aaff", loyalist: "#ff3038", search: "#ffe43b", corrupted: "#ff8b26",
  iso: "#ffffff", military: "#48ed69", outland: "#25dfcf", utility: "#b16bff"
});
const has = (object, key) => Object.hasOwn(object, key);
export const isClassification = value => typeof value === "string" && has(CLASSIFICATIONS, value);
export const flagsOf = document => document?.flags?.[ID] ?? {};
const SOURCES = ["ancestry.slug", "background.slug", "traits"];

export function validateConfig(config) {
  if (!config || !Array.isArray(config.rules)) throw new Error("Rules must be an array.");
  if (config.rules.length > 200) throw new Error("At most 200 automatic rules are supported.");
  if (config.fallback !== "unchanged" && !isClassification(config.fallback)) throw new Error("Invalid fallback.");
  for (const key of Object.keys(CLASSIFICATIONS)) {
    if (!/^#[0-9a-f]{6}$/i.test(config.palette?.[key] ?? "")) throw new Error(`Invalid six-digit color for ${key}.`);
  }
  config.rules.forEach((rule, index) => {
    if (!rule || typeof rule.label !== "string" || !rule.label.trim() ||
      !Number.isFinite(rule.priority) || !SOURCES.includes(rule.source) ||
      typeof rule.value !== "string" || !rule.value.trim() || !isClassification(rule.classification) ||
      !["any", "character", "npc"].includes(rule.actorType ?? "any") ||
      (rule.enabled !== undefined && typeof rule.enabled !== "boolean")) {
      throw new Error(`Invalid rule ${index + 1}: label, numeric priority, source, exact value, classification and actorType are required.`);
    }
  });
  return config;
}

/** SF2e 1.6.1: build items use system.slug; both creature types have system.traits.value. */
export function structuredValues(actor, source) {
  if (!["character", "npc"].includes(actor?.type)) return [];
  if (source === "traits") return (actor.system?.traits?.value ?? []).filter(v => typeof v === "string");
  const type = { "ancestry.slug": "ancestry", "background.slug": "background" }[source];
  if (!type || actor.type !== "character") return [];
  return Array.from(actor.items ?? []).filter(i => i.type === type)
    .map(i => i.system?.slug).filter(v => typeof v === "string" && v.length);
}

export function orderedRules(rules) {
  return rules.map((rule, index) => ({ ...rule, index }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index);
}

export function resolve(actor, token, config) {
  const unchanged = (source, reason) => ({ managed: false, classification: null, source, reason, matches: [] });
  if (!["character", "npc"].includes(actor?.type)) return unchanged("unsupported", "Only PCs and NPCs are supported.");
  const tokenChoice = flagsOf(token).classification ?? "inherit";
  const actorChoice = flagsOf(actor).classification ?? "automatic";
  const chosen = (classification, source, matches = []) => ({
    managed: true, classification, color: config.palette[classification], source, matches
  });
  if (tokenChoice === "unmanaged") return unchanged("token", "Token opted out.");
  if (isClassification(tokenChoice)) return chosen(tokenChoice, "token");
  if (tokenChoice !== "inherit") return unchanged("invalid", "Unknown token classification; left unchanged.");
  if (actorChoice === "unmanaged") return unchanged("actor", "Actor opted out.");
  if (isClassification(actorChoice)) return chosen(actorChoice, "actor");
  if (actorChoice !== "automatic") return unchanged("invalid", "Unknown actor classification; left unchanged.");
  const matches = orderedRules(config.rules).filter(rule =>
    rule.enabled !== false && ((rule.actorType ?? "any") === "any" || rule.actorType === actor.type) &&
    structuredValues(actor, rule.source).includes(rule.value));
  if (matches.length) return chosen(matches[0].classification, "rule", matches);
  if (isClassification(config.fallback)) return chosen(config.fallback, "fallback");
  return unchanged("fallback", "No match; appearance unchanged.");
}

/** Only fields owned by this integration. Never replace the whole ring or token object. */
export function ringPatch(token, appearance, { enabled = false } = {}) {
  if (!enabled || !appearance.managed) return {};
  const patch = {};
  if (flagsOf(token).managed !== true) patch[`flags.${ID}.managed`] = true;
  if (token?.ring?.enabled !== true) patch["ring.enabled"] = true;
  if (String(token?.ring?.colors?.ring ?? "").toLowerCase() !== appearance.color.toLowerCase()) {
    patch["ring.colors.ring"] = appearance.color;
  }
  return patch;
}

/** World-actor edits reach linked copies only; a synthetic edit reaches just its token. */
export function sceneTargets(actor, scenes) {
  if (actor.isToken) return actor.token ? [actor.token] : [];
  return Array.from(scenes).flatMap(scene => Array.from(scene.tokens ?? []))
    .filter(token => token.actorLink === true && token.actorId === actor.id);
}

export function electedGM(users) {
  return Array.from(users).filter(user => user.active && user.isGM)
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)[0]?.id ?? null;
}
