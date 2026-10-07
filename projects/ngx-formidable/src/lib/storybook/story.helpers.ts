import { argsToTemplate, moduleMetadata, type StoryContext } from '@storybook/angular-vite';
import { FieldDecorator } from '../components/field-decorator/field-decorator';
import { FieldLabel } from '../directives/field-label';
import { FormidableOption } from '../models/formidable.model';

/** What `decorated()`'s template uses besides the story's own component. */
export const decoratedImports = moduleMetadata({ imports: [FieldDecorator, FieldLabel] });

/**
 * Renders the field `selector`, bound to the story's args, inside a decorator under `label`, the way a consumer
 * uses it. `content` is projected into the field.
 */
export function decorated(selector: string, label: string, content = '') {
  return (args: object) => ({
    props: args,
    template: `
      <formidable-field-decorator>
        <${selector} ${argsToTemplate(args)}>${content}</${selector}>
        <div formidableFieldLabel>${label}</div>
      </formidable-field-decorator>`
  });
}

/**
 * Opens a panel field's panel the way a keyboard user does: `Tab` into the story's first field, then `keys`.
 * `type` is typed into the field first, as an autocomplete's filter.
 */
export function openPanel(keys = '{ArrowDown}', type = '') {
  return async ({ userEvent }: StoryContext) => {
    await userEvent.tab();
    if (type) await userEvent.keyboard(type);
    if (keys) await userEvent.keyboard(keys);
  };
}

/** Docs-page rendering for a story whose open panel overflows the inline story's height. */
export const framed = { docs: { story: { inline: false, height: '360px' } } };

export const mockColourOptions: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'violet', label: 'Violet' }
];

export const mockRequiredError = [{ kind: 'required', message: 'Required' }];
