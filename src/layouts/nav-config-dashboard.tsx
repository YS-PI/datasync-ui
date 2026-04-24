import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: 'APPROD',
    path: '/approd',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Oracle',
    path: '/oracle',
    icon: icon('ic-user'),
  },
];
