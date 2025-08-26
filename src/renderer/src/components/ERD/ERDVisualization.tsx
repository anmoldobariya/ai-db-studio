import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ERDTableNode } from './ERDTableNode';

const nodeTypes = {
  erdTable: ERDTableNode
};

export const ERDVisualization = ({ schemaData }) => {
  // Convert schema data to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create nodes for each table
    schemaData.forEach((table, index) => {
      // Calculate position in a more organized layout
      const cols = Math.ceil(Math.sqrt(schemaData.length));
      const col = index % cols;
      const row = Math.floor(index / cols);

      nodes.push({
        id: table.name,
        type: 'erdTable',
        position: {
          x: col * 350 + 50,
          y: row * 300 + 50
        },
        data: { table }
      });
    });

    // Create edges for relationships
    schemaData.forEach((table) => {
      table.relationships.forEach((rel, relIndex) => {
        const edgeId = `${table.name}-${rel.column}-${rel.references.table}-${relIndex}`;
        edges.push({
          id: edgeId,
          source: table.name,
          target: rel.references.table,
          label: `${rel.column} → ${rel.references.column}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#8b5cf6',
            strokeWidth: 2
          },
          labelStyle: {
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#6b21a8'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8b5cf6'
          }
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, []);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(() => {
    // Prevent manual connections in ERD
  }, []);

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden p-0">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <h2 className="text-xl font-semibold text-white">Entity Relationship Diagram</h2>
        <p className="text-purple-100 text-sm mt-1">
          {schemaData.length} entities • {initialEdges.length} relationships
        </p>
      </div>

      <div style={{ height: '75vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          style={{ backgroundColor: '#f8fafc' }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
          <MiniMap
            nodeColor="#a993ec"
            maskColor="rgba(0, 0, 0, 0.1)"
            style={{
              backgroundColor: '#f1f5f9'
            }}
          />
        </ReactFlow>
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Entity</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-primary"></div>
              <span>Relationship</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>Foreign Key</span>
            </div>
          </div>
          <div>Drag to pan • Scroll to zoom • Use controls for better navigation</div>
        </div>
      </div>
    </div>
  );
};
