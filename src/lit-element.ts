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
    for (const prop in (this.constructor as any).properties) {
      let { value, attrName, computed } = (this.constructor as any).properties[prop];
      if (attrName) {
        this._attrMap[attrName] = prop;
        const initialValue = this.getAttribute(attrName);
        if (initialValue) {
          value = initialValue;
        }
      }
      if (value !== undefined) {
        (<any>this)[prop] = value;
      }
      const match = /(\w+)\((.+)\)/.exec(computed);
      if (match) {
        const fnName = match[1];
        const argNames = match[2].split(/,\s*/);

        const boundFn = () => (<any>this)[prop] = (<any>this)[fnName].call(this, argNames.map(propName => (<any>this)[propName]));

        let hasAtLeastOneValue = false;
        for (const propName of argNames) {
          hasAtLeastOneValue = hasAtLeastOneValue || (<any>this)[propName] !== undefined;
          if (!this._deps[propName]) {
            this._deps[propName] = [ boundFn ];
          } else {
            this._deps[propName].push(boundFn);
          }
        }
        if (hasAtLeastOneValue) {
          boundFn();
        }
      }
    }
  }

  static withProperties() {
    for (const prop in this.properties) {
      const { type: typeFn, attrName } = this.properties[prop];

      Object.defineProperty(this.prototype, prop, {
        get(this: LitElement) { return this._values[prop]; },
        set(this: LitElement, v) {
          const value = typeFn === Array ? v : typeFn(v);
          this._values[prop] = value;

          if (this._deps[prop]) {
            this._deps[prop].map((fn:Function) => fn());
          }

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
      render(this.render(), this.shadowRoot as ShadowRoot);
    } else {
      const template = this.render().template;
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

  render(): TemplateResult {
    return html``;
  }

  attributeChangedCallback(attrName: string, _oldValue: string, newValue: string) {
    const prop = this._attrMap[attrName];
    const { type: typeFn } = (this.constructor as any).properties[prop];

    if (typeFn.name === 'Boolean') {
      this._values[prop] = (newValue === '') || (newValue === attrName);
    } else {
      this._values[prop] = typeFn(newValue);
    }

    this.invalidate();
  }

  connectedCallback() {
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
