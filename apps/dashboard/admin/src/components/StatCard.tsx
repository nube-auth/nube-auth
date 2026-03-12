import {
  Card,
  CardBody,
  IconBox,
  Heading,
  Text,
  Chip,
  Icon,
  type IconType,
} from '@nube-auth/components';

export interface StatCardProps {
  icon: typeof IconType[keyof typeof IconType];
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
  subtitle?: string;
}

export function StatCard({
  icon,
  title,
  value,
  change,
  changeType,
  subtitle = 'Compared to last month',
}: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <IconBox size="lg" variant="info-subtle" className="mb-4">
          <Icon icon={icon} />
        </IconBox>
        <Heading size="sm" className="font-medium text-gray-600 dark:text-gray-400">
          {title}
        </Heading>
        <Text className="text-4xl font-semibold mt-2">{value}</Text>
        {change && changeType && (
          <div className="flex items-center gap-2 mt-2">
            <Chip
              variant={changeType === 'increase' ? 'success' : 'danger'}
              size="sm"
            >
              {changeType === 'increase' ? '↑' : '↓'} {change}
            </Chip>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </Text>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
