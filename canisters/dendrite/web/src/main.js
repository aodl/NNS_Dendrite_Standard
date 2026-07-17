import { parseNeuronId, formatNeuronId } from "./ids.js";
import { clear, element } from "./dom.js";

const app = document.querySelector("#app");
function landing() {
  clear(app); app.append(element("h1", "Dendrite"), element("p", "Verify quorum-managed, blackholed-controller NNS known neurons. Dendrite never custodies keys, ICP, neurons, rewards, or proposal history."));
  const form = document.createElement("form"), label = element("label", "NNS neuron ID "), input = document.createElement("input"), button = element("button", "Inspect");
  input.name = "neuron"; input.inputMode = "numeric"; input.required = true; label.append(input); form.append(label, button);
  form.addEventListener("submit", (event) => { event.preventDefault(); try { location.hash = `#/neuron/${formatNeuronId(parseNeuronId(input.value))}`; } catch (error) { input.setCustomValidity(error.message); input.reportValidity(); } });
  app.append(form, element("p", "Committed topics use selected managers; every other topic falls back exactly to alpha-vote, while delegates prove omega-reject liveness."));
}
function neuron(id) { clear(app); app.append(element("h1", `Neuron ${id}`), element("p", "Live compliance evidence is loaded from the Dendrite canister. Cached observations always retain their exact timestamp and stale boundary."), element("div", "Loading…", "status")); }
function route() { const match = /^#\/neuron\/([1-9][0-9]*)$/.exec(location.hash); if (!match) return landing(); try { neuron(formatNeuronId(parseNeuronId(match[1]))); } catch { landing(); } }
addEventListener("hashchange", route); route();

