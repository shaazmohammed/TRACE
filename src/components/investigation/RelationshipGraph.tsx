import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useEffect, useMemo, useRef } from 'react';
import type { EvidenceRelationship, SecurityEvent } from '../../types/trace';
import { ENTITY_LABEL, humanize } from '../../utils/format';
import { EmptyState } from '../common/StateViews';

interface Props {
  events: SecurityEvent[];
  relationships: EvidenceRelationship[];
  selectedRelationshipId: string | null;
  focusedEventId: string | null;
  onSelectRelationship: (id: string | null) => void;
}

const COLORS = {
  bg: '#0f1726',
  text: '#c9d4e5',
  muted: '#6b7a93',
  edge: '#3a4a66',
  accent: '#38bdf8',
  severity: { critical: '#f87171', high: '#fb923c', medium: '#facc15', low: '#60a5fa' },
  entity: { username: '#a78bfa', ip_address: '#2dd4bf', device: '#94a3b8' },
};

/** Builds graph elements strictly from backend evidence relationships. */
function buildElements(events: SecurityEvent[], relationships: EvidenceRelationship[]): ElementDefinition[] {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const elements: ElementDefinition[] = [];
  const eventNodes = new Set<string>();
  const entityNodes = new Set<string>();
  const entityLinks = new Set<string>();

  const addEventNode = (id: string) => {
    if (eventNodes.has(id)) return;
    eventNodes.add(id);
    const event = eventsById.get(id);
    elements.push({
      group: 'nodes',
      data: {
        id: `event:${id}`,
        kind: 'event',
        eventId: id,
        label: event ? `${humanize(event.event_type)}\n${id}` : id,
        color: event ? COLORS.severity[event.severity] : COLORS.muted,
      },
    });
  };

  for (const rel of relationships) {
    addEventNode(rel.source_event_id);
    addEventNode(rel.target_event_id);
    elements.push({
      group: 'edges',
      data: {
        id: `rel:${rel.id}`,
        kind: 'relationship',
        relationshipId: rel.id,
        source: `event:${rel.source_event_id}`,
        target: `event:${rel.target_event_id}`,
        label: rel.rule.name,
      },
    });

    for (const entity of rel.shared_entities) {
      const entityId = `entity:${entity.type}:${entity.value}`;
      if (!entityNodes.has(entityId)) {
        entityNodes.add(entityId);
        elements.push({
          group: 'nodes',
          data: {
            id: entityId,
            kind: 'entity',
            label: `${ENTITY_LABEL[entity.type]}\n${entity.value}`,
            color: COLORS.entity[entity.type],
          },
        });
      }
      for (const eventId of [rel.source_event_id, rel.target_event_id]) {
        const linkId = `link:${entityId}:${eventId}`;
        if (entityLinks.has(linkId)) continue;
        entityLinks.add(linkId);
        elements.push({
          group: 'edges',
          data: { id: linkId, kind: 'entity-link', source: `event:${eventId}`, target: entityId },
        });
      }
    }
  }
  return elements;
}

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      color: COLORS.text,
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': 9,
      'text-wrap': 'wrap',
      'text-valign': 'bottom',
      'text-margin-y': 5,
      'text-max-width': '110px',
      'border-width': 2,
      'border-color': 'data(color)',
      'background-color': COLORS.bg,
    },
  },
  { selector: 'node[kind = "event"]', style: { shape: 'round-rectangle', width: 26, height: 26, 'background-color': 'data(color)', 'background-opacity': 0.25 } },
  { selector: 'node[kind = "entity"]', style: { shape: 'ellipse', width: 18, height: 18, 'font-size': 8, color: COLORS.muted } },
  {
    selector: 'edge[kind = "relationship"]',
    style: {
      width: 2,
      'line-color': COLORS.edge,
      'target-arrow-color': COLORS.edge,
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: '',
      'font-size': 9,
      color: COLORS.accent,
      'text-rotation': 'autorotate',
      'text-background-color': COLORS.bg,
      'text-background-opacity': 1,
      'text-background-padding': '3px',
    },
  },
  { selector: 'edge[kind = "relationship"].hovered', style: { label: 'data(label)', 'line-color': '#5b6f92', 'target-arrow-color': '#5b6f92' } },
  { selector: 'edge[kind = "relationship"]:active', style: { 'overlay-opacity': 0.1, 'overlay-color': COLORS.accent } },
  { selector: 'edge[kind = "entity-link"]', style: { width: 1, 'line-style': 'dashed', 'line-color': '#26324a', 'curve-style': 'straight', events: 'no' } },
  { selector: 'edge.selected', style: { label: 'data(label)', width: 3, 'line-color': COLORS.accent, 'target-arrow-color': COLORS.accent, color: COLORS.accent } },
  { selector: 'node.focused', style: { 'border-width': 3, 'border-color': COLORS.accent } },
  { selector: '.dimmed', style: { opacity: 0.3 } },
];

export function RelationshipGraph({ events, relationships, selectedRelationshipId, focusedEventId, onSelectRelationship }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelectRelationship);
  onSelectRef.current = onSelectRelationship;

  const elements = useMemo(() => buildElements(events, relationships), [events, relationships]);

  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: STYLE,
      layout: {
        name: 'cose',
        animate: false,
        randomize: false,
        padding: 40,
        nodeRepulsion: () => 600000,
        nodeOverlap: 40,
        idealEdgeLength: (edge) => (edge.data('kind') === 'entity-link' ? 70 : 160),
        edgeElasticity: () => 80,
        gravity: 0.4,
        numIter: 2500,
      },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.3,
    });
    cy.fit(undefined, 40);
    if (cy.zoom() > 1.1) {
      cy.zoom(1.1);
      cy.center();
    }
    cy.on('tap', 'edge[kind = "relationship"]', (evt) => onSelectRef.current(evt.target.data('relationshipId')));
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelectRef.current(null);
    });
    cy.on('mouseover', 'edge[kind = "relationship"]', (evt) => {
      evt.target.addClass('hovered');
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hovered');
      if (containerRef.current) containerRef.current.style.cursor = '';
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass('selected focused dimmed');
      if (selectedRelationshipId) {
        const edge = cy.getElementById(`rel:${selectedRelationshipId}`);
        if (edge.nonempty()) {
          edge.addClass('selected');
          cy.elements().not(edge.union(edge.connectedNodes())).addClass('dimmed');
        }
      }
      if (focusedEventId) cy.getElementById(`event:${focusedEventId}`).addClass('focused');
    });
  }, [selectedRelationshipId, focusedEventId, elements]);

  if (relationships.length === 0) {
    return (
      <EmptyState title="No evidence relationships">
        The correlation engine returned no relationships for this incident, so there is nothing to graph.
      </EmptyState>
    );
  }

  return (
    <div className="graph-wrap">
      <div
        ref={containerRef}
        className="graph"
        role="img"
        aria-label={`Relationship graph with ${relationships.length} evidence relationships. Use the evidence list for keyboard access.`}
      />
      <div className="graph-legend" aria-hidden="true">
        <span><i className="legend-swatch square" /> Event (color = severity)</span>
        <span><i className="legend-swatch circle user" /> User</span>
        <span><i className="legend-swatch circle ip" /> IP</span>
        <span><i className="legend-swatch circle device" /> Device</span>
        <span><i className="legend-swatch line" /> Click a rule edge for evidence</span>
      </div>
    </div>
  );
}
