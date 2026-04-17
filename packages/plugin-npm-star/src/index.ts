import { Plugin } from '@yarnpkg/core';
import star from './commands/star';
import unstar from './commands/unstar';

const plugin: Plugin = {
  commands: [star, unstar],
};

export default plugin;
