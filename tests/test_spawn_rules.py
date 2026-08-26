#!/usr/bin/env python3
"""Deterministic dry-run tests for sim/spawn-rules.yaml.

These tests verify the rule-matching and spawn pipeline without calling any
LLM, so they can run safely in headless scheduled sessions.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import sim.cycle as cycle  # noqa: E402


class InquiryAckRuleTest(unittest.TestCase):
    """Verify that a visitor inquiry triggers the inquiry-ack spawn rule."""

    def setUp(self) -> None:
        self.ledger, self.existing, self.rules, self.personas = cycle.load_state()
        self.cycle = self.ledger["meta"]["cycle"]
        self.run = cycle.CycleRun(self.cycle, self.existing)

    def test_inquiry_event_matches_inquiry_ack_rule(self) -> None:
        inquiry = {
            "role": "community",
            "kind": "inquiry",
            "tags": ["inquiry", "visitor"],
            "body": "Question about First Light settlement terms.",
        }
        rule = next(r for r in self.rules if r["id"] == "inquiry-ack")
        self.assertTrue(
            cycle.rule_matches(rule, inquiry),
            "inquiry-ack rule should match a community inquiry event",
        )

    def test_non_inquiry_event_does_not_match_inquiry_ack_rule(self) -> None:
        complaint = {
            "role": "community",
            "kind": "complaint",
            "tags": ["outage"],
            "body": "The Beam cut out again.",
        }
        rule = next(r for r in self.rules if r["id"] == "inquiry-ack")
        self.assertFalse(
            cycle.rule_matches(rule, complaint),
            "inquiry-ack rule should not match a generic outage complaint",
        )

    def test_inquiry_ack_spawn_pipeline(self) -> None:
        """Synthetic inquiry -> spawn_responses publishes an ops-central ack."""
        trigger = {
            "id": "ev-test-inquiry-001",
            "role": "community",
            "kind": "inquiry",
            "tags": ["inquiry", "visitor"],
            "title": "Visitor inquiry",
            "body": "What does First Light cover for new settlements?",
            "chain_id": "chain-test-001",
            "spawned": [],
        }
        trigger_dt = datetime(2999, 8, 26, 10, 0, tzinfo=timezone.utc)

        def fake_generate(prompt: str) -> dict:
            # Return a draft that satisfies validate_draft and the ledger bans.
            return {
                "title": "Acknowledgment of visitor inquiry",
                "body": "Your question has been logged. A full response will be issued "
                        "in a later cycle if the ledger verifies the facts.",
                "tags": ["inquiry", "acknowledgment"],
            }

        with mock.patch.object(cycle, "generate", side_effect=fake_generate):
            cycle.spawn_responses(
                self.run, self.personas, self.ledger, self.rules,
                cycle.random.Random(7), [(trigger, trigger_dt)],
            )

        self.assertEqual(len(self.run.events), 1)
        ack = self.run.events[0]
        self.assertEqual(ack["kind"], "acknowledgment")
        self.assertEqual(ack["persona_id"], "ops-central")
        self.assertEqual(ack["caused_by"], trigger["id"])
        self.assertEqual(ack["chain_id"], trigger["chain_id"])
        self.assertIn("logged", ack["body"].lower())
        self.assertEqual(trigger["spawned"], [ack["id"]])


if __name__ == "__main__":
    unittest.main()
