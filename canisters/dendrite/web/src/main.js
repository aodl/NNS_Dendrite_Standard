import { createApplication } from "./app.js";

createApplication({
  root: document.querySelector("#app"),
  location,
  onHashChange: addEventListener,
  authSession: globalThis.__DENDRITE_AUTH_SESSION__,
}).start();
