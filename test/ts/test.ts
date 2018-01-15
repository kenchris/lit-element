import {
  LitElement,
  html,
  TemplateResult,
  customElement
} from '../../src/lit-element.js';

@customElement('test-element')
export class TestElement extends LitElement {
    static get properties() {
      return {
        stringProp: {
          type: String,
          value: "Example",
        },
        booleanProp: {
          type: Boolean,
          value: true,
        },
        stringAttr: {
          type: String,
          value: "Example",
          attrName: "string-attr"
        },
        booleanAttr: {
          type: Boolean,
          value: true,
          attrName: "boolean-attr"
        },
        objectProp: {
          type: Object,
          value: { fruit: 'pineapple' }
        },
        arrayProp: {
          type: Array,
          value: ['apple']
        }
      }
    }

    render({ stringProp, booleanProp, objectProp, arrayProp }): TemplateResult {
      return html`
        <h2>String: ${stringProp}</h2>
        <h2>Boolean: ${booleanProp}</h2>
        <h2>Object: ${JSON.stringify(objectProp)}</h2>
        <h2>Array: ${JSON.stringify(arrayProp)}</h2>
      `;
    }
  }
  TestElement.withProperties();