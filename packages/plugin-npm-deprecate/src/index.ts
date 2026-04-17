import { Plugin } from '@yarnpkg/core';
import deprecate from './commands/deprecate';

const plugin: Plugin = {
  commands: [deprecate],
};

export default plugin;
