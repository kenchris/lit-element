import { html, render } from '/node_modules/lit-html/lib/lit-extended.js';
import { TemplateResult } from '/node_modules/lit-html/lit-html.js';

export { html } from '/node_modules/lit-html/lib/lit-extended.js';

export interface PropertyDeclaration {
  type: Boolean | Number | String | Function;
  value?: any;
  attrName?: string
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

  static get properties(): PropertyDeclaration[] {
    return [];
  }

  static get observedAttributes(): string[] {
    let attrs = [];
    for (const prop in this.properties) {
      if (this.properties[prop].attrName) {
        attrs.push(prop);
      }
    }
    return attrs;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static withProperties() {
    for (const prop in this.properties) {
      const { type: typeFn, value, attrName } = this.properties[prop];

      Object.defineProperty(this.prototype, prop, {
        get() { return this._values[prop] || value; },
        set(v) {
          let value = typeFn(v)
          this._values[prop] = value;
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

  renderCallback(): TemplateResult {
    return html``;
  }
  
  attributeChangedCallback(prop: string, _oldValue: string, newValue: string) {
    const { type: typeFn } = this.constructor.properties[prop];

    if (typeFn.name === 'Boolean') {
      this._values[prop] = !newValue || (newValue === prop);
    } else {
      this._values[prop] = typeFn(newValue)
    }

    this.invalidate();
  }

  connectedCallback() {
    // FIXME: Should we force render here?
    this.invalidate();
  }

  invalidate() {
    if (!this._needsRender) {
      this._needsRender = true;
      Promise.resolve().then(() => {
        this._needsRender = false;
        render(this.renderCallback(), this.shadowRoot);
      });
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
};