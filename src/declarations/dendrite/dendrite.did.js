export const idlFactory = ({ IDL }) => {
  const ComplianceStatus = IDL.Variant({
    'Indeterminate' : IDL.Null,
    'NonCompliant' : IDL.Null,
    'StandardUpdateRequired' : IDL.Null,
    'Compliant' : IDL.Null,
  });
  const RuleStatus = IDL.Variant({
    'Fail' : IDL.Null,
    'Pass' : IDL.Null,
    'Indeterminate' : IDL.Null,
    'Warning' : IDL.Null,
    'StandardUpdateRequired' : IDL.Null,
  });
  const EvidenceSource = IDL.Record({
    'method' : IDL.Text,
    'observed_at_seconds' : IDL.Nat64,
  });
  const RuleResult = IDL.Record({
    'status' : RuleStatus,
    'related_neuron_ids' : IDL.Vec(IDL.Nat64),
    'observed' : IDL.Opt(IDL.Text),
    'source' : EvidenceSource,
    'expected' : IDL.Opt(IDL.Text),
    'summary' : IDL.Text,
    'rule_id' : IDL.Text,
    'relevant_topic' : IDL.Opt(IDL.Int32),
  });
  const SummaryField = IDL.Record({ 'label' : IDL.Text, 'value' : IDL.Text });
  const ComplianceSnapshot = IDL.Record({
    'manager_ids' : IDL.Vec(IDL.Nat64),
    'source_errors' : IDL.Vec(IDL.Text),
    'source_revision' : IDL.Text,
    'committed_topics' : IDL.Vec(IDL.Int32),
    'overall_status' : ComplianceStatus,
    'schema_version' : IDL.Nat16,
    'evidence_digest' : IDL.Vec(IDL.Nat8),
    'stale_after_timestamp_seconds' : IDL.Nat64,
    'rules' : IDL.Vec(RuleResult),
    'quorum_threshold' : IDL.Opt(IDL.Nat8),
    'checked_at_timestamp_seconds' : IDL.Nat64,
    'standard_version' : IDL.Text,
    'neuron_id' : IDL.Nat64,
    'summary_fields' : IDL.Opt(IDL.Vec(SummaryField)),
    'warnings' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const RefreshCounters = IDL.Record({
    'low_cycle_rejections' : IDL.Nat64,
    'upstream_failures' : IDL.Nat64,
    'concurrency_rejections' : IDL.Nat64,
    'cooldown_rejections' : IDL.Nat64,
    'cache_evictions' : IDL.Nat64,
    'cache_hits' : IDL.Nat64,
    'successful_refreshes' : IDL.Nat64,
    'accepted_refreshes' : IDL.Nat64,
    'duplicate_in_flight_requests' : IDL.Nat64,
    'global_rate_rejections' : IDL.Nat64,
  });
  const PublicStatus = IDL.Record({
    'cached_snapshots' : IDL.Nat16,
    'schema_version' : IDL.Nat16,
    'refresh_counters' : RefreshCounters,
  });
  const StandardConfig = IDL.Record({
    'source_revision' : IDL.Text,
    'omega_reject_neuron_id' : IDL.Nat64,
    'governance_canister_id' : IDL.Text,
    'max_cached_snapshots' : IDL.Nat16,
    'alpha_vote_neuron_id' : IDL.Nat64,
    'standard_version' : IDL.Text,
  });
  const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HeaderField),
    'certificate_version' : IDL.Opt(IDL.Nat16),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HeaderField),
    'upgrade' : IDL.Opt(IDL.Bool),
    'status_code' : IDL.Nat16,
  });
  const DendriteError = IDL.Variant({
    'TemporarilyUnavailable' : IDL.Text,
    'Upstream' : IDL.Text,
    'GlobalRateLimit' : IDL.Record({ 'retry_after_seconds' : IDL.Nat64 }),
    'InvalidNeuronId' : IDL.Text,
    'LowCycles' : IDL.Null,
    'ConcurrencyLimit' : IDL.Null,
    'Cooldown' : IDL.Record({ 'retry_after_seconds' : IDL.Nat64 }),
    'DuplicateInFlight' : IDL.Null,
  });
  return IDL.Service({
    'force_refresh_compliance' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : ComplianceSnapshot, 'Err' : DendriteError })],
        [],
      ),
    'get_cached_compliance' : IDL.Func(
        [IDL.Nat64],
        [IDL.Opt(ComplianceSnapshot)],
        ['query'],
      ),
    'get_public_status' : IDL.Func([], [PublicStatus], ['query']),
    'get_standard_config' : IDL.Func([], [StandardConfig], ['query']),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'refresh_compliance' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : ComplianceSnapshot, 'Err' : DendriteError })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
