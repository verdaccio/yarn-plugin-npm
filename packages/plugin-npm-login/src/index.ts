import { Plugin } from '@yarnpkg/core';
import login from './commands/login';

const plugin: Plugin = {
  commands: [login],
};

export default plugin;
