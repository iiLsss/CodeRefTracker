import * as file from './files';

export {
  file
};


export type TreeNode = {
  name: string;
  path: string;
  children?: TreeNode[];
};
