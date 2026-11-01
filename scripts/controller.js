import { ID, resolve, ringPatch, sceneTargets, electedGM } from "./core.js";

/** Serializes the elected GM's writes and reads current policy when each task runs. */
export function createController({ game, config, renderReady, onError = console.error }) {
  let queue = Promise.resolve();
  const isWriter = () => game.user?.id === electedGM(game.users);
  const options = () => ({ [ID]: { internal: true } });
  const patchFor = (actor, token) => ringPatch(token, resolve(actor, token, config()), { enabled: renderReady() });
  const enqueue = work => {
    const next = queue.then(async () => { if (isWriter()) await work(); });
    queue = next.catch(onError);
    return next;
  };
  async function syncToken(token) {
    if (!isWriter() || !token.actor) return;
    const patch = patchFor(token.actor, token);
    if (Object.keys(patch).length) await token.update(patch, options());
  }
  async function syncActor(actor) {
    if (!isWriter()) return;
    if (!actor.isToken && actor.prototypeToken) {
      const patch = patchFor(actor, actor.prototypeToken);
      if (Object.keys(patch).length) await actor.update(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [`prototypeToken.${key}`, value])), options());
    }
    for (const token of sceneTargets(actor, game.scenes)) await syncToken(token);
  }
  return {
    isWriter,
    internal: options => options?.[ID]?.internal === true,
    syncActor: actor => enqueue(() => syncActor(actor)),
    syncToken: token => enqueue(() => syncToken(token)),
    preCreateToken: token => {
      // preCreate is synchronous and local to the creation request, including player requests.
      if (!token.actor) return;
      const patch = patchFor(token.actor, token);
      if (Object.keys(patch).length) token.updateSource(patch);
    },
    async bulk(actors, tokens) {
      return enqueue(async () => {
        for (const actor of actors) await syncActor(actor);
        for (const token of tokens) await syncToken(token);
      });
    }
  };
}
