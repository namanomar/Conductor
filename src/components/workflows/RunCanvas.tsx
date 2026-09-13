"use client";

import { ReactFlow, Background, BackgroundVariant, Controls, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes, type WorkflowNode } from "./nodes";

export function RunCanvas({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: WorkflowNode[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
}) {
  return (
    <ReactFlow<WorkflowNode>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onNodeClick(node.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      fitView
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
      defaultEdgeOptions={{ style: { stroke: "var(--accent-2)", strokeWidth: 1.6 } }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
      <Controls className="!border !border-border !bg-surface [&_button]:!border-border-soft [&_button]:!bg-surface-2 [&_button]:!fill-foreground" />
    </ReactFlow>
  );
}
