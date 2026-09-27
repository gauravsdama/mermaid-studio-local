import type { DiagramTheme } from "../types";

export type DemoPrompt = {
  label: string;
  title: string;
  source: string;
  theme: DiagramTheme;
};

export const demoPrompts: DemoPrompt[] = [
  {
    label: "Create a flowchart for checkout from cart review through payment confirmation.",
    title: "Checkout service flow",
    theme: "base",
    source: `flowchart LR
  Browser[Customer browser] --> Edge[Checkout API]
  Edge --> Inventory{Inventory available?}
  Inventory -->|Yes| Payment[Authorize payment]
  Inventory -->|No| Retry[Offer restock alert]
  Payment --> Receipt[Confirm order]`
  },
  {
    label: "Create a sequence diagram for an incident alert, escalation, mitigation, and recovery.",
    title: "Incident response sequence",
    theme: "default",
    source: `sequenceDiagram
  participant Monitor
  participant OnCall as On-call engineer
  participant Lead as Incident lead
  Monitor->>OnCall: Alert on error budget
  OnCall->>Lead: Escalate with initial evidence
  Lead-->>OnCall: Assign mitigation owner
  OnCall-->>Monitor: Confirm recovery`
  },
  {
    label: "Create an entity relationship diagram for releases, artifacts, checks, and checksums.",
    title: "Release data model",
    theme: "forest",
    source: `erDiagram
  RELEASE ||--o{ ARTIFACT : contains
  RELEASE ||--o{ CHECK : requires
  ARTIFACT ||--|| CHECKSUM : verifies
  RELEASE {
    string version
    string commit
  }
  ARTIFACT {
    string name
    string platform
  }`
  },
  {
    label: "Create a timeline for source freeze, release candidate testing, publishing, and follow-up.",
    title: "Launch timeline",
    theme: "neutral",
    source: `timeline
  title v0.1 launch
  Source freeze : Finish release gates
  Candidate : Run clean CI : Review artifacts
  Publish : Create source release : Deploy demo
  Follow-up : Gather compatibility reports`
  },
  {
    label: "Create a state diagram for an order from draft through fulfillment or cancellation.",
    title: "Order state machine",
    theme: "dark",
    source: `stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted: place order
  Submitted --> Paid: authorize
  Submitted --> Cancelled: cancel
  Paid --> Fulfilled: ship
  Fulfilled --> [*]
  Cancelled --> [*]`
  }
];
