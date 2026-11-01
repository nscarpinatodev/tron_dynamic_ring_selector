import {
  ID, CLASSIFICATIONS, PALETTE, flagsOf, validateConfig, resolve, orderedRules, isClassification
} from "./core.js";
import { createController } from "./controller.js";
import { installRing, renderingStatus } from "./renderer.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const t = key => game.i18n.localize(`TRON.${key}`);
const defaults = () => ({ palette: { ...PALETTE }, rules: [], fallback: "unchanged" });
const policy = () => validateConfig(game.settings.get(ID, "policy"));
const error = problem => {
  console.error(`${ID} |`, problem);
  ui.notifications.error(`TRON Identity Rings: ${problem.message ?? problem}`);
};

installRing({ policy, report: error });
let controller;

function choices(current, token = false) {
  const entries = token ? { inherit: "Inherit actor classification" } : { automatic: "Automatic (configured rules)" };
  Object.assign(entries, CLASSIFICATIONS, { unmanaged: "Unmanaged — leave appearance unchanged" });
  return Object.entries(entries).map(([value, label]) =>
    `<option value="${value}"${value === current ? " selected" : ""}>${escape(label)}</option>`).join("");
}

async function editClassification(document, token = false) {
  if (!document?.isOwner) return;
  try {
    const choice = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${t("Classification")} — ${document.name}` },
      content: `<div class="tron-panel"><p>${escape(renderingStatus.reason)}</p>
        <label>${t("Classification")}<select name="classification">${choices(flagsOf(document).classification ?? (token ? "inherit" : "automatic"), token)}</select></label>
        <p>${token ? "This override belongs to this token only. Unmanaged stops future TRON updates; it does not restore previous artwork." :
          "Stored as an actor flag; retained by normal duplication and compendium export/import. Synthetic actor changes affect only that token."}</p></div>`,
      ok: { label: t("Save"), callback: (_event, button) => button.form.elements.classification.value },
      rejectClose: false
    });
    if (choice == null) return;
    const valid = [token ? "inherit" : "automatic", "unmanaged"].includes(choice) || isClassification(choice);
    if (!valid) throw new Error("Invalid classification.");
    await document.update({ [`flags.${ID}.classification`]: choice });
  } catch (problem) { error(problem); }
}

async function editPolicy() {
  if (!game.user.isGM) return;
  try {
    const current = policy();
    const priorityList = orderedRules(current.rules).map(rule =>
      `<li>${escape(rule.priority)}: ${escape(rule.label)} → ${escape(CLASSIFICATIONS[rule.classification])}</li>`).join("");
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: "TRON Classification, palette and automatic rules" },
      position: { width: 760 },
      content: `<div class="tron-panel"><p>Edit the JSON configuration. Lower priority numbers match first. Equal priorities use list order.
        Matching is exact and case-sensitive. No name, biography, or disposition matching is supported.</p>
        <p>Sources: <code>ancestry.slug</code>, <code>background.slug</code> (PC embedded items), <code>traits</code> (PC/NPC).
        actorType: <code>character</code>, <code>npc</code>, or <code>any</code>.</p>
        <p>Each rule: label, priority (number), source, value (exact slug/trait), classification, actorType; optional enabled: false.
        Fallback: unchanged or a classification key. Palette keys remain stable; swap military/outland colors here.</p>
        <ol>${priorityList || "<li>No automatic rules. Use explicit classifications and reusable actor templates.</li>"}</ol>
        <textarea name="policy" rows="22" spellcheck="false" aria-label="TRON classification configuration">${escape(JSON.stringify(current, null, 2))}</textarea>
        <p>Saving rules changes future resolution. Use the bulk preview to review existing actors and tokens before applying.</p></div>`,
      ok: { label: t("Save"), callback: (_event, button) => validateConfig(JSON.parse(button.form.elements.policy.value)) },
      rejectClose: false
    });
    if (result) await game.settings.set(ID, "policy", result);
  } catch (problem) { error(problem); }
}

/** Preview is read-only. Every row must be explicitly selected before applying flags. */
async function bulkPreview() {
  if (!game.user.isGM) return;
  try {
    const proposal = await foundry.applications.api.DialogV2.prompt({
      window: { title: "TRON bulk classification — proposal" },
      content: `<div class="tron-panel"><p>Choose a proposal, then inspect its resolution for world actor templates and existing scene tokens.
        Nothing is selected or written automatically.</p><label>Proposal<select name="proposal"><option value="keep" selected>Keep classifications; preview existing resolution</option>${choices(null)}</select></label></div>`,
      ok: { label: "Preview", callback: (_event, button) => button.form.elements.proposal.value }, rejectClose: false
    });
    if (proposal == null) return;
    const rows = [];
    const config = policy();
    const proposedActor = actor => proposal === "keep" ? actor : {
      type: actor.type, system: actor.system, items: actor.items,
      flags: { ...actor.flags, [ID]: { ...flagsOf(actor), classification: proposal } }
    };
    for (const actor of game.actors) {
      if (["character", "npc"].includes(actor.type)) rows.push({ document: actor, actor, token: actor.prototypeToken,
        label: `Template: ${actor.name}` });
    }
    for (const scene of game.scenes) for (const token of scene.tokens) {
      if (["character", "npc"].includes(token.actor?.type)) rows.push({ document: token, actor: token.actor, token,
        label: `${scene.name}: ${token.name} (${token.actorLink ? "linked" : "unlinked"})` });
    }
    const html = rows.map((row, index) => {
      // Scene rows propose token overrides, not edits to a linked base actor.
      const token = row.document === row.actor || proposal === "keep" ? row.token : {
        flags: { ...row.token.flags, [ID]: { ...flagsOf(row.token), classification: proposal === "automatic" ? "inherit" : proposal } }
      };
      const actor = row.document === row.actor ? proposedActor(row.actor) : row.actor;
      const result = resolve(actor, token, config);
      const conflicts = result.matches.map(rule => `${rule.priority}: ${rule.label}`).join(", ");
      return `<tr><td><input type="checkbox" name="row-${index}" aria-label="Select ${escape(row.label)}"></td><td>${escape(row.label)}</td><td>${escape(result.classification ? CLASSIFICATIONS[result.classification] : "Unchanged")}</td><td>${escape(result.source)}${conflicts ? `: ${escape(conflicts)}` : ""}</td></tr>`;
    }).join("");
    const selected = await foundry.applications.api.DialogV2.prompt({
      window: { title: "TRON bulk classification — review" }, position: { width: 1000 },
      content: `<div class="tron-panel"><p>${escape(renderingStatus.reason)}</p><p>Proposal: ${escape(proposal)}.
        Template rows change actor flags. Scene rows change only token overrides. Automatic on a scene row means inherit its current actor.
        Linked tokens also reflect subsequent template changes. Overrides and opt-outs win over template changes.</p>
        <div class="tron-table"><table><thead><tr><th>Select</th><th>Target</th><th>Resolved</th><th>Source / matching rules</th></tr></thead><tbody>${html}</tbody></table></div></div>`,
      ok: { label: proposal === "keep" ? "Apply selected appearance" : "Save classifications for selected rows",
        callback: (_event, button) => rows.filter((_row, index) => button.form.elements[`row-${index}`].checked) },
      rejectClose: false
    });
    if (!selected?.length) return;
    if (proposal === "keep" && !renderingStatus.ready) {
      ui.notifications.warn(renderingStatus.reason); return;
    }
    for (const row of selected) {
      if (proposal !== "keep") await row.document.update({ [`flags.${ID}.classification`]:
        row.document === row.actor ? proposal : proposal === "automatic" ? "inherit" : proposal });
      else if (row.document === row.actor) await controller.syncActor(row.actor);
      else await controller.syncToken(row.token);
    }
    ui.notifications.info(`TRON: processed ${selected.length} selected targets.`);
  } catch (problem) { error(problem); }
}

Hooks.once("init", () => {
  const api = foundry.applications.api;
  class PolicyMenu extends api.ApplicationV2 { render() { void editPolicy(); return this; } }
  class BulkMenu extends api.ApplicationV2 { render() { void bulkPreview(); return this; } }
  game.settings.register(ID, "policy", { scope: "world", config: false, type: Object, default: defaults() });
  game.settings.registerMenu(ID, "policyMenu", { name: "TRON Classification and palette", label: "Configure rules and colors",
    hint: "Explicit classification wins. Automatic rules use visible numeric priority; default fallback leaves appearance unchanged.",
    icon: "fas fa-circle", type: PolicyMenu, restricted: true });
  game.settings.registerMenu(ID, "bulkMenu", { name: "TRON bulk classification", label: "Preview and apply",
    hint: "Review and explicitly select templates or scene tokens. No activation-time world migration.",
    icon: "fas fa-list-check", type: BulkMenu, restricted: true });
  for (const [key, name, type, value, range] of [
    ["animation", "TRON illumination animation", Boolean, true],
    ["period", "TRON pulse cycle in seconds", Number, 3, { min: 1, max: 12, step: 0.1 }],
    ["intensity", "TRON pulse depth", Number, 0.45, { min: 0, max: 1, step: 0.05 }]
  ]) game.settings.register(ID, key, { name, scope: "world", config: true, type, default: value, ...(range ? { range } : {}) });
});

Hooks.once("ready", () => {
  if (game.system.id !== "sf2e" || game.system.version !== "1.6.1" || game.release.generation !== 14) {
    ui.notifications.warn("TRON Identity Rings targets Foundry v14 / sf2e 1.6.1 only. Integration disabled."); return;
  }
  controller = createController({ game, config: policy, renderReady: () => renderingStatus.ready, onError: error });
  game.modules.get(ID).api = Object.freeze({
    editActor: actor => editClassification(actor), editToken: token => editClassification(token, true),
    bulkPreview, resolve: (actor, token) => resolve(actor, token, policy()), renderingStatus
  });
  if (game.user.isGM && !renderingStatus.ready) ui.notifications.info(renderingStatus.reason);
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if (!sheet.actor?.isOwner || !["character", "npc"].includes(sheet.actor.type)) return;
    buttons.unshift({ label: t("Classification"), class: "tron-classification", icon: "fas fa-circle",
      onclick: () => editClassification(sheet.actor) });
  });
  Hooks.on("getHeaderControlsActorSheetV2", (sheet, controls) => {
    if (!sheet.actor?.isOwner || !["character", "npc"].includes(sheet.actor.type)) return;
    controls.push({ label: t("Classification"), icon: "fas fa-circle", action: "tron-classification",
      onClick: () => editClassification(sheet.actor) });
  });
  Hooks.on("getHeaderControlsTokenConfig", (sheet, controls) => {
    if (!sheet.document?.isOwner) return;
    controls.push({ label: t("TokenOverride"), icon: "fas fa-circle", action: "tron-override",
      onClick: () => editClassification(sheet.document, true) });
  });
  Hooks.on("preCreateToken", token => { try { controller.preCreateToken(token); } catch (problem) { error(problem); } });
  Hooks.on("createActor", actor => { void controller.syncActor(actor).catch(error); });
  Hooks.on("updateActor", (actor, change, options) => {
    if (!controller.internal(options) && Object.keys(change).some(key =>
      key === "system" || key.startsWith("system.") || key === "flags" || key.startsWith(`flags.${ID}`))) {
      void controller.syncActor(actor).catch(error);
    }
  });
  Hooks.on("updateToken", (token, change, options) => {
    if (!controller.internal(options) && Object.keys(change).some(key =>
      ["flags", "actorLink", "actorId", "delta"].includes(key) || key.startsWith(`flags.${ID}`) || key.startsWith("delta."))) {
      void controller.syncToken(token).catch(error);
    }
  });
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, item => {
    if (item.parent?.documentName === "Actor") void controller.syncActor(item.parent).catch(error);
  });
});
