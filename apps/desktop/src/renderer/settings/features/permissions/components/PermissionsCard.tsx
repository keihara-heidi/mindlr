import { Accessibility, Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { TypographyMuted } from '@shared/components/typography';
import { Separator } from '@shared/components/ui/separator';
import { useQueryPermissions } from '@settings/features/permissions/hooks/useQueryPermissions';
import { PermissionRow } from '@settings/features/permissions/components/PermissionRow';

/**
 * Renders at the top of the General page when either permission is missing.
 * Auto-hides when both are granted (polled every 2 s — macOS doesn't
 * broadcast permission changes).
 */
export function PermissionsCard() {
  const { data } = useQueryPermissions();
  if (!data) return null;
  const allGranted = data.microphone === 'authorized' && data.accessibility === 'authorized';
  if (allGranted) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grant permissions to dictate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TypographyMuted>
          Mindlr needs two macOS permissions to record audio and insert text into
          your focused app.
        </TypographyMuted>
        <PermissionRow
          kind="microphone"
          label="Microphone"
          description="Capture the audio you dictate."
          Icon={Mic}
          status={data.microphone}
        />
        <Separator />
        <PermissionRow
          kind="accessibility"
          label="Accessibility"
          description="Receive global hotkey events and paste the final transcript."
          Icon={Accessibility}
          status={data.accessibility}
        />
      </CardContent>
    </Card>
  );
}
