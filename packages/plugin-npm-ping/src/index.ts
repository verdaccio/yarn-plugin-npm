import { Plugin } from '@yarnpkg/core';
import ping from './commands/ping';
import unpublish from './commands/unpublish';

const plugin: Plugin = {
  commands: [ping, unpublish],
};

export default plugin;
