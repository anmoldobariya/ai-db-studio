import { Dialog, DialogContent } from '@renderer/components/ui/dialog';
import { ERDVisualization } from './ERDVisualization';
import { RelationSchema } from '@renderer/types';

interface SchemaVisualizationProps {
  schemaData: RelationSchema[];
  showERD: boolean;
  setShowERD: (value: boolean) => void;
}

const SchemaVisualization = ({ schemaData, showERD, setShowERD }: SchemaVisualizationProps) => {
  return (
    <Dialog open={showERD} onOpenChange={setShowERD}>
      <DialogContent className="sm:max-w-[1600px]">
        <ERDVisualization schemaData={schemaData} />
      </DialogContent>
    </Dialog>
  );
};

export default SchemaVisualization;
