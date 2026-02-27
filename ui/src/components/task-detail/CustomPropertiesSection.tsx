import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { useCardCustomProperties } from '@/hooks/useKaitenQuery';
import type { CustomPropertySelectValue } from '@/api/types';

// Kaiten uses indexed colors (0-23)
const KAITEN_COLORS: string[] = [
  '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
  '#319795', '#3182CE', '#805AD5', '#D53F8C',
  '#718096', '#2D3748', '#FC8181', '#F6AD55',
  '#F6E05E', '#68D391', '#4FD1C5', '#63B3ED',
  '#B794F4', '#F687B3', '#A0AEC0', '#E2E8F0',
  '#9C4221', '#276749', '#2C7A7B', '#2B6CB0',
];

function getKaitenColor(index: number | null): string | undefined {
  if (index === null || index < 0) return undefined;
  return KAITEN_COLORS[index % KAITEN_COLORS.length];
}

interface CustomPropertiesSectionProps {
  properties: Record<string, number[]>;
}

export function CustomPropertiesSection({ properties }: CustomPropertiesSectionProps) {
  const { data, isLoading } = useCardCustomProperties(properties);

  if (Object.keys(properties).length === 0) return null;
  if (isLoading && data.length === 0) return null;
  if (data.length === 0) return null;

  return (
    <Stack spacing="1.5">
      {data.map(({ property, selectedValueIds, selectValues }) => (
        <Stack key={property.id} direction="row" align="start" spacing="2" className="text-sm">
          <Text variant="dimmed" className="shrink-0 w-24 pt-0.5 truncate" title={property.name}>
            {property.name}
          </Text>
          <Stack direction="row" wrap="wrap" spacing="1" className="flex-1">
            {property.type === 'select' ? (
              selectValues
                ? resolveSelectValues(selectedValueIds, selectValues, property.colorful)
                : selectedValueIds.map((id) => (
                    <Badge key={id} variant="outline" size="xs" className="font-normal">
                      {id}
                    </Badge>
                  ))
            ) : (
              selectedValueIds.map((v) => (
                <Badge key={v} variant="outline" size="xs" className="font-normal">
                  {v}
                </Badge>
              ))
            )}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function resolveSelectValues(
  selectedIds: number[],
  allValues: CustomPropertySelectValue[],
  colorful: boolean,
) {
  return selectedIds.map((id) => {
    const val = allValues.find((v) => v.id === id);
    if (!val) return null;
    const color = colorful ? getKaitenColor(val.color) : undefined;
    return (
      <Badge
        key={id}
        variant="outline"
        size="xs"
        className="font-normal"
        style={color ? { borderColor: color, color } : undefined}
      >
        {val.value}
      </Badge>
    );
  });
}
