import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ComplianceSnapshot {
  'manager_ids' : BigUint64Array | bigint[],
  'source_errors' : Array<string>,
  'source_revision' : string,
  'committed_topics' : Int32Array | number[],
  'overall_status' : ComplianceStatus,
  'schema_version' : number,
  'evidence_digest' : Uint8Array | number[],
  'stale_after_timestamp_seconds' : bigint,
  'rules' : Array<RuleResult>,
  'quorum_threshold' : [] | [number],
  'checked_at_timestamp_seconds' : bigint,
  'standard_version' : string,
  'neuron_id' : bigint,
}
export type ComplianceStatus = { 'Indeterminate' : null } |
  { 'NonCompliant' : null } |
  { 'StandardUpdateRequired' : null } |
  { 'Compliant' : null };
export type DendriteError = { 'TemporarilyUnavailable' : string } |
  { 'Upstream' : string } |
  { 'GlobalRateLimit' : { 'retry_after_seconds' : bigint } } |
  { 'InvalidNeuronId' : string } |
  { 'LowCycles' : null } |
  { 'ConcurrencyLimit' : null } |
  { 'Cooldown' : { 'retry_after_seconds' : bigint } } |
  { 'DuplicateInFlight' : null };
export interface EvidenceSource {
  'method' : string,
  'observed_at_seconds' : bigint,
}
export type HeaderField = [string, string];
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<HeaderField>,
  'certificate_version' : [] | [number],
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<HeaderField>,
  'upgrade' : [] | [boolean],
  'status_code' : number,
}
export interface PublicStatus {
  'cached_snapshots' : number,
  'schema_version' : number,
  'refresh_counters' : RefreshCounters,
}
export interface RefreshCounters {
  'low_cycle_rejections' : bigint,
  'upstream_failures' : bigint,
  'concurrency_rejections' : bigint,
  'cooldown_rejections' : bigint,
  'cache_evictions' : bigint,
  'cache_hits' : bigint,
  'successful_refreshes' : bigint,
  'accepted_refreshes' : bigint,
  'duplicate_in_flight_requests' : bigint,
  'global_rate_rejections' : bigint,
}
export interface RuleResult {
  'status' : RuleStatus,
  'related_neuron_ids' : BigUint64Array | bigint[],
  'observed' : [] | [string],
  'source' : EvidenceSource,
  'expected' : [] | [string],
  'summary' : string,
  'rule_id' : string,
}
export type RuleStatus = { 'Fail' : null } |
  { 'Pass' : null } |
  { 'Indeterminate' : null } |
  { 'Warning' : null } |
  { 'StandardUpdateRequired' : null };
export interface StandardConfig {
  'source_revision' : string,
  'omega_reject_neuron_id' : bigint,
  'governance_canister_id' : string,
  'max_cached_snapshots' : number,
  'alpha_vote_neuron_id' : bigint,
  'standard_version' : string,
}
export interface _SERVICE {
  'get_cached_compliance' : ActorMethod<[bigint], [] | [ComplianceSnapshot]>,
  'get_public_status' : ActorMethod<[], PublicStatus>,
  'get_standard_config' : ActorMethod<[], StandardConfig>,
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'refresh_compliance' : ActorMethod<
    [bigint],
    { 'Ok' : ComplianceSnapshot } |
      { 'Err' : DendriteError }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
