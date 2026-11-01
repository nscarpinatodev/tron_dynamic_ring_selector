import { test } from "node:test";
import assert from "node:assert/strict";
import { ID, PALETTE, CLASSIFICATIONS, resolve, validateConfig, ringPatch, structuredValues,
  sceneTargets, electedGM } from "../scripts/core.js";
import { createController } from "../scripts/controller.js";

const config = (overrides = {}) => ({ palette: { ...PALETTE }, rules: [], fallback: "unchanged", ...overrides });
const actor = (classification = "automatic", extra = {}) => ({
  id: "base", type: "character", flags: { [ID]: { classification } }, system: { traits: { value: ["android"] } },
  items: [{ type: "ancestry", system: { slug: "android" } }, { type: "background", system: { slug: "hacker" } }], ...extra
});
const token = (classification = "inherit", extra = {}) => ({ flags: { [ID]: { classification } },
  ring: { enabled: false, colors: { ring: null, background: "#101010" }, effects: 17,
    subject: { texture: "portrait.webp", scale: 1 } }, ...extra });
const rule = (classification = "search", priority = 1, extra = {}) => ({
  label: `${classification} rule`, source: "background.slug", value: "hacker", classification, priority, actorType: "any", ...extra
});

test("eight classifications have independently configurable colors", () => {
  assert.equal(Object.keys(CLASSIFICATIONS).length, 8);
  for (const classification of Object.keys(CLASSIFICATIONS)) {
    assert.equal(resolve(actor(classification), token(), config()).color, PALETTE[classification]);
  }
  const swapped = config({ palette: { ...PALETTE, military: PALETTE.outland, outland: PALETTE.military } });
  assert.equal(resolve(actor("military"), token(), swapped).color, PALETTE.outland);
});
test("explicit token classification wins even over actor opt-out", () => {
  assert.equal(resolve(actor("unmanaged"), token("iso"), config()).classification, "iso");
});
test("explicit actor classification wins over matching rules and fallback", () => {
  const result = resolve(actor("protector"), token(), config({ rules: [rule()], fallback: "loyalist" }));
  assert.equal(result.classification, "protector"); assert.equal(result.source, "actor");
});
test("token opt-out wins over actor selection and rules", () => {
  assert.equal(resolve(actor("iso"), token("unmanaged"), config({ rules: [rule()] })).managed, false);
});
test("actor opt-out blocks automatic rules and fallback", () => {
  assert.equal(resolve(actor("unmanaged"), token(), config({ rules: [rule()], fallback: "iso" })).managed, false);
});
test("first match uses visible numeric priority, retaining conflicts", () => {
  const result = resolve(actor(), token(), config({ rules: [rule("loyalist", 90), rule("search", -5)] }));
  assert.equal(result.classification, "search"); assert.equal(result.matches.length, 2);
  assert.equal(result.matches[0].priority, -5);
});
test("equal priority uses configured list order", () => {
  assert.equal(resolve(actor(), token(), config({ rules: [rule("iso"), rule()] })).classification, "iso");
});
test("disabled rule does not match", () => {
  assert.equal(resolve(actor(), token(), config({ rules: [rule("iso", 0, { enabled: false }), rule()] })).classification, "search");
});
test("default unmatched and unknown future flags leave appearance unchanged", () => {
  assert.equal(resolve(actor(), token(), config()).managed, false);
  assert.equal(resolve(actor("unknown"), token(), config({ fallback: "iso" })).managed, false);
  assert.equal(resolve(actor("iso"), token("unknown"), config()).managed, false);
});
test("configured fallback applies only after rules", () => {
  assert.equal(resolve(actor(), token(), config({ fallback: "iso" })).source, "fallback");
  assert.equal(resolve(actor(), token(), config({ fallback: "iso", rules: [rule()] })).source, "rule");
});
test("exact structured matching has no name, biography or disposition inference", () => {
  const sample = actor("automatic", { name: "hacker", biography: "hacker", disposition: -1, items: [] });
  assert.equal(resolve(sample, token(), config({ rules: [rule()] })).managed, false);
  assert.equal(resolve(actor(), token(), config({ rules: [rule("iso", 0, { value: "Hacker" })] })).managed, false);
  assert.deepEqual(structuredValues(actor("automatic", { items: [{ type: "background", name: "hacker", system: { slug: null } }] }), "background.slug"), []);
});
test("NPC traits work without claiming NPCs have PC background items", () => {
  const npc = actor("automatic", { type: "npc" });
  assert.deepEqual(structuredValues(npc, "background.slug"), []);
  assert.equal(resolve(npc, token(), config({ rules: [rule("iso", 0, { source: "traits", value: "android", actorType: "npc" })] })).classification, "iso");
  assert.equal(resolve(actor(), token(), config({ rules: [rule("iso", 0, { source: "traits", value: "android", actorType: "npc" })] })).managed, false);
});
test("unsupported actor types are never managed", () => {
  assert.equal(resolve(actor("iso", { type: "vehicle" }), token("protector"), config()).managed, false);
});
test("normal JSON duplication and export/import retain classification flags", () => {
  const copy = JSON.parse(JSON.stringify(actor("iso")));
  assert.equal(resolve(copy, token(), config()).classification, "iso");
  assert.equal(copy.flags[ID].classification, "iso");
});
test("invalid configuration cannot enable arbitrary path matching", () => {
  for (const bad of [config({ rules: {} }), config({ fallback: "bogus" }),
    config({ palette: { ...PALETTE, iso: "white" } }),
    config({ rules: [rule("iso", 1, { source: "system.details.biography" })] }),
    config({ rules: [rule("iso", "1")] }), config({ rules: [rule("bogus")] })]) {
    assert.throws(() => validateConfig(bad));
  }
  assert.equal(validateConfig(config()).fallback, "unchanged");
});
test("ring patch changes only enable and ring color, preserving portrait, background and effects", () => {
  const source = token(); const before = structuredClone(source);
  const result = ringPatch(source, resolve(actor("iso"), source, config()), { enabled: true });
  assert.deepEqual(result, { [`flags.${ID}.managed`]: true, "ring.enabled": true, "ring.colors.ring": "#ffffff" });
  assert.deepEqual(source, before);
});
test("ring patch is idempotent and gated on rendering readiness", () => {
  const appearance = resolve(actor("iso"), token(), config());
  const source = token(); source.ring.enabled = true; source.ring.colors.ring = "#FFFFFF";
  source.flags[ID].managed = true;
  assert.deepEqual(ringPatch(source, appearance, { enabled: true }), {});
  assert.deepEqual(ringPatch(token(), appearance), {});
  assert.deepEqual(ringPatch(token(), { managed: false }, { enabled: true }), {});
});
test("world actor targets include linked tokens across scenes only", () => {
  const linked = { actorId: "base", actorLink: true };
  const unlinked = { actorId: "base", actorLink: false };
  const other = { actorId: "other", actorLink: true };
  assert.deepEqual(sceneTargets(actor(), [{ tokens: [linked, unlinked] }, { tokens: [other] }]), [linked]);
});
test("synthetic actor targets only its own token", () => {
  const own = token();
  assert.deepEqual(sceneTargets(actor("iso", { isToken: true, token: own }), [{ tokens: [token()] }]), [own]);
});
test("writer election is deterministic across clients and excludes offline GMs", () => {
  const users = [{ id: "z", active: true, isGM: true }, { id: "a", active: true, isGM: true },
    { id: "0", active: false, isGM: true }, { id: "1", active: true, isGM: false }];
  assert.equal(electedGM(users), "a"); assert.equal(electedGM(users.toReversed()), "a");
  assert.equal(electedGM([]), null);
});

function setPath(object, path, value) {
  const keys = path.split("."); const last = keys.pop();
  let at = object; for (const key of keys) at = at[key] ??= {};
  at[last] = value;
}
function fixture({ ready = true } = {}) {
  const writes = []; const sample = actor("iso"); sample.prototypeToken = token();
  sample.update = async (patch, options) => { writes.push({ target: "actor", patch, options });
    for (const [path, value] of Object.entries(patch)) setPath(sample, path, value); };
  const make = (name, link, choice = "inherit") => {
    const value = token(choice, { actor: sample, actorId: sample.id, actorLink: link });
    value.update = async (patch, options) => { writes.push({ target: name, patch, options });
      for (const [path, val] of Object.entries(patch)) setPath(value, path, val); };
    return value;
  };
  const linked = make("linked", true); const overridden = make("override", true, "search");
  const optedOut = make("opt-out", true, "unmanaged"); const unlinked = make("unlinked", false);
  const game = { user: { id: "a" }, users: [{ id: "a", isGM: true, active: true }, { id: "b", isGM: true, active: true }],
    scenes: [{ tokens: [linked, overridden, optedOut, unlinked] }] };
  const controller = createController({ game, config: () => config(), renderReady: () => ready });
  return { game, sample, linked, overridden, optedOut, unlinked, writes, controller };
}
test("actor synchronization updates prototype and linked copies while respecting overrides and opt-out", async () => {
  const f = fixture(); await f.controller.syncActor(f.sample);
  assert.deepEqual(f.writes.map(w => w.target), ["actor", "linked", "override"]);
  assert.equal(f.linked.ring.colors.ring, PALETTE.iso);
  assert.equal(f.overridden.ring.colors.ring, PALETTE.search);
  assert.equal(f.unlinked.ring.enabled, false); assert.equal(f.optedOut.ring.enabled, false);
  assert.equal(f.linked.ring.subject.texture, "portrait.webp"); assert.equal(f.linked.ring.effects, 17);
  await f.controller.syncActor(f.sample); assert.equal(f.writes.length, 3);
  f.sample.flags[ID].classification = "loyalist";
  await f.controller.syncActor(f.sample);
  assert.equal(f.linked.ring.colors.ring, PALETTE.loyalist);
  assert.equal(f.overridden.ring.colors.ring, PALETTE.search);
  assert.equal(f.writes.length, 5);
});
test("synthetic actor change writes one scene token and no base prototype", async () => {
  const f = fixture(); const synthetic = actor("corrupted", { isToken: true, token: f.unlinked });
  f.unlinked.actor = synthetic; await f.controller.syncActor(synthetic);
  assert.deepEqual(f.writes.map(w => w.target), ["unlinked"]);
  assert.equal(f.unlinked.ring.colors.ring, PALETTE.corrupted);
  assert.equal(f.sample.prototypeToken.ring.enabled, false);
});
test("new token applies resolved ring in its source, without document update writes", () => {
  const f = fixture(); const created = token("military", { actor: f.sample }); const changes = [];
  created.updateSource = patch => changes.push(patch);
  f.controller.preCreateToken(created);
  assert.deepEqual(changes, [{ [`flags.${ID}.managed`]: true, "ring.enabled": true, "ring.colors.ring": PALETTE.military }]);
  assert.equal(f.writes.length, 0);
});
test("non-elected connected GM produces no duplicate writes", async () => {
  const f = fixture(); const second = createController({ game: { ...f.game, user: { id: "b" } },
    config: () => config(), renderReady: () => true });
  await Promise.all([f.controller.syncActor(f.sample), second.syncActor(f.sample)]);
  assert.equal(f.writes.length, 3);
  assert.equal(f.controller.internal(f.writes[0].options), true);
});
test("serialized concurrent requests are idempotent", async () => {
  const f = fixture(); await Promise.all([f.controller.syncActor(f.sample), f.controller.syncActor(f.sample), f.controller.syncToken(f.linked)]);
  assert.equal(f.writes.length, 3);
});
test("inactive or incompatible renderer refuses all appearance writes while allowing policy to resolve", async () => {
  const f = fixture({ ready: false }); await f.controller.syncActor(f.sample);
  f.linked.updateSource = () => assert.fail("must not mutate source before renderer ready");
  f.controller.preCreateToken(f.linked); assert.equal(f.writes.length, 0);
});
