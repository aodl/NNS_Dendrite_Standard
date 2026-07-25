import { parseNeuronId, formatNeuronId } from "./ids.js";
import { clear, element, safeHttpsLink } from "./dom.js";
import { createAnonymousActor } from "./actor.js";
import { errorMessage, renderReport } from "./compliance-view.js";
import { checkLive } from "./live-check.js";
import { createBrowserAuthSession } from "./auth.js";
import { renderManagerAuthority } from "./authority.js";
import { createAuthenticatedNnsActor } from "./nns-actor.js";
import { renderControlPanel } from "./control-panel.js";
import { createTransactionPipeline } from "./transaction.js";

function resources() {
  const node = document.createElement("p");
  node.append(
    safeHttpsLink("Standard", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/standard/NNS_DENDRITE_STANDARD.md"),
    document.createTextNode(" · "),
    safeHttpsLink("Source", "https://github.com/aodl/NNS_Dendrite_Standard"),
    document.createTextNode(" · "),
    safeHttpsLink("Reproducible builds", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/operations/reproducible-builds.md"),
    document.createTextNode(" · "),
    safeHttpsLink("Security model", "https://github.com/aodl/NNS_Dendrite_Standard/blob/main/docs/security.md"),
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
const MAX_RECEIPT_OPERATION_LENGTH = 256;
const MAX_RECEIPT_MESSAGE_LENGTH = 512;
const boundedReceiptField = (value, maximum) => String(value ?? "").slice(0, maximum);

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
  let authenticationTransition = "none";
  const permanentAuthenticationError = browserAuth.originError
    ? boundedAuthenticationError(browserAuth.originError, "Internet Identity origin configuration is invalid.")
    : undefined;
  let recoverableAuthenticationError;
  let currentReport;
  let currentNeuronId;
  let currentView = "unselected";
  let routeGeneration = 0;
  let currentTransactionReceipt;
  let currentTransactionNotices;

  function transactionNotices() {
    const notices = document.createElement("section");
    notices.className = "transaction-notices";
    if (currentTransactionReceipt) {
      const receipt = currentTransactionReceipt;
      const known = document.createElement("section");
      known.className = receipt.kind === "Success" ? "status" : "error";
      known.append(
        element("h2", "Current transaction receipt"),
        element("p", `Operation: ${boundedReceiptField(receipt.operation, MAX_RECEIPT_OPERATION_LENGTH)}.`),
      );
      if (receipt.kind === "Success") {
        known.append(
          element("p", `Dendrite context neuron: ${boundedReceiptField(receipt.dendriteContextNeuronId, 20)}. Mutation or managed neuron: ${boundedReceiptField(receipt.mutationOrManagedNeuronId, 20)}.`),
          element("p", `Request SHA-256: ${boundedReceiptField(receipt.requestDigest, 64)}.`),
        );
        if (receipt.proposalId !== undefined) {
          known.append(
            element("p", `Proposal ID: ${boundedReceiptField(receipt.proposalId, 20)}.`),
            safeHttpsLink("View proposal on the Internet Computer dashboard", `https://dashboard.internetcomputer.org/proposal/${receipt.proposalId}`),
            element("p", "Proposal creation is not adoption or execution. Dendrite does not poll for either."),
          );
        }
        known.append(element("p", "A fresh Dendrite report is authoritative for the resulting neuron state."));
      } else if (receipt.kind === "GovernanceRejection") {
        known.append(
          element("p", `Request SHA-256: ${boundedReceiptField(receipt.requestDigest, 64)}.`),
          element("p", `Governance rejection: ${boundedReceiptField(receipt.message, MAX_RECEIPT_MESSAGE_LENGTH)}`),
          element("p", "Governance returned a known rejection; this is not an ambiguous transaction result."),
        );
      } else {
        known.append(
          element("p", `Reason: ${boundedReceiptField(receipt.message, MAX_RECEIPT_MESSAGE_LENGTH)}`),
          element("p", "Final preflight failed. No NNS update call was made."),
        );
      }
      known.append(element("p", `Browser timestamp (display only): ${new Date(receipt.timestampMilliseconds).toISOString()}.`));
      const dismiss = element("button", "Dismiss transaction receipt");
      dismiss.type = "button";
      dismiss.addEventListener("click", () => {
        currentTransactionReceipt = undefined;
        refreshTransactionNotices();
      });
      known.append(dismiss);
      notices.append(known);
    }
    if (transactionPipeline.state === "outcome-unknown") {
      const summary = transactionPipeline.outcomeUnknown;
      notices.append(
        element("h2", "Unresolved NNS transaction outcome", "error"),
        element("p", `Operation: ${boundedReceiptField(summary.operation, MAX_RECEIPT_OPERATION_LENGTH)}. Dendrite context neuron: ${boundedReceiptField(summary.dendriteContextNeuronId, 20)}. Mutation or managed neuron: ${boundedReceiptField(summary.mutationOrManagedNeuronId, 20)}.`, "error"),
        element("p", `Request SHA-256: ${boundedReceiptField(summary.requestDigest, 64)}. The prior operation may have succeeded. A full browser reload loses this heap-only marker.`, "error"),
      );
    }
    return notices;
  }

  function appendTransactionNotices() {
    currentTransactionNotices = transactionNotices();
    root.append(currentTransactionNotices);
  }

  function refreshTransactionNotices() {
    if (!currentTransactionNotices) return;
    const replacement = transactionNotices();
    currentTransactionNotices.replaceChildren(...replacement.children);
  }
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
  const transactionPipeline = createTransactionPipeline({
    getSession: async () => {
      if (authenticationTransition !== "none") throw new Error("Authentication is changing; create a new review after it completes.");
      return authenticatedSession;
    },
    getNnsActor: async () => {
      if (authenticationTransition !== "none") throw new Error("Authentication is changing; NNS access is unavailable.");
      if (!authenticatedNnsActor) throw new Error("A current authenticated NNS actor is required.");
      return authenticatedNnsActor;
    },
    checkNeuron: async (targetId) => checkLive(await actor(), targetId.toString()),
  });

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
    if (authenticationTransition !== "none") {
      panel.append(element("p", authenticationTransition === "signing-in" ? "Internet Identity sign-in is in progress…" : "Internet Identity sign-out is in progress…", "status"));
      return panel;
    }
    if (!authenticatedPrincipal) {
      const signIn = element(
        "button",
        recoverableAuthenticationError ? "Try again" : "Sign in with Internet Identity",
      );
      signIn.addEventListener("click", async () => {
        if (authenticationTransition !== "none") {
          recoverableAuthenticationError = "Another authentication transition is already in progress.";
          renderCurrent();
          return;
        }
        authenticationTransition = "signing-in";
        renderCurrent();
        try {
          await activateAuthenticatedSession(await browserAuth.signIn());
          recoverableAuthenticationError = undefined;
        } catch (error) {
          recoverableAuthenticationError = boundedAuthenticationError(
            error,
            "Internet Identity sign-in failed.",
          );
        } finally {
          authenticationTransition = "none";
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
      if (transactionPipeline.state === "in-flight") {
        recoverableAuthenticationError = "Sign-out is unavailable while an NNS transaction is in flight. Wait for its outcome.";
        renderCurrent();
        return;
      }
      if (authenticationTransition !== "none") {
        recoverableAuthenticationError = "Another authentication transition is already in progress.";
        renderCurrent();
        return;
      }
      authenticationTransition = "signing-out";
      transactionPipeline.discardUnsubmittedReview();
      renderCurrent();
      try {
        await browserAuth.signOut();
        authenticatedPrincipal = undefined;
        authenticatedSession = undefined;
        authenticatedNnsActor = undefined;
        recoverableAuthenticationError = undefined;
      } catch (error) {
        recoverableAuthenticationError = boundedAuthenticationError(
          error,
          "Internet Identity sign-out failed.",
        );
      } finally {
        authenticationTransition = "none";
      }
      renderCurrent();
    });
    panel.append(copy, signOut);
    return panel;
  }

  function appendReportActions(id) {
    appendTransactionNotices();
    root.append(authenticationPanel());
    if (authenticatedPrincipal && currentReport) {
      renderManagerAuthority(root, currentReport, authenticatedPrincipal);
      if (authenticationTransition === "none" && authenticatedSession && authenticatedNnsActor) renderControlPanel(root, {
        report: currentReport,
        session: authenticatedSession,
        nnsActor: authenticatedNnsActor,
        pipeline: transactionPipeline,
        onSettlement: settleTransaction,
        onRerun: () => loadNeuron(id),
      });
    }
    const again = element("button", "Check again");
    again.addEventListener("click", () => loadNeuron(id));
    root.append(again, resources());
  }

  function renderCurrent() {
    const match = /^#\/neuron\/([1-9][0-9]*)$/.exec(location.hash);
    if (match && currentView === "report" && currentReport && currentNeuronId === match[1]) {
      renderReport(root, currentReport);
      appendReportActions(currentNeuronId);
    } else if (!match) {
      renderLanding();
    }
  }

  function renderLanding() {
    currentView = "landing";
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
    );
    appendTransactionNotices();
    root.append(
      form,
      element("p", "Committed topics use selected managers; all other topics follow alpha-vote, while committed delegates follow omega-reject exactly."),
      resources(),
    );
  }

  function landing(generation = ++routeGeneration) {
    if (generation !== routeGeneration) return;
    transactionPipeline.discardUnsubmittedReview();
    currentReport = undefined;
    currentNeuronId = undefined;
    renderLanding();
  }

  async function loadNeuron(id, generation = ++routeGeneration) {
    transactionPipeline.discardUnsubmittedReview();
    const ownsRoute = () => generation === routeGeneration && location.hash === `#/neuron/${id}`;
    if (!ownsRoute()) return;
    currentView = "loading";
    clear(root);
    root.setAttribute("aria-busy", "true");
    root.append(element("h1", `Neuron ${id}`), element("div", "Running live verification…", "status"));
    appendTransactionNotices();
    try {
      const report = await checkLive(await actor(), id);
      if (!ownsRoute()) return;
      currentReport = report;
      currentNeuronId = id;
      currentView = "report";
      renderReport(root, currentReport);
      appendReportActions(id);
    } catch (error) {
      if (!ownsRoute()) return;
      currentReport = undefined;
      currentNeuronId = undefined;
      currentView = "error";
      clear(root);
      root.append(element("h1", `Neuron ${id}`));
      showError(root, errorMessage(error));
      appendTransactionNotices();
      const retry = element("button", "Check again");
      retry.addEventListener("click", () => loadNeuron(id));
      root.append(retry, resources());
    } finally {
      if (ownsRoute()) root.removeAttribute("aria-busy");
    }
  }

  function route() {
    const generation = ++routeGeneration;
    const match = /^#\/neuron\/([1-9][0-9]*)$/.exec(location.hash);
    if (!match) return landing(generation);
    try {
      return loadNeuron(formatNeuronId(parseNeuronId(match[1])), generation);
    } catch {
      return landing(generation);
    }
  }

  async function settleTransaction(review, outcome) {
    if (review && outcome) {
      const common = {
        kind: outcome.kind,
        operation: boundedReceiptField(review.operation || "NNS transaction", MAX_RECEIPT_OPERATION_LENGTH),
        dendriteContextNeuronId: review.dendriteContextNeuronId,
        mutationOrManagedNeuronId: review.kind === "SubmitManageNeuronProposal" ? review.managedNeuronId : review.mutationNeuronId,
        requestDigest: boundedReceiptField(review.requestDigest, 64),
        timestampMilliseconds: Date.now(),
      };
      currentTransactionReceipt = Object.freeze(outcome.kind === "Success"
        ? { ...common, proposalId: outcome.result.proposalId }
        : { ...common, message: boundedReceiptField(outcome.message, MAX_RECEIPT_MESSAGE_LENGTH) });
    }
    const match = /^#\/neuron\/([1-9][0-9]*)$/.exec(location.hash);
    if (!match) {
      refreshTransactionNotices();
      return;
    }
    const id = formatNeuronId(parseNeuronId(match[1]));
    if (outcome?.kind === "Success" && review?.dendriteContextNeuronId.toString() === id) {
      await loadNeuron(id);
      return;
    }
    if (currentView === "report" && currentNeuronId === id) renderCurrent();
    else refreshTransactionNotices();
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
