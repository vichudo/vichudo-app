import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vitest';

import { noElse } from './plugin';

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run('no-else', noElse, {
  valid: [
    'function f(a) { if (!a) return 1; return 2; }',
    'function f(a) { if (a) { g(); } h(); }',
    'const x = a ? 1 : 2;',
    'switch (a) { case 1: break; default: g(); }',
  ],
  invalid: [
    {
      code: 'if (a) { g(); } else { h(); }',
      errors: [{ messageId: 'noElse' }],
    },
    {
      code: 'let x; if (a) { x = 1; } else if (b) { x = 2; } else { x = 3; }',
      errors: [{ messageId: 'noElse' }, { messageId: 'noElse' }],
    },
    { code: 'if (a) return; else g();', errors: [{ messageId: 'noElse' }] },
  ],
});

const elseIfOnly = [{ elseIfOnly: true }];

new RuleTester().run('no-else (elseIfOnly)', noElse, {
  valid: [{ code: 'if (a) { g(); } else { h(); }', options: elseIfOnly }],
  invalid: [
    {
      code: 'let x; if (a) { x = 1; } else if (b) { x = 2; } else { x = 3; }',
      options: elseIfOnly,
      errors: [{ messageId: 'noElse' }],
    },
  ],
});
