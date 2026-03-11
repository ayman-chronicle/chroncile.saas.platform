import type {
  GraphEditPreview,
  SandboxEdgeDto,
  SandboxNodeData as SandboxNodeDataDto,
  SandboxNodeDto,
} from "shared/generated";

import type {
  SandboxEdge,
  SandboxNode,
  SandboxNodeData,
} from "@/components/sandbox/types";

export function toSandboxNodeDto(node: SandboxNode): SandboxNodeDto {
  return {
    id: node.id,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    data: node.data as SandboxNodeDataDto,
  };
}

export function toSandboxEdgeDto(edge: SandboxEdge): SandboxEdgeDto {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  };
}

export function fromSandboxNodeDto(node: SandboxNodeDto): SandboxNode {
  return {
    id: node.id,
    type: node.data.nodeType,
    position: node.position,
    data: node.data as SandboxNodeData,
  };
}

export function fromSandboxEdgeDto(edge: SandboxEdgeDto): SandboxEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "animated",
  };
}

export function graphFromPreview(preview: GraphEditPreview): {
  nodes: SandboxNode[];
  edges: SandboxEdge[];
} {
  return {
    nodes: preview.nodes.map(fromSandboxNodeDto),
    edges: preview.edges.map(fromSandboxEdgeDto),
  };
}
