"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes, type WorkflowNode } from "./nodes";
import type { PaletteItem } from "@/lib/workflow-templates";

let idCounter = 1;

export function Canvas({
  initialNodes,
  initialEdges,
  onGraphChange,
  onNodeClick,
}: {
  initialNodes: WorkflowNode[];
  initialEdges: Edge[];
  onGraphChange?: (nodes: WorkflowNode[], edges: Edge[]) => void;
  onNodeClick?: (node: WorkflowNode) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    onGraphChange?.(nodes, edges);
  }, [nodes, edges, onGraphChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/conductor-node");
      if (!raw) return;
      const item: PaletteItem = JSON.parse(raw);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: `${item.kind}-${idCounter++}`,
        type: "workflowNode",
        position,
        data: {
          label: item.label,
          sub: item.sub,
          kind: item.kind,
          icon: item.icon,
          sourceId: item.sourceId,
          toolName: item.toolName,
          capability: item.capability,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow<WorkflowNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{ style: { stroke: "var(--accent-2)", strokeWidth: 1.6 } }}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls className="!border !border-border !bg-surface [&_button]:!border-border-soft [&_button]:!bg-surface-2 [&_button]:!fill-foreground" />
        <MiniMap
          pannable
          zoomable
          className="!border !border-border !bg-surface"
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
