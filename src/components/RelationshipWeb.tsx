"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { buildRelationshipGraph, getSubgraph, type GraphNode, type GraphLink, type RelationshipGraph } from "@/lib/relationship-graph";
import CharacterDetailPanel from "./CharacterDetailPanel";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

// Dynamic import for ForceGraph2D (needs browser, not SSR)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const VOLUME_NODE_COLORS: Record<string, string> = {
  OT: "#DC2F4B",
  NT: "#E8532C",
  BoM: "#F57B20",
  "D&C": "#F5A623",
  PoGP: "#F5C829",
};

export default function RelationshipWeb({
  characters,
  initialCharacter,
  onClose,
  onSelectCharacter,
}: {
  characters: ScriptureCharacter[];
  initialCharacter?: ScriptureCharacter | null;
  onClose: () => void;
  onSelectCharacter: (c: ScriptureCharacter) => void;
}) {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<ScriptureCharacter | null>(initialCharacter || null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<ScriptureCharacter[]>(initialCharacter ? [initialCharacter] : []);
  const [isVisible, setIsVisible] = useState(false);

  // Build visible volumes set
  const visibleVolumes = useMemo(() => {
    const set = new Set<string>();
    for (const v of ["OT", "NT", "BoM", "D&C", "PoGP"]) {
      if (isVolumeVisible(v)) set.add(v);
    }
    return set;
  }, [isVolumeVisible]);

  // Build full graph
  const fullGraph = useMemo(() => {
    return buildRelationshipGraph(characters, visibleVolumes);
  }, [characters, visibleVolumes]);

  // Current displayed graph (subgraph if a character is selected)
  const displayGraph = useMemo(() => {
    if (selectedNode) {
      return getSubgraph(fullGraph, selectedNode.id, 2);
    }
    // Show only tier 1-2 characters for overview
    const prominentIds = new Set(fullGraph.nodes.filter((n) => n.tier <= 2).map((n) => n.id));
    return {
      nodes: fullGraph.nodes.filter((n) => prominentIds.has(n.id)),
      links: fullGraph.links.filter((l) => {
        const src = typeof l.source === "string" ? l.source : (l.source as any).id;
        const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
        return prominentIds.has(src) && prominentIds.has(tgt);
      }),
    };
  }, [fullGraph, selectedNode]);

  // Character lookup
  const charById = useMemo(() => {
    const map = new Map<string, ScriptureCharacter>();
    for (const c of characters) map.set(c.id, c);
    return map;
  }, [characters]);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Escape to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const handleNodeClick = useCallback((node: any) => {
    const char = charById.get(node.id);
    if (char) {
      setSelectedNode(char);
      setBreadcrumbs((prev) => {
        const idx = prev.findIndex((c) => c.id === char.id);
        if (idx >= 0) return prev.slice(0, idx + 1);
        return [...prev, char];
      });
    }
  }, [charById]);

  const handleBreadcrumbClick = useCallback((char: ScriptureCharacter, index: number) => {
    setSelectedNode(char);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }, []);

  // Custom node rendering
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = node.tier <= 2 ? 8 : 5;
    const color = VOLUME_NODE_COLORS[node.group] || "#888";
    const isHovered = hoveredNode === node.id;
    const isSelected = selectedNode?.id === node.id;

    // Glow for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
      ctx.fillStyle = `${color}40`;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? "#fff" : color;
    ctx.fill();
    ctx.strokeStyle = isSelected ? color : `${color}80`;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Label (only when zoomed in enough)
    if (globalScale > 1.5 || node.tier <= 2) {
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${node.tier <= 2 ? "bold " : ""}${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isSelected || isHovered ? "#fff" : "rgba(255,255,255,0.7)";
      ctx.fillText(node.name, node.x, node.y + size + 2);
    }
  }, [hoveredNode, selectedNode]);

  // Custom link rendering
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const src = link.source;
    const tgt = link.target;
    if (!src.x || !tgt.x) return;

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);

    if (link.strength === "dashed") {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }

    // Color based on relationship type
    const isSpouse = link.label === "wife" || link.label === "husband" || link.label === "spouse";
    ctx.strokeStyle = isSpouse ? "rgba(236, 72, 153, 0.3)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = isSpouse ? 1.5 : 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(10, 10, 18, 0.97)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "linear-gradient(to bottom, rgba(10,10,18,0.95), transparent)",
        }}
      >
        {/* Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: 1 }}>
          <button
            onClick={() => { setSelectedNode(null); setBreadcrumbs([]); }}
            style={{
              background: "none",
              border: "none",
              color: selectedNode ? "var(--text-muted)" : "var(--text)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "all 0.15s",
            }}
          >
            All People
          </button>
          {breadcrumbs.map((c, i) => (
            <span key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>›</span>
              <button
                onClick={() => handleBreadcrumbClick(c, i)}
                style={{
                  background: i === breadcrumbs.length - 1 ? "rgba(255,255,255,0.08)" : "none",
                  border: "none",
                  color: i === breadcrumbs.length - 1 ? "var(--text)" : "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  transition: "all 0.15s",
                }}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text)",
            fontSize: "0.8rem",
            padding: "6px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 20,
          zIndex: 10,
          display: "flex",
          gap: "16px",
          fontSize: "0.68rem",
          color: "var(--text-muted)",
        }}
      >
        <span>{displayGraph.nodes.length} people</span>
        <span>{displayGraph.links.length} connections</span>
        {selectedNode && (
          <button
            onClick={() => {
              const char = selectedNode;
              onClose();
              setTimeout(() => onSelectCharacter(char), 300);
            }}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "var(--accent)",
              fontSize: "0.68rem",
              padding: "2px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            View {selectedNode.name}'s Profile →
          </button>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 20,
          zIndex: 10,
          display: "flex",
          gap: "10px",
          fontSize: "0.62rem",
          color: "var(--text-muted)",
        }}
      >
        {Object.entries(VOLUME_NODE_COLORS).map(([vol, color]) => (
          visibleVolumes.has(vol) && (
            <span key={vol} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
              {vol}
            </span>
          )
        ))}
      </div>

      {/* Force Graph */}
      {typeof window !== "undefined" && (
        <ForceGraph2D
          ref={graphRef}
          graphData={displayGraph}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
          nodeLabel={(node: any) => `${node.name} (${node.volumes.join(", ")})`}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          backgroundColor="rgba(0,0,0,0)"
        />
      )}

      {/* Selected character detail — glassmorphism panel */}
      {selectedNode && !isMobile && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "20px",
            width: "320px",
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            zIndex: 20,
            background: "rgba(20, 20, 30, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          {/* Portrait */}
          {selectedNode.portraitUrl && (
            <div style={{
              width: "100%",
              aspectRatio: "3/2",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "14px",
            }}>
              <img
                src={selectedNode.portraitUrl}
                alt={selectedNode.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
              />
            </div>
          )}

          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
            {selectedNode.name}
          </h3>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "10px" }}>
            {selectedNode.roles.join(" · ")}
          </div>

          {/* Volume pills */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "12px", flexWrap: "wrap" }}>
            {selectedNode.volumes.map((v) => (
              <span
                key={v}
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: VOLUME_COLORS[v] || "#888",
                  color: "#fff",
                }}
              >
                {v}
              </span>
            ))}
          </div>

          {/* Bio */}
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 14px" }}>
            {selectedNode.bio}
          </p>

          {/* Family connections */}
          {Object.keys(selectedNode.family).length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                Connections
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {Object.entries(selectedNode.family).map(([rel, names]) => {
                  const nameList = Array.isArray(names) ? names : [names];
                  return nameList.map((name) => {
                    if (name === "unnamed" || name === "unknown") return null;
                    const linked = characters.find((c) =>
                      c.name.toLowerCase() === name.toLowerCase() ||
                      c.aliases.some((a) => a.toLowerCase() === name.toLowerCase())
                    );
                    return (
                      <button
                        key={`${rel}-${name}`}
                        onClick={() => linked && handleNodeClick({ id: linked.id })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: linked ? "pointer" : "default",
                          fontFamily: "inherit",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.15s",
                          opacity: linked ? 1 : 0.5,
                        }}
                      >
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", minWidth: "60px", textTransform: "capitalize" }}>
                          {rel}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: linked ? "var(--text)" : "var(--text-muted)" }}>
                          {name}
                        </span>
                        {linked && (
                          <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "var(--accent)" }}>→</span>
                        )}
                      </button>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* View full profile button */}
          <button
            onClick={() => {
              const char = selectedNode;
              onClose();
              setTimeout(() => onSelectCharacter(char), 300);
            }}
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              color: "var(--accent)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            View Full Profile →
          </button>
        </div>
      )}
    </div>
  );
}
