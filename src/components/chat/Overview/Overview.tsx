import { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import Flow from './Flow';
import CustomNode from './Node';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp?: number;
  parentId?: string | null;
  error?: any;
}

interface OverviewProps {
  messages: Message[];
  onMessageClick?: (messageId: string) => void;
  className?: string;
}

export default function Overview({ messages, onMessageClick, className = '' }: OverviewProps) {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const messageMap = new Map<string, number>();

    // Create nodes for each message
    messages.forEach((message, index) => {
      messageMap.set(message.id, index);
      
      nodes.push({
        id: message.id,
        type: 'custom',
        position: { x: 0, y: index * 200 }, // Vertical layout
        data: {
          role: message.role,
          content: message.content,
          model: message.model,
          error: !!message.error,
          timestamp: message.timestamp,
        },
      });

      // Create edge from parent if exists
      if (message.parentId && messageMap.has(message.parentId)) {
        edges.push({
          id: `e-${message.parentId}-${message.id}`,
          source: message.parentId,
          target: message.id,
          type: 'smoothstep',
          animated: false,
        });
      }
    });

    // Adjust positions for better layout
    // This is a simple vertical layout; you could implement more sophisticated layouts
    const xOffset = 250;
    const yOffset = 200;
    
    // Group messages by their depth in the conversation tree
    const depths = new Map<string, number>();
    const calculateDepth = (messageId: string): number => {
      if (depths.has(messageId)) {
        return depths.get(messageId)!;
      }
      
      const message = messages.find((m) => m.id === messageId);
      if (!message || !message.parentId) {
        depths.set(messageId, 0);
        return 0;
      }
      
      const depth = calculateDepth(message.parentId) + 1;
      depths.set(messageId, depth);
      return depth;
    };

    messages.forEach((message) => {
      calculateDepth(message.id);
    });

    // Update node positions based on depth
    nodes.forEach((node, index) => {
      const depth = depths.get(node.id) || 0;
      node.position = {
        x: depth * xOffset,
        y: index * yOffset,
      };
    });

    return { nodes, edges };
  }, [messages]);

  const handleNodeClick = (node: Node) => {
    onMessageClick?.(node.id);
  };

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Flow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}

