import type { Meta, StoryObj } from '@storybook/react-vite';
import { stageLabel } from '@/logic/stages.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const students = [
  { name: 'Ada Lovelace', stage: 'S01A1' },
  { name: 'Alan Turing', stage: 'S02DS' },
  { name: 'Grace Hopper', stage: 'S03ML' },
];

const header = (
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Stage</TableHead>
    </TableRow>
  </TableHeader>
);

const meta = {
  component: Table,
  args: {},
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => (
    <Table {...args}>
      {header}
      <TableBody>
        {students.map(student => (
          <TableRow key={student.name}>
            <TableCell>{student.name}</TableCell>
            <TableCell>{stageLabel(student.stage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: args => (
    <Table {...args}>
      {header}
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="text-center text-muted-foreground">
            No students yet.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
