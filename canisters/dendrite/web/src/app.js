import { parseNeuronId, formatNeuronId } from "./ids.js";
import { clear, element, safeHttpsLink } from "./dom.js";
import { createAnonymousActor } from "./actor.js";
import { errorMessage, renderReport } from "./compliance-view.js";
import { checkLive } from "./live-check.js";

function resources() {
  const node = document.createElement("p");
  node.append(
    safeHttpsLink("Standard", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/standard/NNS_DENDRITE_STANDARD.md"),
    document.createTextNode(" · "),
    safeHttpsLink("Source", "https://github.com/aodl/NNS_Dendrite_Standard"),
    document.createTextNode(" · "),
    safeHttpsLink("Reproducible builds", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/development/reproducible-builds.md"),
    document.createTextNode(" · "),
    safeHttpsLink("Security model", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/security/threat-model.md"),
  );
  return node;
}

function showError(root, message) {
  const box = element("div", message, "error");
  box.tabIndex = -1;
  root.append(box);
  box.focus();
}

export function createApplication({
  root,
  location,
  onHashChange,
  actorFactory = createAnonymousActor,
}) {
  let actorPromise;
  const actor = () => {
    if (actorPromise) return actorPromise;
    let pending;
    try {
      pending = Promise.resolve(actorFactory());
    } catch (error) {
      pending = Promise.reject(error);
    }
    actorPromise = pending;
    pending.catch(() => {
      if (actorPromise === pending) actorPromise = undefined;
    });
    return pending;
  };

  function landing() {
    clear(root);
    root.append(
      element("h1", "Dendrite"),
      element("p", "Run a live consensus-backed verification of an NNS Dendrite neuron. Dendrite stores no result, identity, proposal, or history."),
    );
    const form = document.createElement("form");
    const label = element("label", "NNS neuron ID ");
    const input = document.createElement("input");
    const button = element("button", "Check neuron");
    input.name = "neuron";
    input.inputMode = "numeric";
    input.required = true;
    label.append(input);
    form.append(label, button);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      input.setCustomValidity("");
      try {
        location.hash = `#/neuron/${formatNeuronId(parseNeuronId(input.value))}`;
      } catch (error) {
        input.setCustomValidity(error.message);
        input.reportValidity();
      }
    });
    root.append(
      form,
      element("p", "Committed topics use selected managers; all other topics follow alpha-vote, while committed delegates follow omega-reject exactly."),
      resources(),
    );
  }

  async function loadNeuron(id) {
    clear(root);
    root.setAttribute("aria-busy", "true");
    root.append(element("h1", `Neuron ${id}`), element("div", "Running live verification…", "status"));
    try {
      renderReport(root, await checkLive(await actor(), id));
      const again = element("button", "Check again");
      again.addEventListener("click", () => loadNeuron(id));
      root.append(again, resources());
    } catch (error) {
      clear(root);
      root.append(element("h1", `Neuron ${id}`));
      showError(root, errorMessage(error));
      const retry = element("button", "Check again");
      retry.addEventListener("click", () => loadNeuron(id));
      root.append(retry, resources());
    } finally {
      root.removeAttribute("aria-busy");
    }
  }

  function route() {
    const match = /^#\/neuron\/([1-9][0-9]*)$/.exec(location.hash);
    if (!match) return landing();
    try {
      return loadNeuron(formatNeuronId(parseNeuronId(match[1])));
    } catch {
      return landing();
    }
  }

  return {
    landing,
    loadNeuron,
    route,
    start() {
      onHashChange("hashchange", route);
      return route();
    },
  };
}
