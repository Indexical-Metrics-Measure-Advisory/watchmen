export type RechartsModule = typeof import('recharts');
export type ChartDatumValue = string | number | null | undefined;
export type ChartDatum = Record<string, ChartDatumValue>;

export type TooltipEntry = {
  color?: string;
  name?: string;
  value?: ChartDatumValue;
};

export type TooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: React.ReactNode;
};
