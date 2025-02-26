export interface TreeNode {
  path: string;
  name: string;
  type: string;
  children?: TreeNode[];
}