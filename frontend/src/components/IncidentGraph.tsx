import cytoscape from "cytoscape";
import { useEffect, useRef } from "react";
import type { EvidenceRelationship, SecurityEvent } from "../types/api";

interface Props {
  events: SecurityEvent[];
  relationships: EvidenceRelationship[];
  selectedRelationshipId: number | null;
  onSelectRelationship: (id: number | null) => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  Low: "#6b7280",
  Medium: "#d97706",
  High: "#dc2626",
  Critical: "#7f1d1d",
};

// Typed loosely on purpose: Cytoscape's style typings differ between versions.
const GRAPH_STYLE = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "data(color)",
      color: "#111827",
      "font-size": 10,
      "text-wrap": "wrap",
      "text-max-width": 90,
      "text-valign": "bottom",
      "text-margin-y": 4,
    },
  },
  {
    selector: "edge",
    style: {
      label: "data(rule)",
      width: 2,
      "font-size": 8,
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "line-color": "#2563eb",
      "target-arrow-color": "#2563eb",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.85,
      "text-rotation": "autorotate",
    },
  },
  // Hypothesis links are dashed so they are never mistaken for observed evidence.
  { selector: 'edge[evidence = "hypothesis"]', style: { "line-style": "dashed", "line-color": "#9ca3af", "target-arrow-color": "#9ca3af" } },
  { selector: "edge:selected", style: { width: 4 } },
];

export function IncidentGraph({ events, relationships, selectedRelationshipId, onSelectRelationship }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...events.map((e) => ({
          data: {
            id: `e${e.id}`,
            label: `#${e.id} ${e.event_type}`,
            color: SEVERITY_COLOR[e.severity] ?? "#6b7280",
          },
        })),
        ...relationships.map((r) => ({
          data: {
            id: `r${r.id}`,
            source: `e${r.source_event_id}`,
            target: `e${r.target_event_id}`,
            rule: r.rule_id,
            evidence: r.evidence_type,
          },
        })),
      ],
      layout: { name: "breadthfirst", directed: true, padding: 20, spacingFactor: 1.2 },
      style: GRAPH_STYLE as never,
    });
    cy.on("tap", "edge", (evt) => onSelectRelationship(Number(String(evt.target.id()).slice(1))));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRelationship(null);
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [events, relationships, onSelectRelationship]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().unselect();
    if (selectedRelationshipId !== null) cy.getElementById(`r${selectedRelationshipId}`).select();
  }, [selectedRelationshipId, events, relationships]);

  return <div ref={containerRef} className="graph" aria-label="Evidence relationship graph" />;
}
