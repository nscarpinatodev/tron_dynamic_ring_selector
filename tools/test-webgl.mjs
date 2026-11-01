/** Local Chromium/CDP test using Node's built-in WebSocket, no npm dependency. */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const profile = await mkdtemp(`${tmpdir()}/tron-webgl-`);
await rm(resolve(root, "docs/webgl-results.json"), { force: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = createServer(async (request, response) => {
  try {
    const filename = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!filename.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
    const data = await readFile(filename);
    const type = filename.endsWith(".js") ? "text/javascript" : filename.endsWith(".png") ? "image/png" : "text/html";
    response.writeHead(200, { "Content-Type": type }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const child = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage",
  "--disable-background-networking", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
{ stdio: "ignore" });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(`${profile}/DevToolsActivePort`, "utf8")).split("\n")[0]); break; }
    catch { await delay(100); }
  }
  if (!port) throw Error("Chromium did not expose its local debugging port.");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find(page => page.type === "page");
  if (!page) throw Error("Chromium created no page target.");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(Error(JSON.stringify(message.error))); else resolve(message.result);
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await call("Page.enable");
  await call("Runtime.enable");
  const navigation = await call("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/tools/webgl-test.html` });
  if (navigation.errorText) throw Error(`Navigation failed: ${navigation.errorText}`);
  let report;
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(500);
    const response = await call("Runtime.evaluate", { expression: "document.querySelector('#result')?.textContent", returnByValue: true });
    const text = response.result?.value;
    if (typeof text === "string" && text.startsWith("{")) { report = JSON.parse(text); break; }
  }
  if (!report) {
    const diagnostic = await call("Runtime.evaluate", { expression: "JSON.stringify({location:location.href,state:document.readyState,text:document.body?.innerText.slice(0,1000)})", returnByValue: true });
    throw Error(`WebGL test did not complete: ${diagnostic.result?.value}`);
  }
  report.testedAt = new Date().toISOString();
  report.browser = (await call("Browser.getVersion")).product;
  report.shaderSha256 = createHash("sha256").update(await readFile(resolve(root, "scripts/shader.js"))).digest("hex");
  report.atlasSha256 = createHash("sha256").update(await readFile(resolve(root, "assets/tron-ring.png"))).digest("hex");
  console.log(JSON.stringify(report, null, 2));
  await writeFile(resolve(root, "docs/webgl-results.json"), JSON.stringify(report, null, 2) + "\n");
  if (report.status !== "PASS") process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  socket?.close(); child.kill("SIGTERM"); server.closeAllConnections(); server.close();
  await delay(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
