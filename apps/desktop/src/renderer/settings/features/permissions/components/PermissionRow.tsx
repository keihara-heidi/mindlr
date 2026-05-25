import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleCheck, ExternalLink } from 'lucide-react';
import type { PermissionStatus } from '@mindlr/ipc-contracts';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { TypographyMuted, TypographySmall } from '@shared/components/typography';
import { useMutationOpenSystemSettings } from '@settings/features/permissions/hooks/useMutationOpenSystemSettings';

interface Props {
  kind: 'microphone' | 'accessibility';
  label: string;
  description: string;
  Icon: LucideIcon;
  status: PermissionStatus;
}

export function PermissionRow({ kind, label, description, Icon, status }: Props) {
  const open = useMutationOpenSystemSettings();
  const granted = status === 'authorized';
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TypographySmall>{label}</TypographySmall>
            {granted ? (
              <Badge variant="secondary">
                <CircleCheck className="size-3" />
                Granted
              </Badge>
            ) : (
              <Badge variant="destructive">
                <CircleAlert className="size-3" />
                {status === 'denied' ? 'Denied' : 'Not granted'}
              </Badge>
            )}
          </div>
          <TypographyMuted>{description}</TypographyMuted>
        </div>
      </div>
      {!granted ? (
        <Button variant="outline" onClick={() => open.mutate(kind)}>
          <ExternalLink className="size-4" />
          Open Settings
        </Button>
      ) : null}
    </div>
  );
}
