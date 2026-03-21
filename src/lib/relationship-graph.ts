import type { ScriptureCharacter } from "./types";

export interface GraphNode {
  id: string;
  name: string;
  tier: number;
  volumes: string[];
  portraitUrl?: string;
  gender: "male" | "female";
  roles: string[];
  group: string; // primary volume for coloring
}

export interface GraphLink {
  source: string;
  target: string;
  type: "kinship" | "social";
  label: string; // relationship label (spouse, father, brother, etc.)
  strength: "solid" | "dashed"; // solid = confirmed, dashed = speculative
}

export interface RelationshipGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Inverse relationship labels */
const INVERSE_LABELS: Record<string, string> = {
  father: "child",
  mother: "child",
  sons: "parent",
  daughters: "parent",
  wife: "husband",
  wives: "husband",
  husband: "wife",
  brothers: "sibling",
  sisters: "sibling",
  nephew: "uncle/aunt",
  grandfather: "grandchild",
  grandmother: "grandchild",
  "great-grandmother": "great-grandchild",
  "father-in-law": "son/daughter-in-law",
  "mother-in-law": "son/daughter-in-law",
  "adoptive father": "adopted child",
  relative: "relative",
};

/**
 * Build a relationship graph from character data.
 * Creates nodes for each character and links based on family relationships.
 * Only includes characters that have at least one relationship.
 */
export function buildRelationshipGraph(
  characters: ScriptureCharacter[],
  visibleVolumes?: Set<string>
): RelationshipGraph {
  // Build lookup map: character name → character
  const byName = new Map<string, ScriptureCharacter>();
  const byId = new Map<string, ScriptureCharacter>();

  for (const c of characters) {
    byId.set(c.id, c);
    byName.set(c.name.toLowerCase(), c);
    for (const alias of c.aliases) {
      byName.set(alias.toLowerCase(), c);
    }
  }

  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const linkSet = new Set<string>(); // prevent duplicate links

  function addNode(c: ScriptureCharacter) {
    if (nodes.has(c.id)) return;
    if (visibleVolumes && !c.volumes.some((v) => visibleVolumes.has(v))) return;
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      tier: c.tier,
      volumes: c.volumes,
      portraitUrl: c.portraitUrl,
      gender: c.gender,
      roles: c.roles,
      group: c.volumes[0] || "OT",
    });
  }

  function addLink(sourceId: string, targetId: string, label: string) {
    // Create a normalized key to prevent duplicates
    const key = [sourceId, targetId].sort().join("::") + "::" + label;
    if (linkSet.has(key)) return;
    linkSet.add(key);
    links.push({
      source: sourceId,
      target: targetId,
      type: "kinship",
      label,
      strength: "solid",
    });
  }

  // Process each character's family relationships
  for (const c of characters) {
    if (!c.family || Object.keys(c.family).length === 0) continue;
    if (visibleVolumes && !c.volumes.some((v) => visibleVolumes.has(v))) continue;

    for (const [relType, relValue] of Object.entries(c.family)) {
      const names = Array.isArray(relValue) ? relValue : [relValue];

      for (const name of names) {
        if (!name || name === "unnamed" || name === "unknown") continue;

        // Find the target character
        const target = byName.get(name.toLowerCase());
        if (!target) continue; // skip if character not in database
        if (visibleVolumes && !target.volumes.some((v) => visibleVolumes.has(v))) continue;

        // Add both nodes
        addNode(c);
        addNode(target);

        // Determine display label
        const singularLabel = relType.replace(/s$/, ""); // "brothers" → "brother"
        addLink(c.id, target.id, singularLabel);
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
}

/**
 * Get a subgraph centered on a specific character.
 * Returns the character and all characters within `depth` relationships.
 */
export function getSubgraph(
  graph: RelationshipGraph,
  centerId: string,
  depth: number = 2
): RelationshipGraph {
  const included = new Set<string>();
  const queue: { id: string; d: number }[] = [{ id: centerId, d: 0 }];

  // BFS to find connected nodes within depth
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (included.has(id) || d > depth) continue;
    included.add(id);

    if (d < depth) {
      for (const link of graph.links) {
        const src = typeof link.source === "string" ? link.source : (link.source as any).id;
        const tgt = typeof link.target === "string" ? link.target : (link.target as any).id;
        if (src === id && !included.has(tgt)) queue.push({ id: tgt, d: d + 1 });
        if (tgt === id && !included.has(src)) queue.push({ id: src, d: d + 1 });
      }
    }
  }

  return {
    nodes: graph.nodes.filter((n) => included.has(n.id)),
    links: graph.links.filter((l) => {
      const src = typeof l.source === "string" ? l.source : (l.source as any).id;
      const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
      return included.has(src) && included.has(tgt);
    }),
  };
}
