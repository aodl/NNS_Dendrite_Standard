import { parseNeuronId, formatNeuronId } from "./ids.js";
import { clear, element, safeHttpsLink } from "./dom.js";
import { createAnonymousActor } from "./actor.js";
import { errorMessage, renderReport } from "./compliance-view.js";
import { checkLive } from "./live-check.js";
import { createBrowserAuthSession } from "./auth.js";
import { renderManagerAuthority } from "./authority.js";

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
  authSession,
  copyText = (value) => globalThis.navigator.clipboard.writeText(value),
}) {
  let browserAuth;
  try {
    browserAuth = authSession ?? createBrowserAuthSession();
  } catch (error) {
    browserAuth = {
      configuration: { derivationOrigin: "Unavailable" },
      originError: error,
      restore: async () => null,
    };
  }
  let actorPromise;
  let authenticatedPrincipal;
  let authenticationError = browserAuth.originError?.message;
  let currentReport;
  let currentNeuronId;
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

  function authenticationPanel() {
    const panel = document.createElement("section");
    panel.className = "authentication";
    panel.append(
      element("h2", "Internet Identity"),
      element("p", `Canonical derivation origin: ${browserAuth.configuration.derivationOrigin}`),
    );
    if (authenticationError) {
      panel.append(element("p", authenticationError, "error"));
      return panel;
    }
    if (!authenticatedPrincipal) {
      const signIn = element("button", "Sign in with Internet Identity");
      signIn.addEventListener("click", async () => {
        try {
          authenticatedPrincipal = await browserAuth.signIn();
          authenticationError = undefined;
        } catch (error) {
          authenticationError = error instanceof Error ? error.message : "Internet Identity sign-in failed.";
        }
        renderCurrent();
      });
      panel.append(signIn, element("p", "Signed out. No manager authority is claimed."));
      return panel;
    }
    const principalText = authenticatedPrincipal.toText();
    panel.append(element("p", `Dendrite principal: ${principalText}`));
    const copy = element("button", "Copy principal");
    copy.addEventListener("click", () => copyText(principalText));
    const signOut = element("button", "Sign out");
    signOut.addEventListener("click", async () => {
      try { await browserAuth.signOut(); } finally {
        authenticatedPrincipal = undefined;
        authenticationError = undefined;
        renderCurrent();
      }
    });
    panel.append(copy, signOut);
    return panel;
  }

  function appendReportActions(id) {
    root.append(authenticationPanel());
    if (authenticatedPrincipal && currentReport) {
      renderManagerAuthority(root, currentReport, authenticatedPrincipal);
    }
    const again = element("button", "Check again");
    again.addEventListener("click", () => loadNeuron(id));
    root.append(again, resources());
  }

  function renderCurrent() {
    if (currentReport && currentNeuronId) {
      renderReport(root, currentReport);
      appendReportActions(currentNeuronId);
    } else {
      landing();
    }
  }

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
      authenticationPanel(),
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
      currentReport = await checkLive(await actor(), id);
      currentNeuronId = id;
      renderReport(root, currentReport);
      appendReportActions(id);
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
    async start() {
      onHashChange("hashchange", route);
      const routed = route();
      try {
        authenticatedPrincipal = await browserAuth.restore();
        authenticationError = undefined;
      } catch (error) {
        authenticationError = error instanceof Error ? error.message : "Stored Internet Identity session is unavailable.";
      }
      if (!currentReport) landing();
      return routed;
    },
  };
}
