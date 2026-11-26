const fs = require("fs");
const sdk = require("../sdk/dist/index.js");

const APP_DOMAIN = "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3";
const NETWORK = "dev";

async function main() {
  const id0 = sdk.createIdentity("veil-phase2-member-0");
  const id1 = sdk.createIdentity("veil-phase2-member-1");
  const id2 = sdk.createIdentity("veil-phase2-member-2");
  const id3 = sdk.createIdentity("veil-phase4-new-member");
  const nonMem = sdk.createIdentity("veil-phase2-non-member");

  const g1 = [id0.commitment, id1.commitment, id2.commitment];
  const g1Expanded = [id0.commitment, id1.commitment, id2.commitment, id3.commitment];
  const g2 = [id1.commitment, id2.commitment];

  const group1RootHex = sdk.buildGroupFromCommitments(g1).rootHex;
  const group1ExpandedRootHex = sdk.buildGroupFromCommitments(g1Expanded).rootHex;
  const group2RootHex = sdk.buildGroupFromCommitments(g2).rootHex;

  const p0 = await sdk.generateSemaphoreVoteProof({
    identity: id0, commitments: g1, pollId: 42, optionIndex: 1, depth: 10, network: NETWORK, appDomain: APP_DOMAIN, groupId: 1,
  });
  const p1 = await sdk.generateSemaphoreVoteProof({
    identity: id1, commitments: g1, pollId: 42, optionIndex: 2, depth: 10, network: NETWORK, appDomain: APP_DOMAIN, groupId: 1,
  });
  const p0_43 = await sdk.generateSemaphoreVoteProof({
    identity: id0, commitments: g1, pollId: 43, optionIndex: 2, depth: 10, network: NETWORK, appDomain: APP_DOMAIN, groupId: 1,
  });
  const pg2 = await sdk.generateSemaphoreVoteProof({
    identity: id1, commitments: g2, pollId: 42, optionIndex: 1, depth: 10, network: NETWORK, appDomain: APP_DOMAIN, groupId: 2,
  });
  // Proof generated with expanded group root AFTER poll 42 opened (must be rejected by frozen snapshot!)
  const p3Expanded = await sdk.generateSemaphoreVoteProof({
    identity: id3, commitments: g1Expanded, pollId: 42, optionIndex: 1, depth: 10, network: NETWORK, appDomain: APP_DOMAIN, groupId: 1,
  });

  const cHex = (c) => BigInt(c).toString(16).padStart(64, "0");

  const src = `package veil_vote

import (
	"testing"

	"gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2"
	"gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2"
)

const (
	group1Root         = "${group1RootHex}"
	group1ExpandedRoot = "${group1ExpandedRootHex}"
	group2Root         = "${group2RootHex}"
	id0Comm            = "${cHex(id0.commitment)}"
	id1Comm            = "${cHex(id1.commitment)}"
	id2Comm            = "${cHex(id2.commitment)}"
	id3Comm            = "${cHex(id3.commitment)}"
	nonMemComm         = "${cHex(nonMem.commitment)}"
)

func assertPanics(t *testing.T, label string, fn func()) {
	t.Helper()
	if r := revive(fn); r == nil {
		t.Fatalf("%s: expected panic, but succeeded", label)
	}
}

func TestAdversarialVotingSuite(cur realm, t *testing.T) {
	testing.SetRealm(testing.NewUserRealm(admin))
	CreateGroup(cross(cur), 1, 10, admin)
	AddMember(cross(cur), 1, id0Comm)
	AddMember(cross(cur), 1, id1Comm)
	AddMember(cross(cur), 1, id2Comm)
	PublishRoot(cross(cur), 1, group1Root)

	CreateGroup(cross(cur), 2, 10, admin)
	AddMember(cross(cur), 2, id1Comm)
	AddMember(cross(cur), 2, id2Comm)
	PublishRoot(cross(cur), 2, group2Root)

	// Poll 42 and 43 freeze group1Root at creation time.
	CreatePoll(cross(cur), 42, 1, "Proposal 42", "Abstain,Yes,No", 0, 0)
	CreatePoll(cross(cur), 43, 1, "Proposal 43", "Abstain,Yes,No", 0, 0)

	if GetPollSnapshotRoot(42) != group1Root {
		t.Fatalf("expected frozen snapshot root %s, got %s", group1Root, GetPollSnapshotRoot(42))
	}
	if GetGroupCommitments(1) == "" {
		t.Fatalf("expected non-empty GetGroupCommitments")
	}

	// Duplicate commitment must be rejected.
	assertPanics(t, "duplicate commitment", func() { AddMember(cross(cur), 1, id0Comm) })

	// Post-poll membership update + root publish must NOT alter Poll 42's frozen snapshot!
	AddMember(cross(cur), 1, id3Comm)
	PublishRoot(cross(cur), 1, group1ExpandedRoot)
	if GetPollSnapshotRoot(42) != group1Root {
		t.Fatalf("poll 42 snapshot root mutated after PublishRoot")
	}

	voter := address("g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5")
	attacker := address("g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj")

	// Unauthorized administrative & membership mutations rejected.
	testing.SetRealm(testing.NewUserRealm(attacker))
	assertPanics(t, "unauth CreateGroup", func() { CreateGroup(cross(cur), 99, 10, attacker) })
	assertPanics(t, "unauth AddMember", func() { AddMember(cross(cur), 1, nonMemComm) })
	assertPanics(t, "unauth PublishRoot", func() { PublishRoot(cross(cur), 1, group2Root) })
	assertPanics(t, "unauth CreatePoll", func() { CreatePoll(cross(cur), 99, 1, "Bad", "A,B", 0, 0) })
	assertPanics(t, "unauth ClosePoll", func() { ClosePoll(cross(cur), 42) })

	testing.SetRealm(testing.NewUserRealm(voter))

	// Newly registered member using post-poll expanded root is rejected in Poll 42!
	assertPanics(t, "new member post-poll root rejected", func() {
		Vote(cross(cur), 42, 10, group1ExpandedRoot, "${p3Expanded.nullifierHex}", 1, "${p3Expanded.encodedProof.a}", "${p3Expanded.encodedProof.b}", "${p3Expanded.encodedProof.c}")
	})

	// Modified vote choice rejected AND failed verification does NOT consume nullifier.
	assertPanics(t, "modified vote choice", func() {
		Vote(cross(cur), 42, 10, group1Root, "${p0.nullifierHex}", 2, "${p0.encodedProof.a}", "${p0.encodedProof.b}", "${p0.encodedProof.c}")
	})
	if GetPollTally(42, 2) != 0 {
		t.Fatalf("tally updated on failed vote")
	}

	// Previously eligible member id0 using frozen root succeeds!
	res := Vote(cross(cur), 42, 10, group1Root, "${p0.nullifierHex}", 1, "${p0.encodedProof.a}", "${p0.encodedProof.b}", "${p0.encodedProof.c}")
	if res != "RECORDED" || GetPollTally(42, 1) != 1 {
		t.Fatalf("valid vote failed: res=%s tally=%d", res, GetPollTally(42, 1))
	}

	// Double vote in same poll rejected.
	assertPanics(t, "double vote in same poll", func() {
		Vote(cross(cur), 42, 10, group1Root, "${p0.nullifierHex}", 1, "${p0.encodedProof.a}", "${p0.encodedProof.b}", "${p0.encodedProof.c}")
	})

	// Same identity CAN vote in distinct poll (poll 43).
	res2 := Vote(cross(cur), 43, 10, group1Root, "${p0_43.nullifierHex}", 2, "${p0_43.encodedProof.a}", "${p0_43.encodedProof.b}", "${p0_43.encodedProof.c}")
	if res2 != "RECORDED" || GetPollTally(43, 2) != 1 {
		t.Fatalf("distinct poll vote failed")
	}

	// Proof for another poll (poll 43) rejected in poll 42.
	assertPanics(t, "proof for another poll", func() {
		Vote(cross(cur), 42, 10, group1Root, "${p0_43.nullifierHex}", 2, "${p0_43.encodedProof.a}", "${p0_43.encodedProof.b}", "${p0_43.encodedProof.c}")
	})

	// Proof for another group (group 2) rejected in group 1 poll 42.
	assertPanics(t, "proof for another group", func() {
		Vote(cross(cur), 42, 10, group2Root, "${pg2.nullifierHex}", 1, "${pg2.encodedProof.a}", "${pg2.encodedProof.b}", "${pg2.encodedProof.c}")
	})

	// Arbitrary root rejected.
	assertPanics(t, "arbitrary root", func() {
		Vote(cross(cur), 42, 10, nonMemComm, "${p1.nullifierHex}", 2, "${p1.encodedProof.a}", "${p1.encodedProof.b}", "${p1.encodedProof.c}")
	})

	// Unsupported depth rejected.
	assertPanics(t, "unsupported depth", func() {
		Vote(cross(cur), 42, 20, group1Root, "${p1.nullifierHex}", 2, "${p1.encodedProof.a}", "${p1.encodedProof.b}", "${p1.encodedProof.c}")
	})

	// Invalid vote option rejected.
	assertPanics(t, "invalid vote option", func() {
		Vote(cross(cur), 42, 10, group1Root, "${p1.nullifierHex}", 99, "${p1.encodedProof.a}", "${p1.encodedProof.b}", "${p1.encodedProof.c}")
	})

	// Multiple distinct members can vote successfully.
	res3 := Vote(cross(cur), 42, 10, group1Root, "${p1.nullifierHex}", 2, "${p1.encodedProof.a}", "${p1.encodedProof.b}", "${p1.encodedProof.c}")
	if res3 != "RECORDED" || GetPollTally(42, 2) != 1 {
		t.Fatalf("second member vote failed")
	}

	// Closed poll rejects submissions.
	testing.SetRealm(testing.NewUserRealm(admin))
	ClosePoll(cross(cur), 43)
	testing.SetRealm(testing.NewUserRealm(voter))
	assertPanics(t, "closed poll", func() {
		Vote(cross(cur), 43, 10, group1Root, "${p1.nullifierHex}", 2, "${p1.encodedProof.a}", "${p1.encodedProof.b}", "${p1.encodedProof.c}")
	})

	// Invalid rootPublisher rejected; TransferAdmin rotates control and rejects invalid addresses.
	testing.SetRealm(testing.NewUserRealm(admin))
	assertPanics(t, "invalid rootPublisher", func() {
		CreateGroup(cross(cur), 99, 10, address(""))
	})
	assertPanics(t, "invalid newAdmin", func() {
		TransferAdmin(cross(cur), address(""))
	})
	newAdmin := address("g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5")
	TransferAdmin(cross(cur), newAdmin)
	assertPanics(t, "old admin rejected after TransferAdmin", func() {
		CreateGroup(cross(cur), 99, 10, admin)
	})
	testing.SetRealm(testing.NewUserRealm(newAdmin))
	TransferAdmin(cross(cur), admin)

	// Cross-app and cross-network replay rejected at Primitives layer.
	rBytes, _ := decodeHex32(group1Root)
	nBytes, _ := decodeHex32("${p0.nullifierHex}")
	pf, _ := groth16.ParseProofHex("${p0.encodedProof.a}", "${p0.encodedProof.b}", "${p0.encodedProof.c}")
	if err := semaphore.VerifyAndConsume(vks, groups, semaphore.NewNullifierSet(), 1, 10, rBytes, nBytes, semaphore.Uint64ToBE32(1), semaphore.DomainScopeFull("onyx-1", "${APP_DOMAIN}", 1, 42), pf); err == nil {
		t.Fatalf("expected error for cross-network replay")
	}
}
`;
  fs.writeFileSync("e:/Veil ZK protocol/gno/r/veil_vote/veil_vote_test.gno", src);
  console.log("Regenerated veil_vote_test.gno using @veil-protocol/sdk canonical scope!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
