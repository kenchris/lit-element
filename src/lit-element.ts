import { html, render } from '../node_modules/lit-html/lib/lit-extended.js';
import { TemplateResult } from '../node_modules/lit-html/lit-html.js';

export { html } from '../node_modules/lit-html/lib/lit-extended.js';

export interface PropertyDeclaration {
  type: (a: any) => any;
  value?: any;
  attrName?: string;
  computed: string;
}

interface PropertyValues {
  [key: string]: any;
}

interface ElementCache {
  [key: string]: any; // HTMLElement
}

export class LitElement extends HTMLElement {
  private _needsRender: boolean = false;
  private _lookupCache: ElementCache = [];
  private _values: PropertyValues = [];
  private _attrMap: any = {};
  private _deps: any = {};
  private _resolved: boolean = false;

  _setPropertyValue(propertyName: string, newValue: any) {
    this._values[propertyName] = newValue;
    if (this._deps[propertyName]) {
      this._deps[propertyName].map((fn: Function) => fn());
    }
  }

  _setPropertyValueFromAttributeValue(attrName: string, newValue: any) {
    const propertyName = this._attrMap[attrName];
    const { type: typeFn } = (this.constructor as any).properties[propertyName];

    let value;
    if (typeFn.name === 'Boolean') {
      value = (newValue === '') || (!!newValue && newValue === attrName.toLowerCase());
    } else {
      value = (newValue !== null) ? typeFn(newValue) : null;
    }
    this._setPropertyValue(propertyName, value);
  }

  static get properties(): PropertyDeclaration[] {
    return [];
  }

  static get observedAttributes(): string[] {
    return Object.keys(this.properties)
      .map(key => (<any>this.properties)[key].attrName)
      .filter(name => name);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    for (const propertyName in (this.constructor as any).properties) {
      const { value, attrName, computed } = (this.constructor as any).properties[propertyName];
      // We can only handle properly defined attributes.
      if (typeof(attrName) === 'string' && attrName.length) {
        this._attrMap[attrName] = propertyName;
      }
      // Properties backed by attributes have default values set from attributes, not 'value'.
      if (!attrName && value !== undefined) {
        (<any>this)[propertyName] = value;
      }
      // Only property defined 'computes' are handled of form 'firstName(name, surname)',
      // with at least one dependency argument.
      const match = /(\w+)\((.+)\)/.exec(computed);
      if (!attrName && match) {
        const fnName = match[1];
        const argNames = match[2].split(/,\s*/);

        const boundFn = () => (<any>this)[propertyName] = (<any>this)[fnName].apply(this, argNames.map(argName => (<any>this)[argName]));

        let hasAtLeastOneValue = false;
        for (const argName of argNames) {
          hasAtLeastOneValue = hasAtLeastOneValue || (<any>this)[argName] !== undefined;
          if (!this._deps[argName]) {
            this._deps[argName] = [ boundFn ];
          } else {
            this._deps[argName].push(boundFn);
          }
        }
        if (hasAtLeastOneValue) {
          boundFn();
        }
      }
    }
  }

  static withProperties() {
    for (const propertyName in this.properties) {
      const { type: typeFn, attrName } = this.properties[propertyName];

      Object.defineProperty(this.prototype, propertyName, {
        get(this: LitElement) { return this._values[propertyName]; },
        set(this: LitElement, v) {
          const value = typeFn === Array ? v : typeFn(v);
          this._setPropertyValue(propertyName, value);

          if (attrName) {
            if (typeFn.name === 'Boolean') {
              if (!value) {
                this.removeAttribute(attrName);
              } else {
                this.setAttribute(attrName, attrName);
              }
            } else {
              this.setAttribute(attrName, value);
            }
          }
          this.invalidate();
        },
      });
    }

    return this;
  }

  renderCallback() {
    if (this._resolved) {
      render(this.render(this), this.shadowRoot as ShadowRoot);
    } else {
      const template = this.render(this).template;
      const rootNode = template.element.content;
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT, null as any, false);

      const deps = new Set();
      while (walker.nextNode()) {
        const element = walker.currentNode as Element;
        if (element.tagName.includes('-')) {
          deps.add(element.tagName.toLowerCase());
        }
      }

      Promise.all(Array.from(deps)
        .map(tagName => customElements.whenDefined(tagName)))
        .then(() => {
          this._resolved = true;
          this.renderCallback();
        });
    }
  }

  // @ts-ignore
  render(self: any): TemplateResult {
    return html``;
  }

  attributeChangedCallback(attrName: string, _oldValue: string, newValue: string) {
    this._setPropertyValueFromAttributeValue(attrName, newValue);
    this.invalidate();
  }

  connectedCallback() {
    for (const attrName of (this.constructor as any).observedAttributes) {
      this._setPropertyValueFromAttributeValue(attrName, this.getAttribute(attrName));
    }

    this.invalidate();
  }

  async invalidate() {
    if (!this._needsRender) {
      this._needsRender = true;
      // Schedule the following as micro task, which runs before
      // requestAnimationFrame. All additional invalidate() calls
      // before will be ignored.
      // https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
      this._needsRender = await false;
      this.renderCallback();
    }
  }

  $(id: string) {
    let value = this._lookupCache[id];
    if (!value && this.shadowRoot) {
      const element = this.shadowRoot.getElementById(id);
      if (element) {
        value = element;
        this._lookupCache[id] = element;
      }
    }
    return value;
  }
}