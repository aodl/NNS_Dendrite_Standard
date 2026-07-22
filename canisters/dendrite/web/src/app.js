import { parseNeuronId, formatNeuronId } from "./ids.js";
import { clear, element, safeHttpsLink } from "./dom.js";
import { createAnonymousActor } from "./actor.js";
import { errorMessage, renderReport } from "./compliance-view.js";
import { checkLive } from "./live-check.js";
import { createBrowserAuthSession } from "./auth.js";
import { renderManagerAuthority } from "./authority.js";
import { createAuthenticatedNnsActor } from "./nns-actor.js";
import { renderControlPanel } from "./control-panel.js";

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

const MAX_AUTHENTICATION_ERROR_LENGTH = 512;

export function boundedAuthenticationError(error, fallback) {
  const message = error instanceof Error ? error.message : fallback;
  return String(message || fallback).slice(0, MAX_AUTHENTICATION_ERROR_LENGTH);
}

export function createApplication({
  root,
  location,
  onHashChange,
  actorFactory = createAnonymousActor,
  nnsActorFactory = createAuthenticatedNnsActor,
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
  let authenticatedSession;
  let authenticatedNnsActor;
  const permanentAuthenticationError = browserAuth.originError
    ? boundedAuthenticationError(browserAuth.originError, "Internet Identity origin configuration is invalid.")
    : undefined;
  let recoverableAuthenticationError;
  let currentReport;
  let currentNeuronId;
  let cancelPendingTransaction;
  async function activateAuthenticatedSession(session) {
    // Compatibility for injected read-only test sessions; production auth always
    // returns the private { principal, signingIdentity } object.
    const principal = session?.principal ?? session;
    if (!principal?.toText) throw new Error("Internet Identity returned a malformed session.");
    const nextActor = session?.signingIdentity
      ? await nnsActorFactory(session.signingIdentity)
      : undefined;
    authenticatedPrincipal = principal;
    authenticatedSession = session?.signingIdentity ? session : undefined;
    authenticatedNnsActor = nextActor;
  }
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
    if (permanentAuthenticationError) {
      panel.append(element("p", permanentAuthenticationError, "error"));
      return panel;
    }
    if (recoverableAuthenticationError) {
      panel.append(element("p", recoverableAuthenticationError, "error"));
    }
    if (!authenticatedPrincipal) {
      const signIn = element(
        "button",
        recoverableAuthenticationError ? "Try again" : "Sign in with Internet Identity",
      );
      signIn.addEventListener("click", async () => {
        try {
          await activateAuthenticatedSession(await browserAuth.signIn());
          recoverableAuthenticationError = undefined;
        } catch (error) {
          recoverableAuthenticationError = boundedAuthenticationError(
            error,
            "Internet Identity sign-in failed.",
          );
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
      cancelPendingTransaction?.();
      cancelPendingTransaction = undefined;
      authenticatedNnsActor = undefined;
      try {
        await browserAuth.signOut();
        authenticatedPrincipal = undefined;
        authenticatedSession = undefined;
        recoverableAuthenticationError = undefined;
      } catch (error) {
        recoverableAuthenticationError = boundedAuthenticationError(
          error,
          "Internet Identity sign-out failed.",
        );
      }
      renderCurrent();
    });
    panel.append(copy, signOut);
    return panel;
  }

  function appendReportActions(id) {
    root.append(authenticationPanel());
    if (authenticatedPrincipal && currentReport) {
      renderManagerAuthority(root, currentReport, authenticatedPrincipal);
      if (authenticatedSession && authenticatedNnsActor) cancelPendingTransaction = renderControlPanel(root, {
        report: currentReport,
        session: authenticatedSession,
        nnsActor: authenticatedNnsActor,
        checkNeuron: async (targetId) => checkLive(await actor(), targetId.toString()),
        onSuccess: async () => loadNeuron(id),
      });
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
    cancelPendingTransaction?.();
    cancelPendingTransaction = undefined;
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
      if (!permanentAuthenticationError) {
        try {
          const restored = await browserAuth.restore();
          if (restored) await activateAuthenticatedSession(restored);
          recoverableAuthenticationError = undefined;
        } catch (error) {
          recoverableAuthenticationError = boundedAuthenticationError(
            error,
            "Stored Internet Identity session is unavailable.",
          );
        }
      }
      return route();
    },
  };
}
