import { LitElement, html, TemplateResult } from '../../src/lit-element.js';
import { customElement, property, attribute, computed, listen } from '../../src/lit-element-decorators.js';

@customElement('test-element')
export class TestElement extends LitElement {
    @property({ computed: 'calcName(firstName, lastName)' })
    name: string;

    @computed<TestElement>('firstName', 'lastName')
    get realName(): string {
      return `${this.firstName} ${this.lastName}`;
    }

    @property() firstName: string = 'John';
    @property() lastName: string = 'Doe';

    @property() stringProp: string = 'Example';
    @property() booleanProp: boolean = true;
    @property() objectProp: any = { fruit: 'pineapple '};
    @property() arrayProp: Array<string> = ['apple'];

    @attribute('string-attr') stringAttr: string;
    @attribute('boolean-attr') booleanAttr: boolean;

    calcName(firstName: string, lastName: string) {
      return `${firstName} ${lastName}`;
    }

    @listen('click', 'button')
    onButtonClicked() {
      this.booleanProp = !this.booleanProp;
    }

    render({ stringProp, booleanProp, objectProp, arrayProp }): TemplateResult {
      const props = TestElement.properties;
      const getType = (name: string): string => props[name].type.name;

      return html`
        RealName: ${this.realName}<br>
        Name: ${this.name}<br>
        <button id="button">Click me!</button>
        <h2>${getType('stringProp')}: ${stringProp}</h2>
        <h2>${getType('booleanProp')}: ${booleanProp}</h2>
        <h2>${getType('objectProp')}: ${JSON.stringify(objectProp)}</h2>
        <h2>${getType('arrayProp')}: ${JSON.stringify(arrayProp)}</h2>
        <h2>${getType('stringAttr')}: '${this.getAttribute('string-attr')}'</h2>
        <h2>${getType('booleanAttr')}: '${this.getAttribute('boolean-attr')}'</h2>
      `;
    }
  }
