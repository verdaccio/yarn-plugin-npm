import { Plugin } from '@yarnpkg/core';
import unpublish from './commands/unpublish';

const plugin: Plugin = {
  commands: [unpublish],
};

export default plugin;
