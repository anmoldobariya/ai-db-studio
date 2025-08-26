import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';

interface EncryptionFormProps {
  encryptionKey: string;
  setEncryptionKey: React.Dispatch<React.SetStateAction<string>>;
  encryptionForm: boolean;
  setEncryptionForm: React.Dispatch<React.SetStateAction<boolean>>;
  handleEncryption: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

const EncryptionForm = ({
  encryptionKey,
  setEncryptionKey,
  encryptionForm,
  setEncryptionForm,
  handleEncryption,
  isLoading
}: EncryptionFormProps) => {
  return (
    <Dialog open={encryptionForm} onOpenChange={setEncryptionForm}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Encryption</DialogTitle>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={handleEncryption}>
          <div className="space-y-2">
            <Label htmlFor="encryptionKey">Encryption Key *</Label>
            <Input
              id="encryptionKey"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              type="password"
              placeholder="Enter encryption key"
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={() => setEncryptionForm(false)}
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              Ok
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EncryptionForm;
