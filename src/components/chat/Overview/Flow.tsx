import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@/components/ui/theme-provider';

interface FlowProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  onNodeClick?: (node: Node) => void;
  className?: string;
}

export default function Flow({
  nodes: initialNodes,
  edges: initialEdges,
  nodeTypes,
  onNodeClick,
  className = '',
}: FlowProps) {
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Determine color mode based on theme
  const colorMode = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.001}
        nodesConnectable={false}
        nodesDraggable={false}
        colorMode={colorMode}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
}

