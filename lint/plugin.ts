// Local oxlint rules, loaded through `jsPlugins` in `.oxlintrc.json`.
import type { RuleTester } from 'oxlint/plugins-dev';

type Rule = Parameters<RuleTester['run']>[1];

// `if` / `else` is the last resort for branching. Every `else` and
// `else if` is flagged; where both sides are genuinely needed, disable the rule
// on that line with a reason. `{ "elseIfOnly": true }` flags only `else if`,
// leaving a plain two-way `else` alone.
export const noElse: Rule = {
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: { elseIfOnly: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      noElse:
        'Avoid `else`: return early, return each case from a helper, use a lookup or exhaustive `switch`, or a ternary / `??` for a single value.',
    },
  },
  create: (context) => {
    const [options] = context.options;
    const elseIfOnly =
      typeof options === 'object' &&
      options !== null &&
      !Array.isArray(options) &&
      options.elseIfOnly === true;
    const selector = elseIfOnly
      ? 'IfStatement > IfStatement.alternate'
      : 'IfStatement > .alternate';
    return {
      [selector]: (node) => {
        context.report({ node, messageId: 'noElse' });
      },
    };
  },
};

const plugin = {
  meta: { name: 'local' },
  rules: { 'no-else': noElse },
};

export default plugin;
