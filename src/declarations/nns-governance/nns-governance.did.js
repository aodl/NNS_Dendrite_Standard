// Deterministic IDL derived from dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2.
// Replicated reads intentionally have no query annotation.
export const idlFactory = ({ IDL }) => {
  const empty = () => IDL.Record({});
  const NeuronId = IDL.Record({ id: IDL.Nat64 });
  const ProposalId = IDL.Record({ id: IDL.Nat64 });
  const NeuronIdOrSubaccount = IDL.Variant({ NeuronId, Subaccount: IDL.Vec(IDL.Nat8) });
  const GovernanceError = IDL.Record({ error_message: IDL.Text, error_type: IDL.Int32 });
  const AccountIdentifier = IDL.Record({ hash: IDL.Vec(IDL.Nat8) });
  const Account = IDL.Record({ owner: IDL.Opt(IDL.Principal), subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
  const Configure = IDL.Record({ operation: IDL.Opt(IDL.Variant({
    RemoveHotKey: IDL.Record({ hot_key_to_remove: IDL.Opt(IDL.Principal) }),
    AddHotKey: IDL.Record({ new_hot_key: IDL.Opt(IDL.Principal) }),
    ChangeAutoStakeMaturity: IDL.Record({ requested_setting_for_auto_stake_maturity: IDL.Bool }),
    StopDissolving: empty(), StartDissolving: empty(),
    IncreaseDissolveDelay: IDL.Record({ additional_dissolve_delay_seconds: IDL.Nat32 }),
    SetVisibility: IDL.Record({ visibility: IDL.Opt(IDL.Int32) }),
    JoinCommunityFund: empty(), LeaveCommunityFund: empty(),
    SetDissolveTimestamp: IDL.Record({ dissolve_timestamp_seconds: IDL.Nat64 }),
  })) });
  const Spawn = IDL.Record({ percentage_to_spawn: IDL.Opt(IDL.Nat32), new_controller: IDL.Opt(IDL.Principal), nonce: IDL.Opt(IDL.Nat64) });
  const Split = IDL.Record({ amount_e8s: IDL.Nat64, memo: IDL.Opt(IDL.Nat64) });
  const Follow = IDL.Record({ topic: IDL.Int32, followees: IDL.Vec(NeuronId) });
  const ClaimOrRefresh = IDL.Record({ by: IDL.Opt(IDL.Variant({ NeuronIdOrSubaccount: empty(), MemoAndController: IDL.Reserved, Memo: IDL.Nat64 })) });
  const RegisterVote = IDL.Record({ vote: IDL.Int32, proposal: IDL.Opt(ProposalId) });
  const Merge = IDL.Record({ source_neuron_id: IDL.Opt(NeuronId) });
  const DisburseToNeuron = IDL.Record({ dissolve_delay_seconds: IDL.Nat64, kyc_verified: IDL.Bool, amount_e8s: IDL.Nat64, new_controller: IDL.Opt(IDL.Principal), nonce: IDL.Nat64 });
  const StakeMaturity = IDL.Record({ percentage_to_stake: IDL.Opt(IDL.Nat32) });
  const MergeMaturity = IDL.Record({ percentage_to_merge: IDL.Nat32 });
  const Disburse = IDL.Record({ to_account: IDL.Opt(AccountIdentifier), amount: IDL.Opt(IDL.Record({ e8s: IDL.Nat64 })) });
  const RefreshVotingPower = empty();
  const DisburseMaturity = IDL.Record({ percentage_to_disburse: IDL.Nat32, to_account: IDL.Opt(Account), to_account_identifier: IDL.Opt(AccountIdentifier) });
  const SetFollowing = IDL.Record({ topic_following: IDL.Opt(IDL.Vec(IDL.Record({ followees: IDL.Opt(IDL.Vec(NeuronId)), topic: IDL.Opt(IDL.Int32) }))) });

  const ManageNeuronRequest = IDL.Rec();
  const ProposalActionRequest = IDL.Variant({
    ManageNeuron: ManageNeuronRequest, RegisterKnownNeuron: IDL.Reserved, DeregisterKnownNeuron: IDL.Reserved,
    UpdateCanisterSettings: IDL.Reserved, InstallCode: IDL.Reserved, StopOrStartCanister: IDL.Reserved,
    CreateServiceNervousSystem: IDL.Reserved, ExecuteNnsFunction: IDL.Reserved,
    RewardNodeProvider: IDL.Reserved, RewardNodeProviders: IDL.Reserved,
    ManageNetworkEconomics: IDL.Reserved, ApproveGenesisKyc: IDL.Reserved,
    AddOrRemoveNodeProvider: IDL.Reserved, Motion: IDL.Reserved,
    FulfillSubnetRentalRequest: IDL.Reserved, BlessAlternativeGuestOsVersion: IDL.Reserved,
    TakeCanisterSnapshot: IDL.Reserved, LoadCanisterSnapshot: IDL.Reserved,
    CreateCanisterAndInstallCode: IDL.Reserved,
  });
  const MakeProposal = IDL.Record({ url: IDL.Text, title: IDL.Opt(IDL.Text), action: IDL.Opt(ProposalActionRequest), summary: IDL.Text });
  const commandFields = { Spawn, Split, Follow, ClaimOrRefresh, Configure, RegisterVote, Merge,
    DisburseToNeuron, MakeProposal, StakeMaturity, MergeMaturity, Disburse,
    RefreshVotingPower, DisburseMaturity, SetFollowing };
  ManageNeuronRequest.fill(IDL.Record({ id: IDL.Opt(NeuronId), neuron_id_or_subaccount: IDL.Opt(NeuronIdOrSubaccount), command: IDL.Opt(IDL.Variant(commandFields)) }));

  const StoredProposal = IDL.Rec();
  const storedManageNeuron = IDL.Record({ id: IDL.Opt(NeuronId), neuron_id_or_subaccount: IDL.Opt(NeuronIdOrSubaccount), command: IDL.Opt(IDL.Variant({ ...commandFields, MakeProposal: StoredProposal })) });
  const StoredAction = IDL.Variant({
    ManageNeuron: storedManageNeuron, RegisterKnownNeuron: IDL.Reserved, DeregisterKnownNeuron: IDL.Reserved,
    UpdateCanisterSettings: IDL.Reserved, InstallCode: IDL.Reserved, StopOrStartCanister: IDL.Reserved,
    CreateServiceNervousSystem: IDL.Reserved, ExecuteNnsFunction: IDL.Reserved,
    RewardNodeProvider: IDL.Reserved, OpenSnsTokenSwap: IDL.Reserved,
    SetSnsTokenSwapOpenTimeWindow: IDL.Reserved, SetDefaultFollowees: IDL.Reserved,
    RewardNodeProviders: IDL.Reserved, ManageNetworkEconomics: IDL.Reserved,
    ApproveGenesisKyc: IDL.Reserved, AddOrRemoveNodeProvider: IDL.Reserved, Motion: IDL.Reserved,
    FulfillSubnetRentalRequest: IDL.Reserved, BlessAlternativeGuestOsVersion: IDL.Reserved,
    TakeCanisterSnapshot: IDL.Reserved, LoadCanisterSnapshot: IDL.Reserved,
    CreateCanisterAndInstallCode: IDL.Reserved,
  });
  StoredProposal.fill(IDL.Record({ url: IDL.Text, title: IDL.Opt(IDL.Text), action: IDL.Opt(StoredAction), summary: IDL.Text }));
  const Ballot = IDL.Record({ vote: IDL.Int32, voting_power: IDL.Nat64 });
  const ProposalInfo = IDL.Record({
    id: IDL.Opt(ProposalId), status: IDL.Int32, topic: IDL.Int32,
    ballots: IDL.Vec(IDL.Tuple(IDL.Nat64, Ballot)), proposal_timestamp_seconds: IDL.Nat64,
    deadline_timestamp_seconds: IDL.Opt(IDL.Nat64), proposal: IDL.Opt(StoredProposal), proposer: IDL.Opt(NeuronId),
  });
  const ListNeurons = IDL.Record({
    neuron_ids: IDL.Vec(IDL.Nat64), include_neurons_readable_by_caller: IDL.Bool,
    include_empty_neurons_readable_by_caller: IDL.Opt(IDL.Bool), include_public_neurons_in_full_neurons: IDL.Opt(IDL.Bool),
    page_number: IDL.Opt(IDL.Nat64), page_size: IDL.Opt(IDL.Nat64),
    neuron_subaccounts: IDL.Opt(IDL.Vec(IDL.Record({ subaccount: IDL.Vec(IDL.Nat8) }))),
  });
  const responseCommand = IDL.Variant({
    Error: GovernanceError, Spawn: IDL.Reserved, Split: IDL.Reserved, Follow: empty(),
    ClaimOrRefresh: IDL.Reserved, Configure: empty(), RegisterVote: empty(), Merge: IDL.Reserved,
    DisburseToNeuron: IDL.Reserved, MakeProposal: IDL.Record({ message: IDL.Opt(IDL.Text), proposal_id: IDL.Opt(ProposalId) }),
    StakeMaturity: IDL.Reserved, MergeMaturity: IDL.Reserved, Disburse: IDL.Reserved,
    RefreshVotingPower: empty(), DisburseMaturity: IDL.Reserved, SetFollowing: empty(),
  });
  const ListProposalInfoRequest = IDL.Record({
    include_reward_status: IDL.Vec(IDL.Int32), omit_large_fields: IDL.Opt(IDL.Bool), before_proposal: IDL.Opt(ProposalId),
    limit: IDL.Nat32, exclude_topic: IDL.Vec(IDL.Int32), include_all_manage_neuron_proposals: IDL.Opt(IDL.Bool),
    include_status: IDL.Vec(IDL.Int32), return_self_describing_action: IDL.Opt(IDL.Bool),
  });
  return IDL.Service({
    list_neurons: IDL.Func([ListNeurons], [IDL.Reserved], []),
    get_network_economics_parameters: IDL.Func([], [IDL.Record({ neuron_management_fee_per_proposal_e8s: IDL.Nat64 })], []),
    get_proposal_info: IDL.Func([IDL.Nat64], [IDL.Opt(ProposalInfo)], []),
    list_proposals: IDL.Func([ListProposalInfoRequest], [IDL.Record({ proposal_info: IDL.Vec(ProposalInfo) })], []),
    manage_neuron: IDL.Func([ManageNeuronRequest], [IDL.Record({ command: IDL.Opt(responseCommand) })], []),
  });
};
